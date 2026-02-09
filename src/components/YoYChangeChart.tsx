import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
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
  pctChange: number; // now: YoY vs previous year
  sector: string;
  colorDark: string;
  colorLight: string;
}

interface CompanySummary {
  company: string;
  sector: string;
  avg: number | null; // avg YoY change across available year-pairs
}

const YoYChangeChart = ({ data }: Props) => {
  // Keep baseYear only for labeling; bars are YoY (year vs year-1)
  const baseYear = useMemo(() => Math.min(...data.map((d) => d.reporting_year)), [data]);

  const { bars, summaries } = useMemo(() => {
    // totalsByCompanyYear[company][year] = total emissions
    const totalsByCompanyYear = new Map<string, Map<number, number>>();

    for (const entry of data) {
      const total = getTotal(entry);
      if (total === null) continue;

      const sector = getCompanySector(entry.company);
      if (!sector) continue;

      const byYear = totalsByCompanyYear.get(entry.company) ?? new Map<number, number>();
      byYear.set(entry.reporting_year, total);
      totalsByCompanyYear.set(entry.company, byYear);
    }

    const changeMap = new Map<string, CompanyYearBar[]>(); // company -> bars

    for (const [company, byYear] of totalsByCompanyYear) {
      const sector = getCompanySector(company);
      if (!sector) continue;
      const cfg = SECTOR_CONFIG[sector];

      const yearsSorted = [...byYear.keys()].sort((a, b) => a - b);
      for (let i = 1; i < yearsSorted.length; i++) {
        const yr = yearsSorted[i];
        const prev = yearsSorted[i - 1];

        const curVal = byYear.get(yr);
        const prevVal = byYear.get(prev);

        if (curVal == null || prevVal == null || prevVal === 0) continue;

        const pct = Math.round(((curVal - prevVal) / prevVal) * 1000) / 10;

        const list = changeMap.get(company) ?? [];
        list.push({
          key: `${company}|${yr}`,
          company,
          year: yr,
          pctChange: pct, // YoY change: yr vs (yr-1 available in data)
          sector,
          colorDark: cfg.colorDark,
          colorLight: cfg.colorLight,
        });
        changeMap.set(company, list);
      }
    }

    // averages for table + sorting
    const sums: CompanySummary[] = [];
    for (const [company, items] of changeMap) {
      const yoy2023 = items.find((i) => i.year === 2023)?.pctChange ?? null;
      const avg = yoy2023 !== null ? Math.round(yoy2023 * 100) / 100 : null;

      sums.push({
        company,
        sector: items[0].sector,
        avg,
      });
    }

    // Sort best (most negative) to worst
    sums.sort((a, b) => (a.avg ?? Infinity) - (b.avg ?? Infinity));

    // Ordered bars (not strictly needed for chartData, but kept)
    const orderedBars: (CompanyYearBar & { companyIndex: number })[] = [];
    sums.forEach((s, ci) => {
      const items = changeMap.get(s.company) ?? [];
      items.sort((a, b) => a.year - b.year);
      for (const item of items) orderedBars.push({ ...item, companyIndex: ci });
    });

    return { bars: orderedBars, summaries: sums };
  }, [data]);

  // years shown as bar-series = years that have a previous year (per company),
  // but we keep global list for consistent legend/series.
  const years = useMemo(() => {
    const allYears = [...new Set(data.map((d) => d.reporting_year))].sort((a, b) => a - b);
    // First year has no "previous" baseline, so exclude the earliest overall year
    const minY = allYears[0];
    return allYears.filter((y) => y !== minY);
  }, [data]);

  const chartData = useMemo(() => {
    return summaries.map((s) => {
      const companyBars = bars.filter((b) => b.company === s.company);
      const entry: Record<string, any> = {
        company: s.company,
        sector: s.sector,
        colorDark: companyBars[0]?.colorDark ?? "#888",
      };
      for (const b of companyBars) {
        entry[`y${b.year}`] = b.pctChange; // YoY for that year
      }
      return entry;
    });
  }, [summaries, bars]);

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
                <BarChart data={chartData} barCategoryGap="25%" barGap={1} margin={{ top: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="company"
                    tick={{ fontSize: 11, fontWeight: 600 }}
                    interval={0}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `${v}%`}
                    tick={{ fontSize: 11 }}
                    label={{
                      value: `YoY Change (%)`,
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
                          {payload.map((p: any) => {
                            const yr = Number(String(p.dataKey).replace("y", ""));
                            const val = p.value as number;
                            const prev = yr - 1;
                            return (
                              <p key={p.dataKey}>
                                {yr} vs {prev}:{" "}
                                <span className="font-medium" style={{ color: val < 0 ? "#16a34a" : "#dc2626" }}>
                                  {val > 0 ? "+" : ""}
                                  {val.toFixed(1)}%
                                </span>
                              </p>
                            );
                          })}
                        </div>
                      );
                    }}
                  />
                  {years.map((yr, i) => (
                    <Bar key={yr} dataKey={`y${yr}`} name={String(yr)} radius={[4, 4, 0, 0]}>
                      {chartData.map((entry) => (
                        <Cell key={entry.company} fill={entry.colorDark} fillOpacity={i === 0 ? 1 : 0.6} />
                      ))}
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-2 text-xs text-muted-foreground flex-wrap">
              {years.map((yr, i) => (
                <div key={yr} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#555", opacity: i === 0 ? 1 : 0.6 }} />
                  {yr}
                </div>
              ))}
              <span className="mx-2">|</span>
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
                  <TableHead className="text-xs text-right">Avg Change</TableHead>
                  <TableHead className="text-xs text-center">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.map((s) => (
                  <TableRow key={s.company}>
                    <TableCell className="py-2 text-xs font-medium">{s.company}</TableCell>
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
                    <TableCell className="py-2 text-center">
                      {s.avg !== null &&
                        (s.avg < 0 ? (
                          <TrendingDown className="w-4 h-4 text-green-600 inline-block" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-red-600 inline-block" />
                        ))}
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
