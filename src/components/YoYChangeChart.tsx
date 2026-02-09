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

  const { bars, summaries, sectorGroups } = useMemo(() => {
    // Build year-over-year data for each company
    const companyDataMap = new Map<string, Map<number, number>>(); // company -> (year -> total)

    for (const entry of data) {
      const total = getTotal(entry);
      if (total === null) continue;

      if (!companyDataMap.has(entry.company)) {
        companyDataMap.set(entry.company, new Map());
      }
      companyDataMap.get(entry.company)!.set(entry.reporting_year, total);
    }

    // Compute year-over-year pct change for each company/year pair
    const changeMap = new Map<string, CompanyYearBar[]>(); // company -> bars

    for (const [company, yearData] of companyDataMap) {
      const years = [...yearData.keys()].sort();

      const sector = getCompanySector(company);
      if (!sector) continue;
      const cfg = SECTOR_CONFIG[sector];

      // Calculate change relative to previous year
      for (let i = 1; i < years.length; i++) {
        const currentYear = years[i];
        const previousYear = years[i - 1];

        const currentTotal = yearData.get(currentYear);
        const previousTotal = yearData.get(previousYear);

        if (currentTotal == null || previousTotal == null || previousTotal === 0) continue;

        const pct = Math.round(((currentTotal - previousTotal) / previousTotal) * 1000) / 10;

        const list = changeMap.get(company) ?? [];
        list.push({
          key: `${company}|${currentYear}`,
          company: company,
          year: currentYear,
          pctChange: pct,
          sector,
          colorDark: cfg.colorDark,
          colorLight: cfg.colorLight,
        });
        changeMap.set(company, list);
      }
    }

    // Compute trend: positive if last year is more negative than first year
    const sums: CompanySummary[] = [];
    for (const [company, items] of changeMap) {
      if (items.length === 0) continue;

      // Sort by year to get first and last
      const sortedItems = [...items].sort((a, b) => a.year - b.year);
      const firstYear = sortedItems[0];
      const lastYear = sortedItems[sortedItems.length - 1];

      // Trend is positive (improving) if last year change is more negative than first year
      // e.g., first year: -10%, last year: -20% → trend is +10 (improving, last is MORE negative)
      // e.g., first year: -20%, last year: -10% → trend is -10 (worsening, last is LESS negative)
      const trend = firstYear.pctChange - lastYear.pctChange;

      sums.push({
        company,
        sector: items[0].sector,
        avg: Math.round(trend * 100) / 100,
      });
    }

    // Sort by sector first (Energy & Utilities, Technology, Consumer Goods), then by avg within sector
    const sectorOrder = ["Energy & Utilities", "Technology", "Consumer Goods"];
    sums.sort((a, b) => {
      const sectorA = sectorOrder.indexOf(a.sector);
      const sectorB = sectorOrder.indexOf(b.sector);
      if (sectorA !== sectorB) return sectorA - sectorB;
      return (a.avg ?? Infinity) - (b.avg ?? Infinity);
    });

    // Build ordered bar data: for each company, add bars for each year
    const orderedBars: (CompanyYearBar & { companyIndex: number })[] = [];
    sums.forEach((s, ci) => {
      const items = changeMap.get(s.company) ?? [];
      items.sort((a, b) => a.year - b.year);
      for (const item of items) {
        orderedBars.push({ ...item, companyIndex: ci });
      }
    });

    // Calculate sector groups for spacing
    const groups: { sector: string; startIdx: number; endIdx: number }[] = [];
    let currentSector = "";
    let start = 0;
    sums.forEach((s, i) => {
      if (s.sector !== currentSector) {
        if (currentSector) groups.push({ sector: currentSector, startIdx: start, endIdx: i - 1 });
        currentSector = s.sector;
        start = i;
      }
    });
    if (currentSector)
      groups.push({
        sector: currentSector,
        startIdx: start,
        endIdx: sums.length - 1,
      });

    return { bars: orderedBars, summaries: sums, sectorGroups: groups };
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
    if (current)
      groups.push({
        company: current,
        startIdx: start,
        endIdx: chartData.length - 1,
      });
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
                <BarChart data={chartData} barCategoryGap="20%" barGap={2} margin={{ top: 30 }}>
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
                      value: `Year-over-Year Change (%)`,
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
                            YoY Change:{" "}
                            <span className="font-medium" style={{ color: d.value < 0 ? "#16a34a" : "#dc2626" }}>
                              {d.value > 0 ? "+" : ""}
                              {d.value.toFixed(1)}%
                            </span>
                          </p>
                        </div>
                      );
                    }}
                  />
                  {/* Company name labels above bars and sector separator lines */}
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

                          {/* Dashed separator lines between sectors */}
                          {sectorGroups.slice(1).map((group) => {
                            const prevGroup = sectorGroups[sectorGroups.indexOf(group) - 1];
                            if (!prevGroup) return null;

                            // Find the last company of previous sector
                            const prevCompany = summaries[prevGroup.endIdx];
                            const currentCompany = summaries[group.startIdx];
                            if (!prevCompany || !currentCompany) return null;

                            // Find last bar of previous sector and first bar of current sector
                            const prevLastBar = chartData.findLast((d) => d.company === prevCompany.company);
                            const currentFirstBar = chartData.find((d) => d.company === currentCompany.company);

                            if (!prevLastBar || !currentFirstBar) return null;

                            const lastX = xAxis.scale(prevLastBar.barKey);
                            const firstX = xAxis.scale(currentFirstBar.barKey);
                            if (lastX == null || firstX == null) return null;

                            const xPos = (lastX + bandSize + firstX) / 2;

                            return (
                              <line
                                key={`sep-${group.sector}`}
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
                  <TableHead className="text-xs text-right">Trend Change</TableHead>
                  <TableHead className="text-xs text-center">Direction</TableHead>
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
                            color: s.avg > 0 ? "#16a34a" : "#dc2626",
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
                        (s.avg > 0 ? (
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
