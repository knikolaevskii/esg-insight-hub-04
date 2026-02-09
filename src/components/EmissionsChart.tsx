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

/** Safely read a numeric value, treating null/undefined as null */
const safeVal = (v: number | null | undefined): number | null =>
  v != null && isFinite(v) ? v : null;

const EmissionsChart = ({ data }: Props) => {
  const chartData = useMemo(() => {
    const result: {
      company: string;
      sector: string;
      scope1: number;
      scope2: number;
      colorDark: string;
      colorLight: string;
      yearCount: number;
      totalYears: number;
    }[] = [];

    for (const [sector, cfg] of Object.entries(SECTOR_CONFIG)) {
      const items: typeof result = [];
      for (const company of cfg.companies) {
        const entries = data.filter((d) => d.company === company);
        if (entries.length === 0) continue;

        const totalYears = entries.length;

        // Scope 1: average only over years with non-null values
        const s1Vals = entries
          .map((e) => safeVal(e.scope1?.value))
          .filter((v): v is number => v !== null);
        const avgScope1 =
          s1Vals.length > 0
            ? s1Vals.reduce((a, b) => a + b, 0) / s1Vals.length
            : 0;

        // Scope 2: average only over years with non-null values
        const s2Vals = entries
          .map((e) => safeVal(e.scope2_market?.value))
          .filter((v): v is number => v !== null);
        const avgScope2 =
          s2Vals.length > 0
            ? s2Vals.reduce((a, b) => a + b, 0) / s2Vals.length
            : 0;

        // Skip entirely if both scopes have no data at all
        if (s1Vals.length === 0 && s2Vals.length === 0) continue;

        // yearCount = max years contributing to either scope
        const yearCount = Math.max(s1Vals.length, s2Vals.length);

        items.push({
          company,
          sector,
          scope1: Math.round(avgScope1),
          scope2: Math.round(avgScope2),
          colorDark: cfg.colorDark,
          colorLight: cfg.colorLight,
          yearCount,
          totalYears,
        });
      }
      items.sort((a, b) => b.scope1 + b.scope2 - (a.scope1 + a.scope2));
      result.push(...items);
    }
    return result;
  }, [data]);

  const sectorLegend = useMemo(
    () =>
      Object.entries(SECTOR_CONFIG).map(([name, cfg]) => ({
        name,
        colorDark: cfg.colorDark,
        colorLight: cfg.colorLight,
      })),
    []
  );

  // Determine total expected years from data
  const expectedYears = useMemo(
    () => new Set(data.map((d) => d.reporting_year)).size,
    [data]
  );

  const hasPartial = chartData.some((d) => d.yearCount < expectedYears);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">
          Average Absolute Emissions ({expectedYears}-Year Mean)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="company"
                tick={{ fontSize: 12 }}
                tickFormatter={(name: string) => {
                  const item = chartData.find((d) => d.company === name);
                  return item && item.yearCount < expectedYears
                    ? `${name} *`
                    : name;
                }}
              />
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
                labelFormatter={(label: string) => {
                  const item = chartData.find((d) => d.company === label);
                  if (item && item.yearCount < expectedYears) {
                    return `${label} (avg of ${item.yearCount}/${expectedYears} years)`;
                  }
                  return label;
                }}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="scope1"
                stackId="a"
                name="scope1"
                radius={[0, 0, 0, 0]}
                fill="#999"
                shape={(props: any) => {
                  const item = chartData[props.index];
                  const isPartial = item && item.yearCount < expectedYears;
                  return (
                    <rect
                      x={props.x}
                      y={props.y}
                      width={props.width}
                      height={props.height}
                      fill={item?.colorDark ?? "#999"}
                      rx={0}
                      opacity={isPartial ? 0.6 : 1}
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
                  const isPartial = item && item.yearCount < expectedYears;
                  return (
                    <rect
                      x={props.x}
                      y={props.y}
                      width={props.width}
                      height={props.height}
                      fill={item?.colorLight ?? "#ccc"}
                      rx={4}
                      ry={4}
                      opacity={isPartial ? 0.6 : 1}
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
        {hasPartial && (
          <p className="text-center text-[11px] text-muted-foreground mt-2">
            * Average based on fewer than {expectedYears} years of data.
            Bars appear at reduced opacity.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default EmissionsChart;
