import { useMemo, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  LabelList,
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

interface BarItem {
  barKey: string;
  company: string;
  year: number;
  value: number;
  color: string;
  sector: string;
  isGroupStart: boolean; // first bar of a company group
  isGroupEnd: boolean;   // last bar of a company group
  groupSize: number;
}

interface CompanySummary {
  company: string;
  sector: string;
  avg: number | null;
}

const YoYChangeChart = ({ data }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const baseYear = useMemo(
    () => Math.min(...data.map((d) => d.reporting_year)),
    [data]
  );

  const { chartData, summaries } = useMemo(() => {
    const baselines = new Map<string, number>();
    for (const entry of data) {
      if (entry.reporting_year === baseYear) {
        const total = getTotal(entry);
        if (total !== null) baselines.set(entry.company, total);
      }
    }

    // Group by company
    const changeMap = new Map<string, { year: number; pct: number; sector: string; color: string }[]>();

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
      list.push({ year: entry.reporting_year, pct, sector, color: cfg.colorDark });
      changeMap.set(entry.company, list);
    }

    // Compute summaries sorted best→worst
    const sums: CompanySummary[] = [];
    for (const [company, items] of changeMap) {
      const vals = items.map((i) => i.pct);
      const avg = vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : null;
      sums.push({ company, sector: items[0].sector, avg });
    }
    sums.sort((a, b) => (a.avg ?? Infinity) - (b.avg ?? Infinity));

    // Build flat bar array with group metadata + spacers
    const bars: BarItem[] = [];
    sums.forEach((s) => {
      const items = (changeMap.get(s.company) ?? []).sort((a, b) => a.year - b.year);
      items.forEach((item, idx) => {
        bars.push({
          barKey: `${s.company}|${item.year}`,
          company: s.company,
          year: item.year,
          value: item.pct,
          color: item.color,
          sector: item.sector,
          isGroupStart: idx === 0,
          isGroupEnd: idx === items.length - 1,
          groupSize: items.length,
        });
      });
    });

    return { chartData: bars, summaries: sums };
  }, [data, baseYear]);

  // Compute min chart width: ~80px per bar + 40px extra gap between groups
  const numGroups = summaries.length;
  const minWidth = Math.max(600, chartData.length * 70 + numGroups * 40);

  // Custom label renderer above bars
  const renderBarLabel = (props: any) => {
    const { x, y, width, value, index } = props;
    const item = chartData[index];
    if (!item) return null;
    const isNeg = value < 0;
    // Place label above bar top (for positive) or above bar end near 0 (for negative)
    const labelY = isNeg ? y - 4 : y - 4;
    return (
      <text
        x={x + width / 2}
        y={labelY}
        textAnchor="middle"
        fontSize={10}
        fill="hsl(var(--muted-foreground))"
      >
        {item.year}
      </text>
    );
  };

  // Company name labels rendered as custom reference annotations
  const companyAnnotations = useMemo(() => {
    const groups: { company: string; startIdx: number; endIdx: number }[] = [];
    let cur = "";
    let start = 0;
    chartData.forEach((d, i) => {
      if (d.company !== cur) {
        if (cur) groups.push({ company: cur, startIdx: start, endIdx: i - 1 });
        cur = d.company;
        start = i;
      }
    });
    if (cur) groups.push({ company: cur, startIdx: start, endIdx: chartData.length - 1 });
    return groups;
  }, [chartData]);

  // Find y-domain to position company labels above
  const yMin = Math.min(0, ...chartData.map((d) => d.value));
  const yMax = Math.max(0, ...chartData.map((d) => d.value));
  const yPad = (yMax - yMin) * 0.18;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Relative Emission Change</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6 flex-col lg:flex-row">
          {/* Scrollable chart area */}
          <div className="flex-1 min-w-0">
            <div
              ref={scrollRef}
              className="h-[420px] overflow-x-auto"
            >
              <div style={{ width: minWidth, height: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    barCategoryGap="8%"
                    barGap={1}
                    margin={{ top: 40, right: 20, bottom: 10, left: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="barKey"
                      tick={false}
                      tickLine={false}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      height={10}
                    />
                    <YAxis
                      domain={[yMin - 5, yMax + yPad]}
                      tickFormatter={(v: number) => `${v}%`}
                      tick={{ fontSize: 11 }}
                      label={{
                        value: `Change vs ${baseYear} (%)`,
                        angle: -90,
                        position: "insideLeft",
                        style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
                      }}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as BarItem;
                        return (
                          <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
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
                    {/* Dashed separators between company groups */}
                    {companyAnnotations.slice(1).map((group) => (
                      <ReferenceLine
                        key={`sep-${group.company}`}
                        x={chartData[group.startIdx]?.barKey}
                        stroke="hsl(var(--border))"
                        strokeDasharray="4 4"
                        strokeWidth={1}
                        ifOverflow="extendDomain"
                      />
                    ))}
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      <LabelList content={renderBarLabel} />
                      {chartData.map((entry) => (
                        <Cell key={entry.barKey} fill={entry.color} />
                      ))}
                    </Bar>
                    {/* Company name labels rendered via customized label on reference lines */}
                    {companyAnnotations.map((group) => {
                      const midIdx = Math.floor((group.startIdx + group.endIdx) / 2);
                      const midKey = chartData[midIdx]?.barKey;
                      if (!midKey) return null;
                      return (
                        <ReferenceLine
                          key={`label-${group.company}`}
                          x={midKey}
                          stroke="transparent"
                          ifOverflow="extendDomain"
                          label={{
                            value: group.company,
                            position: "top",
                            fontSize: 11,
                            fontWeight: 600,
                            fill: "hsl(var(--foreground))",
                            offset: 22,
                          }}
                        />
                      );
                    })}
                  </BarChart>
                </ResponsiveContainer>
              </div>
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

          {/* Summary table (fixed, no scroll) */}
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
                        <span style={{ color: s.avg < 0 ? "#16a34a" : "#dc2626" }}>
                          {s.avg > 0 ? "+" : ""}{s.avg.toFixed(2)}%
                        </span>
                      ) : "—"}
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
