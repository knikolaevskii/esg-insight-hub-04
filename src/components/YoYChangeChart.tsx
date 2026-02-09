import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, Customized } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { SECTOR_CONFIG, getCompanySector } from "@/config/sectors";
import type { EsgEntry } from "@/types/esg";

interface Props {
  data: EsgEntry[];
}

const safeVal = (v: number | null | undefined): number | null => (v != null && isFinite(v) ? v : null);

const getTotal = (entry: EsgEntry): number | null => {
  const s1 = safeVal(entry.scope1?.value);
  const s2 = safeVal(entry.scope2_market?.value);
  if (s1 === null && s2 === null) return null;
  return (s1 ?? 0) + (s2 ?? 0);
};

interface CompanyYearBar {
  key: string; // "Company|Year"
  company: string;
  year: number;
  pctChange: number;
  sector: string;
  colorDark: string;
  colorLight: string;
}

interface CompanySummary {
  company: string;
  sector: string;
  avg: number | null;
}

// Invisible spacer entry used to create gaps between company groups
const SPACER_PREFIX = "__spacer__";

const YoYChangeChart = ({ data }: Props) => {
  const baseYear = useMemo(() => Math.min(...data.map((d) => d.reporting_year)), [data]);

  const { bars, summaries } = useMemo(() => {
    // Build baselines
    const baselines = new Map<string, number>();
    for (const entry of data) {
      if (entry.reporting_year === baseYear) {
        const total = getTotal(entry);
        if (total !== null) baselines.set(entry.company, total);
      }
    }

    // Compute pct change for each company/year pair (excluding base year)
    const changeMap = new Map<string, CompanyYearBar[]>(); // company -> bars

    for (const entry of data) {
      if (entry.reporting_year === baseYear) continue;
      const bl = baselines.get(entry.company);
      if (bl == null || bl === 0) continue;
      const total = getTotal(entry);
      if (total === null) continue;

      const sector = getCompanySector(entry.company);
      if (!sector) continue;
      const cfg = SECTOR_CONFIG[sector];

      const pct = Math.round(((total - bl) / bl) * 1000) / 10;

      const list = changeMap.get(entry.company) ?? [];
      list.push({
        key: `${entry.company}|${entry.reporting_year}`,
        company: entry.company,
        year: entry.reporting_year,
        pctChange: pct,
        sector,
        colorDark: cfg.colorDark,
        colorLight: cfg.colorLight,
      });
      changeMap.set(entry.company, list);
    }

    // Compute averages and sort
    const sums: CompanySummary[] = [];
    for (const [company, items] of changeMap) {
      const vals = items.map((i) => i.pctChange);
      const avg = vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : null;
      sums.push({
        company,
        sector: items[0].sector,
        avg,
      });
    }
    // Sort best (most negative) to worst
    sums.sort((a, b) => (a.avg ?? Infinity) - (b.avg ?? Infinity));

    // Build ordered bar data with spacers between company groups
    const orderedBars: (CompanyYearBar & { companyIndex: number; isSpacer?: boolean })[] = [];
    sums.forEach((s, ci) => {
      // Insert spacer before each group except the first
      if (ci > 0) {
        orderedBars.push({
          key: `${SPACER_PREFIX}${ci}`,
          company: SPACER_PREFIX,
          year: 0,
          pctChange: 0,
          sector: "",
          colorDark: "transparent",
          colorLight: "transparent",
          companyIndex: -1,
          isSpacer: true,
        });
      }
      const items = changeMap.get(s.company) ?? [];
      items.sort((a, b) => a.year - b.year);
      for (const item of items) {
        orderedBars.push({ ...item, companyIndex: ci });
      }
    });

    return { bars: orderedBars, summaries: sums };
  }, [data, baseYear]);

  // Build recharts data: one entry per bar (including spacers)
  const chartData = bars.map((b) => ({
    barKey: b.key,
    label: String(b.year),
    company: b.company,
    year: b.year,
    value: b.isSpacer ? 0 : b.pctChange,
    color: b.colorDark,
    sector: b.sector,
    companyIndex: b.companyIndex,
    isSpacer: b.isSpacer ?? false,
  }));

  // Custom tick for x-axis: show year under each bar, company name above groups
  const companyLabels = useMemo(() => {
    const groups: { company: string; startIdx: number; endIdx: number }[] = [];
    let current = "";
    let start = 0;
    chartData.forEach((d, i) => {
      if (d.isSpacer) return;
      if (d.company !== current) {
        if (current) groups.push({ company: current, startIdx: start, endIdx: i - 1 });
        current = d.company;
        start = i;
      }
    });
    if (current) groups.push({ company: current, startIdx: start, endIdx: chartData.length - 1 });
    return groups;
  }, [chartData]);

  // Calculate minimum chart width based on number of bars
  // Each bar needs ~40px, spacers ~30px, plus padding
  const BAR_WIDTH = 44;
  const MIN_CHART_WIDTH = chartData.length * BAR_WIDTH + 80;
  const CONTAINER_THRESHOLD = 700; // if minWidth exceeds this, we scroll

  const needsScroll = MIN_CHART_WIDTH > CONTAINER_THRESHOLD;
  const chartWidth = needsScroll ? Math.max(MIN_CHART_WIDTH, CONTAINER_THRESHOLD) : "100%";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Relative Emission Change</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6 flex-col lg:flex-row">
          {/* Chart */}
          <div className="flex-1 min-w-0">
            <div className="h-[400px]" style={needsScroll ? { overflowX: "auto", overflowY: "hidden" } : undefined}>
              {needsScroll ? (
                <div style={{ width: chartWidth, height: "100%" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    {renderChart()}
                  </ResponsiveContainer>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {renderChart()}
                </ResponsiveContainer>
              )}
            </div>
            {/* Sector legend */}
            <div className="flex items-center justify-center gap-6 mt-2 text-xs text-muted-foreground flex-wrap">
              {Object.entries(SECTOR_CONFIG).map(([name, cfg]) => (
                <div key={name} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: cfg.colorDark }} />
                  {name}
                </div>
              ))}
            </div>
          </div>

          {/* Summary table */}
          <div className="lg:w-[320px] shrink-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Company</TableHead>
                  <TableHead className="text-xs">Sector</TableHead>
                  <TableHead className="text-xs text-right">Avg Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.map((s) => (
                  <TableRow key={s.company}>
                    <TableCell className="py-2 text-xs font-medium">{s.company}</TableCell>
                    <TableCell className="py-2 text-xs text-muted-foreground">{s.sector}</TableCell>
                    <TableCell className="py-2 text-xs text-right font-mono">
                      {s.avg !== null ? (
                        <span
                          style={{
                            color: s.avg < 0 ? "#16a34a" : "#dc2626",
                          }}
                        >
                          {s.avg > 0 ? "+" : ""}
                          {s.avg.toFixed(2)}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  function renderChart() {
    return (
      <BarChart data={chartData} barCategoryGap="15%" barGap={2}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="barKey"
          tick={(props: any) => {
            const { x, y, payload } = props;
            const item = chartData.find((d) => d.barKey === payload.value);
            if (!item || item.isSpacer) return <text />;

            // Check if this is the first bar of a company group
            const group = companyLabels.find((g) => g.company === item.company);
            const isFirst = group && chartData[group.startIdx]?.barKey === payload.value;

            // Company label: center across the group (accounting for spacers)
            const realBarsInGroup = group
              ? chartData.slice(group.startIdx, group.endIdx + 1).filter((d) => !d.isSpacer)
              : [];
            const groupSize = realBarsInGroup.length;

            return (
              <g>
                <text x={x} y={y + 14} textAnchor="middle" fontSize={10} fill="hsl(var(--muted-foreground))">
                  {item.year}
                </text>
                {isFirst && (
                  <text
                    x={x + ((groupSize - 1) * BAR_WIDTH) / 2}
                    y={y + 28}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={600}
                    fill="hsl(var(--foreground))"
                  >
                    {item.company}
                  </text>
                )}
              </g>
            );
          }}
          interval={0}
          height={50}
          tickLine={false}
          axisLine={{ stroke: "hsl(var(--border))" }}
        />
        <YAxis
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fontSize: 11 }}
          label={{
            value: `Change vs ${baseYear} (%)`,
            angle: -90,
            position: "insideLeft",
            style: {
              fontSize: 11,
              fill: "hsl(var(--muted-foreground))",
            },
          }}
        />
        <Tooltip
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            if (d.isSpacer) return null;
            return (
              <div
                className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md"
                style={{ borderColor: "hsl(var(--border))" }}
              >
                <p className="font-semibold">{d.company}</p>
                <p className="text-muted-foreground">Year: {d.year}</p>
                <p>
                  Change:{" "}
                  <span className="font-medium" style={{ color: d.value < 0 ? "#16a34a" : "#dc2626" }}>
                    {d.value > 0 ? "+" : ""}
                    {d.value.toFixed(1)}%
                  </span>
                </p>
              </div>
            );
          }}
        />
        {/* Dashed separator lines between company groups */}
        <Customized
          component={({ xAxisMap, yAxisMap }: any) => {
            if (!xAxisMap || !yAxisMap) return null;
            const xAxis = Object.values(xAxisMap)[0] as any;
            const yAxis = Object.values(yAxisMap)[0] as any;
            if (!xAxis?.bandSize || !yAxis) return null;
            const bandSize = xAxis.bandSize;
            const y1 = yAxis.y;
            const y2 = yAxis.y + yAxis.height;

            // Draw separator lines at each spacer position
            return (
              <g>
                {chartData.map((d, i) => {
                  if (!d.isSpacer) return null;
                  const spacerX = xAxis.scale(d.barKey);
                  if (spacerX == null) return null;
                  const xPos = spacerX + bandSize / 2;
                  return (
                    <line
                      key={`sep-${i}`}
                      x1={xPos}
                      x2={xPos}
                      y1={y1}
                      y2={y2}
                      stroke="#d1d5db"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                    />
                  );
                })}
              </g>
            );
          }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {chartData.map((entry) => (
            <Cell key={entry.barKey} fill={entry.isSpacer ? "transparent" : entry.color} stroke="none" />
          ))}
        </Bar>
      </BarChart>
    );
  }
};

export default YoYChangeChart;
