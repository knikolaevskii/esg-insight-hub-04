import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { SECTOR_CONFIG, getCompanySector } from "@/config/sectors";
import type { EsgEntry } from "@/types/esg";

interface Props {
  data: EsgEntry[];
}

const safeVal = (v: number | null | undefined): number | null =>
  v != null && isFinite(v) ? v : null;

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
  const baseYear = useMemo(
    () => Math.min(...data.map((d) => d.reporting_year)),
    [data]
  );

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
    const years = [...new Set(data.map((d) => d.reporting_year))]
      .sort()
      .filter((y) => y !== baseYear);

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
      const avg = vals.length > 0
        ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100
        : null;
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

  // Build recharts data with spacer entries between company groups
  const chartData = useMemo(() => {
    const result: {
      barKey: string;
      company: string;
      year: number;
      value: number | null;
      color: string;
      sector: string;
      companyIndex: number;
      isSpacer?: boolean;
    }[] = [];

    // Group bars by companyIndex
    const grouped = new Map<number, typeof bars>();
    for (const b of bars) {
      const list = grouped.get(b.companyIndex) ?? [];
      list.push(b);
      grouped.set(b.companyIndex, list);
    }

    const sortedIndices = [...grouped.keys()].sort((a, b) => a - b);
    sortedIndices.forEach((ci, gi) => {
      // Add spacer before each group except the first
      if (gi > 0) {
        result.push({
          barKey: `spacer-${ci}`,
          company: "",
          year: 0,
          value: null,
          color: "transparent",
          sector: "",
          companyIndex: ci,
          isSpacer: true,
        });
      }
      for (const b of grouped.get(ci)!) {
        result.push({
          barKey: b.key,
          company: b.company,
          year: b.year,
          value: b.pctChange,
          color: b.colorDark,
          sector: b.sector,
          companyIndex: b.companyIndex,
        });
      }
    });

    return result;
  }, [bars]);

  // Company group positions for labels and separators
  const companyGroups = useMemo(() => {
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

  // Find spacer keys for reference lines
  const spacerKeys = useMemo(
    () => chartData.filter((d) => d.isSpacer).map((d) => d.barKey),
    [chartData]
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">
          Relative Emission Change
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6 flex-col lg:flex-row">
          {/* Chart */}
          <div className="flex-1 min-w-0">
            <div className="h-[440px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="12%" barGap={2} margin={{ top: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="barKey"
                    tick={(props: any) => {
                      const { x, y, payload } = props;
                      const item = chartData.find((d) => d.barKey === payload.value);
                      if (!item || item.isSpacer) return <text />;

                      const group = companyGroups.find((g) => g.company === item.company);
                      const isFirst =
                        group && chartData[group.startIdx]?.barKey === payload.value;
                      const groupSize = group
                        ? group.endIdx - group.startIdx + 1
                        : 1;
                      // Estimate bar spacing (rough)
                      const barSpacing = 38;

                      return (
                        <g>
                          {/* Year label on top of bar */}
                          <text
                            x={x}
                            y={y - 8}
                            textAnchor="middle"
                            fontSize={10}
                            fill="hsl(var(--muted-foreground))"
                          >
                            {item.year}
                          </text>
                        </g>
                      );
                    }}
                    interval={0}
                    height={10}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  {/* Top axis for company names */}
                  <XAxis
                    dataKey="barKey"
                    orientation="top"
                    xAxisId="top"
                    tick={(props: any) => {
                      const { x, y, payload } = props;
                      const item = chartData.find((d) => d.barKey === payload.value);
                      if (!item || item.isSpacer) return <text />;

                      const group = companyGroups.find((g) => g.company === item.company);
                      const isFirst =
                        group && chartData[group.startIdx]?.barKey === payload.value;

                      if (!isFirst) return <text />;

                      // Count non-spacer bars in this group
                      const barsInGroup = chartData
                        .slice(group!.startIdx, group!.endIdx + 1)
                        .filter((d) => !d.isSpacer).length;
                      const barSpacing = 38;
                      const offset = ((barsInGroup - 1) * barSpacing) / 2;

                      return (
                        <text
                          x={x + offset}
                          y={y + 16}
                          textAnchor="middle"
                          fontSize={11}
                          fontWeight={600}
                          fill="hsl(var(--foreground))"
                        >
                          {item.company}
                        </text>
                      );
                    }}
                    interval={0}
                    height={28}
                    tickLine={false}
                    axisLine={false}
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
                            <span
                              className="font-medium"
                              style={{ color: d.value < 0 ? "#16a34a" : "#dc2626" }}
                            >
                              {d.value > 0 ? "+" : ""}
                              {d.value.toFixed(1)}%
                            </span>
                          </p>
                        </div>
                      );
                    }}
                  />
                  {/* Dashed separator lines at spacer positions */}
                  {spacerKeys.map((key) => (
                    <ReferenceLine
                      key={`sep-${key}`}
                      x={key}
                      stroke="hsl(var(--border))"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                    />
                  ))}
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell key={entry.barKey} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Sector legend */}
            <div className="flex items-center justify-center gap-6 mt-2 text-xs text-muted-foreground flex-wrap">
              {Object.entries(SECTOR_CONFIG).map(([name, cfg]) => (
                <div key={name} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: cfg.colorDark }}
                  />
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
                    <TableCell className="py-2 text-xs font-medium">
                      {s.company}
                    </TableCell>
                    <TableCell className="py-2 text-xs text-muted-foreground">
                      {s.sector}
                    </TableCell>
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
