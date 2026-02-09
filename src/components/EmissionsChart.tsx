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
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SECTOR_CONFIG } from "@/config/sectors";
import type { EsgEntry } from "@/types/esg";

interface Props {
  data: EsgEntry[];
}

const formatValue = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toString();
};

const EmissionsChart = ({ data }: Props) => {
  const chartData = useMemo(() => {
    const result: {
      company: string;
      sector: string;
      scope1: number;
      scope2: number;
      total: number;
      color: string;
      colorLight: string;
    }[] = [];

    for (const [sector, info] of Object.entries(SECTOR_CONFIG)) {
      const sectorItems: typeof result = [];

      for (const company of info.companies) {
        const entries = data.filter((d) => d.company === company);
        if (entries.length === 0) continue;

        const avgScope1 =
          entries.reduce((s, e) => s + e.scope1.value, 0) / entries.length;
        const avgScope2 =
          entries.reduce((s, e) => s + e.scope2_market.value, 0) / entries.length;

        sectorItems.push({
          company,
          sector,
          scope1: Math.round(avgScope1),
          scope2: Math.round(avgScope2),
          total: Math.round(avgScope1 + avgScope2),
          color: info.color,
          colorLight: info.colorLight,
        });
      }

      // Sort by total emissions descending within sector
      sectorItems.sort((a, b) => b.total - a.total);
      result.push(...sectorItems);
    }

    return result;
  }, [data]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Average Absolute Emissions (2021–2023)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="company" tick={{ fontSize: 12 }} />
              <YAxis
                tickFormatter={formatValue}
                label={{
                  value: "Average Emissions (tCO2e)",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
                }}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  value.toLocaleString() + " tCO2e",
                  name === "scope1" ? "Scope 1" : "Scope 2 (Market)",
                ]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="scope1" stackId="a" name="scope1">
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
              <Bar dataKey="scope2" stackId="a" name="scope2" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.colorLight} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Sector legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
          {Object.entries(SECTOR_CONFIG).map(([sector, info]) => (
            <div key={sector} className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: info.color }} />
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: info.colorLight }} />
              </div>
              {sector}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default EmissionsChart;
