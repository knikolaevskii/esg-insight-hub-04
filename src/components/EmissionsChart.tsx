import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SECTOR_CONFIG, getCompanySector } from "@/config/sectors";
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
  const years = useMemo(
    () => [...new Set(data.map((d) => d.reporting_year))].sort(),
    [data]
  );
  const [selectedYear, setSelectedYear] = useState(years[years.length - 1]?.toString() ?? "");

  const chartData = useMemo(() => {
    const yearNum = Number(selectedYear);
    const result: { company: string; sector: string; scope1: number; scope2: number }[] = [];

    for (const [sector, companies] of Object.entries(SECTOR_CONFIG)) {
      for (const company of companies) {
        const entry = data.find(
          (d) => d.company === company && d.reporting_year === yearNum
        );
        if (entry) {
          result.push({
            company,
            sector,
            scope1: entry.scope1.value,
            scope2: entry.scope2_market.value,
          });
        }
      }
    }
    return result;
  }, [data, selectedYear]);

  // Group by sector for rendering
  const sectors = useMemo(() => {
    const map = new Map<string, typeof chartData>();
    for (const item of chartData) {
      const list = map.get(item.sector) ?? [];
      list.push(item);
      map.set(item.sector, list);
    }
    return Array.from(map.entries());
  }, [chartData]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">Absolute Emissions by Sector</CardTitle>
        <ToggleGroup
          type="single"
          value={selectedYear}
          onValueChange={(v) => v && setSelectedYear(v)}
          className="bg-muted rounded-lg p-0.5"
        >
          {years.map((y) => (
            <ToggleGroupItem
              key={y}
              value={y.toString()}
              className="px-3 py-1 text-xs font-medium data-[state=on]:bg-ing-orange data-[state=on]:text-white rounded-md"
            >
              {y}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          {sectors.map(([sector, items]) => (
            <div key={sector}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                {sector}
              </h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={items} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="company" tick={{ fontSize: 12 }} />
                    <YAxis
                      tickFormatter={formatValue}
                      label={{
                        value: "Emissions (tCO2e)",
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
                    <Bar dataKey="scope1" stackId="a" fill="#FF6200" name="scope1" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="scope2" stackId="a" fill="#FFB380" name="scope2" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-ing-orange" />
            Scope 1
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#FFB380" }} />
            Scope 2 (Market)
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmissionsChart;
