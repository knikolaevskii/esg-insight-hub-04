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
  key: string;
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
  lastPctChange: number | null; // ✅ add this
}

const YoYChangeChart = ({ data }: Props) => {
  const baseYear = useMemo(() => Math.min(...data.map((d) => d.reporting_year)), [data]);

  const { bars, summaries } = useMemo(() => {
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

    const changeMap = new Map<string, CompanyYearBar[]>();

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
          pctChange: pct,
          sector,
          colorDark: cfg.colorDark,
          colorLight: cfg.colorLight,
        });
        changeMap.set(company, list);
      }
    }

    const sums: CompanySummary[] = [];
    for (const [company, items] of changeMap) {
      const vals = items.map((i) => i.pctChange);
      const avg = vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : null;

      // ✅ compute "last bar" (most recent year)
      const last = items.length > 0 ? [...items].sort((a, b) => a.year - b.year)[items.length - 1].pctChange : null;

      sums.push({
        company,
        sector: items[0].sector,
        avg,
        lastPctChange: last,
      });
    }

    sums.sort((a, b) => (a.avg ?? Infinity) - (b.avg ?? Infinity));

    const orderedBars: (CompanyYearBar & { companyIndex: number })[] = [];
    sums.forEach((s, ci) => {
      const items = changeMap.get(s.company) ?? [];
      items.sort((a, b) => a.year - b.year);
      for (const item of items) orderedBars.push({ ...item, companyIndex: ci });
    });

    return { bars: orderedBars, summaries: sums };
  }, [data]);

  // ... keep the rest of your chart code unchanged ...

  return (
    <Card>
      {/* ... */}
      <CardContent>
        <div className="flex gap-6 flex-col lg:flex-row">
          {/* Chart ... unchanged ... */}

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
                        <span style={{ color: s.avg < 0 ? "#16a34a" : "#dc2626" }}>
                          {s.avg > 0 ? "+" : ""}
                          {s.avg.toFixed(2)}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>

                    {/* ✅ Trend based on last bar:
                        if lastPctChange > 0 => RED icon
                        if lastPctChange < 0 => GREEN icon */}
                    <TableCell className="py-2 text-center">
                      {s.lastPctChange !== null &&
                        (s.lastPctChange < 0 ? (
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
