import { useMemo, useState } from "react";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SECTOR_CONFIG } from "@/config/sectors";
import type { EsgEntry } from "@/types/esg";

interface Props {
  data: EsgEntry[];
}

const YoYChangeChart = ({ data }: Props) => {
  const years = useMemo(
    () => [...new Set(data.map((d) => d.reporting_year))].sort(),
    [data]
  );

  const yearPairs = useMemo(
    () => years.slice(1).map((y, i) => ({ label: `${years[i]}→${y}`, from: years[i], to: y })),
    [years]
  );

  const [selectedPair, setSelectedPair] = useState(yearPairs[0]?.label ?? "");

  const pair = yearPairs.find((p) => p.label === selectedPair) ?? yearPairs[0];

  const chartData = useMemo(() => {
    if (!pair) return [];
    const result: { company: string; sector: string; change: number }[] = [];

    for (const [sector, companies] of Object.entries(SECTOR_CONFIG)) {
      for (const company of companies) {
        const prev = data.find((d) => d.company === company && d.reporting_year === pair.from);
        const curr = data.find((d) => d.company === company && d.reporting_year === pair.to);
        if (prev && curr) {
          const prevTotal = prev.scope1.value + prev.scope2_market.value;
          const currTotal = curr.scope1.value + curr.scope2_market.value;
          const change = ((currTotal - prevTotal) / prevTotal) * 100;
          result.push({ company, sector, change: Math.round(change * 10) / 10 });
        }
      }
    }
    return result;
  }, [data, pair]);

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
        <CardTitle className="text-lg">Year-over-Year Percentage Change</CardTitle>
        <ToggleGroup
          type="single"
          value={selectedPair}
          onValueChange={(v) => v && setSelectedPair(v)}
          className="bg-muted rounded-lg p-0.5"
        >
          {yearPairs.map((p) => (
            <ToggleGroupItem
              key={p.label}
              value={p.label}
              className="px-3 py-1 text-xs font-medium data-[state=on]:bg-ing-orange data-[state=on]:text-white rounded-md"
            >
              {p.label}
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
                      tickFormatter={(v) => `${v}%`}
                      label={{
                        value: "YoY Change (%)",
                        angle: -90,
                        position: "insideLeft",
                        style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
                      }}
                      tick={{ fontSize: 11 }}
                    />
                    <ReferenceLine y={0} stroke="hsl(var(--border))" />
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(1)}%`, "YoY Change"]}
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid hsl(var(--border))",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="change" radius={[4, 4, 0, 0]}>
                      {items.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.change < 0 ? "#22c55e" : "#ef4444"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#22c55e" }} />
            Reduction
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#ef4444" }} />
            Increase
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default YoYChangeChart;
