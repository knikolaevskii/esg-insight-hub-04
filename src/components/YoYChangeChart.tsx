import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SECTOR_CONFIG, LINE_STYLES, getCompanySector } from "@/config/sectors";
import type { EsgEntry } from "@/types/esg";

interface Props {
  data: EsgEntry[];
}

const IndexedTrendChart = ({ data }: Props) => {
  const years = useMemo(
    () => [...new Set(data.map((d) => d.reporting_year))].sort(),
    [data]
  );

  const baseYear = years[0];

  // Build { year, [company]: indexValue } rows
  const { chartData, companies } = useMemo(() => {
    // Collect all companies in sector order
    const allCompanies: { name: string; sector: string; color: string; styleIdx: number }[] = [];
    for (const [sector, info] of Object.entries(SECTOR_CONFIG)) {
      info.companies.forEach((company, idx) => {
        if (data.some((d) => d.company === company)) {
          allCompanies.push({ name: company, sector, color: info.color, styleIdx: idx });
        }
      });
    }

    // Compute base totals
    const baseTotals = new Map<string, number>();
    for (const c of allCompanies) {
      const entry = data.find((d) => d.company === c.name && d.reporting_year === baseYear);
      if (entry) {
        baseTotals.set(c.name, entry.scope1.value + entry.scope2_market.value);
      }
    }

    const rows = years.map((year) => {
      const row: Record<string, number | string> = { year: year.toString() };
      for (const c of allCompanies) {
        const base = baseTotals.get(c.name);
        const entry = data.find((d) => d.company === c.name && d.reporting_year === year);
        if (base && entry) {
          const total = entry.scope1.value + entry.scope2_market.value;
          row[c.name] = Math.round((total / base) * 1000) / 10; // percentage
        }
      }
      return row;
    });

    return { chartData: rows, companies: allCompanies };
  }, [data, years, baseYear]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Indexed Emission Trends ({baseYear} = 100%)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis
                tickFormatter={(v) => `${v}%`}
                label={{
                  value: `Emissions Index (${baseYear} = 100%)`,
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
                }}
                tick={{ fontSize: 11 }}
              />
              <ReferenceLine
                y={100}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="6 3"
                strokeOpacity={0.6}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  const sector = getCompanySector(name) ?? "";
                  return [`${value.toFixed(1)}%`, `${name} (${sector})`];
                }}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  fontSize: 12,
                }}
              />
              {companies.map((c) => {
                const style = LINE_STYLES[c.styleIdx % LINE_STYLES.length];
                return (
                  <Line
                    key={c.name}
                    type="monotone"
                    dataKey={c.name}
                    stroke={c.color}
                    strokeWidth={2}
                    strokeDasharray={style.strokeDasharray}
                    dot={{ r: 4, fill: c.color }}
                    activeDot={{ r: 6 }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {/* Sector-grouped legend */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 mt-4 text-xs text-muted-foreground">
          {Object.entries(SECTOR_CONFIG).map(([sector, info]) => (
            <div key={sector} className="flex items-center gap-3">
              <span className="font-semibold" style={{ color: info.color }}>{sector}:</span>
              {info.companies
                .filter((c) => data.some((d) => d.company === c))
                .map((company, idx) => {
                  const style = LINE_STYLES[idx % LINE_STYLES.length];
                  return (
                    <div key={company} className="flex items-center gap-1">
                      <svg width="20" height="8">
                        <line
                          x1="0" y1="4" x2="20" y2="4"
                          stroke={info.color}
                          strokeWidth={2}
                          strokeDasharray={style.strokeDasharray}
                        />
                      </svg>
                      <span>{company}</span>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default IndexedTrendChart;
