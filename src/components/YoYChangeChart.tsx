import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, Customized } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { SECTOR_CONFIG, getCompanySector } from "@/config/sectors";
import type { EsgEntry } from "@/types/esg";
import { TrendingDown, TrendingUp } from "lucide-react";

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
    const years = [...new Set(data.map((d) => d.reporting_year))].sort().filter((y) => y !== baseYear);

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

    // Build ordered bar data: for each company, add bars for each year
    const orderedBars: (CompanyYearBar & { companyIndex: number })[] = [];
    sums.forEach((s, ci) => {
      const items = changeMap.get(s.company) ?? [];
      items.sort((a, b) => a.year - b.year);
      for (const item of items) {
        orderedBars.push({ ...item, companyIndex: ci });
      }
    });

    return { bars: orderedBars, summaries: sums };
  }, [data, baseYear]);

  // Build recharts data: one entry per bar
  const chartData = bars.map((b) => ({
    barKey: b.key,
    label: String(b.year),
    company: b.company,
    year: b.year,
    value: b.pctChange,
    color: b.colorDark,
    sector: b.sector,
    companyIndex: b.companyIndex,
  }));

  // Custom tick for x-axis: show year under each bar, company name above groups
  const companyLabels = useMemo(() => {
    const groups: { company: string; startIdx: number; endIdx: number }[] = [];
    let current = "";
    let start = 0;
    chartData.forEach((d, i) => {
      if (d.company !== current) {
        if (current) groups.push({ company: current, startIdx: start, endIdx: i - 1 });
        current = d.company;
        start = i;
      }
    });
    if (current) groups.push({ company: current, startIdx: start, endIdx: chartData.length - 1 });
    return groups;
  }, [chartData]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Relative Emission Change</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6 flex-col lg:flex-row">
          {/* Chart */}
          <div className="flex-1 min-w-0">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="15%" barGap={2} margin={{ top: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="barKey"
                    tick={(props: any) => {
                      const { x, y, payload } = props;
                      const item = chartData.find((d) => d.barKey === payload.value);
                      if (!item) return <text />;

                      return (
                        <text x={x} y={y + 14} textAnchor="middle" fontSize={10} fill="hsl(var(--muted-foreground))">
                          {item.year}
                        </text>
                      );
                    }}
                    interval={0}
                    height={30}
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
                  {/* Company name labels above bars and separator lines */}
                  <Customized
                    component={({ xAxisMap, yAxisMap }: any) => {
                      if (!xAxisMap || !yAxisMap) return null;
                      const xAxis = Object.values(xAxisMap)[0] as any;
                      const yAxis = Object.values(yAxisMap)[0] as any;
                      if (!xAxis?.bandSize || !yAxis) return null;
                      const bandSize = xAxis.bandSize;
                      const y1 = yAxis.y;
                      const y2 = yAxis.y + yAxis.height;

                      return (
                        <g>
                          {/* Company labels above bars */}
                          {companyLabels.map((group) => {
                            const firstBarKey = chartData[group.startIdx]?.barKey;
                            const lastBarKey = chartData[group.endIdx]?.barKey;
                            if (!firstBarKey || !lastBarKey) return null;

                            const firstX = xAxis.scale(firstBarKey);
                            const lastX = xAxis.scale(lastBarKey);
                            if (firstX == null || lastX == null) return null;

                            const centerX = (firstX + lastX) / 2 + bandSize / 2;

                            return (
                              <text
                                key={`label-${group.company}`}
                                x={centerX}
                                y={y1 - 12}
                                textAnchor="middle"
                                fontSize={11}
                                fontWeight={600}
                                fill="hsl(var(--foreground))"
                              >
                                {group.company}
                              </text>
                            );
                          })}

                          {/* Dashed separator lines between company groups */}
                          {companyLabels.slice(1).map((group) => {
                            const prevGroup = companyLabels[companyLabels.indexOf(group) - 1];
                            if (!prevGroup) return null;
                            const lastBarKey = chartData[prevGroup.endIdx]?.barKey;
                            const firstBarKey = chartData[group.startIdx]?.barKey;
                            const lastX = xAxis.scale(lastBarKey);
                            const firstX = xAxis.scale(firstBarKey);
                            if (lastX == null || firstX == null) return null;
                            const xPos = (lastX + bandSize + firstX) / 2;
                            return (
                              <line
                                key={`sep-${group.company}`}
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
                      <Cell key={entry.barKey} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Enhanced sector legend with trend indicators */}
            <div className="flex items-center justify-center gap-6 mt-2 text-xs flex-wrap">
              {Object.entries(SECTOR_CONFIG).map(([name, cfg]) => {
                // Calculate average trend for this sector
                const sectorCompanies = summaries.filter((s) => s.sector === name);
                const sectorAvg =
                  sectorCompanies.length > 0
                    ? sectorCompanies.reduce((sum, s) => sum + (s.avg ?? 0), 0) / sectorCompanies.length
                    : 0;
                const isDecreasing = sectorAvg < 0;

                return (
                  <div key={name} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: cfg.colorDark }} />
                    <span className="text-muted-foreground">{name}</span>
                    {isDecreasing ? (
                      <TrendingDown className="w-3.5 h-3.5 text-green-600" />
                    ) : (
                      <TrendingUp className="w-3.5 h-3.5 text-red-600" />
                    )}
                  </div>
                );
              })}
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
};

export default YoYChangeChart;
