import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
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
      colorDark: string;
      colorLight: string;
    }[] = [];

    for (const [sector, cfg] of Object.entries(SECTOR_CONFIG)) {
      const items: typeof result = [];
      for (const company of cfg.companies) {
        const entries = data.filter((d) => d.company === company);
        if (entries.length === 0) continue;
        const avgScope1 =
          entries.reduce((s, e) => s + e.scope1.value, 0) / entries.length;
        const avgScope2 =
          entries.reduce((s, e) => s + e.scope2_market.value, 0) / entries.length;
        items.push({
          company,
          sector,
          scope1: Math.round(avgScope1),
          scope2: Math.round(avgScope2),
          colorDark: cfg.colorDark,
          colorLight: cfg.colorLight,
        });
      }
      // Sort descending by total emissions within sector
      items.sort((a, b) => b.scope1 + b.scope2 - (a.scope1 + a.scope2));
      result.push(...items);
    }
    return result;
  }, [data]);

  // Build unique sector entries for the legend
  const sectorLegend = useMemo(
    () =>
      Object.entries(SECTOR_CONFIG).map(([name, cfg]) => ({
        name,
        colorDark: cfg.colorDark,
        colorLight: cfg.colorLight,
      })),
    []
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">
          Average Absolute Emissions (3-Year Mean)
        </CardTitle>
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
              {/* Render individual bars per data point using two Bar layers with Cell-like approach via shape */}
              <Bar
                dataKey="scope1"
                stackId="a"
                name="scope1"
                radius={[0, 0, 0, 0]}
                fill="#999"
                // Use shape to apply per-bar color
                shape={(props: any) => {
                  const item = chartData[props.index];
                  return (
                    <rect
                      x={props.x}
                      y={props.y}
                      width={props.width}
                      height={props.height}
                      fill={item?.colorDark ?? "#999"}
                      rx={0}
                    />
                  );
                }}
              />
              <Bar
                dataKey="scope2"
                stackId="a"
                name="scope2"
                radius={[4, 4, 0, 0]}
                fill="#ccc"
                shape={(props: any) => {
                  const item = chartData[props.index];
                  return (
                    <rect
                      x={props.x}
                      y={props.y}
                      width={props.width}
                      height={props.height}
                      fill={item?.colorLight ?? "#ccc"}
                      rx={4}
                      ry={4}
                    />
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Sector legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground flex-wrap">
          {sectorLegend.map((s) => (
            <div key={s.name} className="flex items-center gap-1.5">
              <div className="flex gap-0.5">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: s.colorDark }}
                />
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: s.colorLight }}
                />
              </div>
              {s.name}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default EmissionsChart;
