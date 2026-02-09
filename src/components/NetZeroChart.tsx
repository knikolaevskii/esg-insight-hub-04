import { useMemo } from "react";
import {
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Customized,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { SECTOR_CONFIG } from "@/config/sectors";
import esgData from "@/data/esg_data.json";
import type { EsgData } from "@/types/esg";

/**
 * Derive net-zero target year from the JSON data.
 * Pick the target with the latest target_year whose description
 * contains "net zero" or "net-zero".
 */
function getNetZeroTargets(): Record<string, number | null> {
  const data = esgData as EsgData;
  const result: Record<string, number | null> = {};
  for (const company of data.companies) {
    const allTargets = company.years.flatMap((y) => y.targets ?? []);
    const nzTargets = allTargets.filter((t) =>
      /net[- ]zero/i.test(t.description ?? "")
    );
    const withYear = nzTargets.filter((t) => t.target_year != null);
    if (withYear.length > 0) {
      withYear.sort((a, b) => (b.target_year ?? 0) - (a.target_year ?? 0));
      result[company.company] = withYear[0].target_year;
    } else {
      result[company.company] = null;
    }
  }
  return result;
}

interface ChartRow {
  company: string;
  sector: string;
  targetYear: number | null;
  colorDark: string;
}

const NetZeroChart = () => {
  const { chartData, minYear, maxYear } = useMemo(() => {
    const targets = getNetZeroTargets();
    const rows: ChartRow[] = [];

    for (const [sector, cfg] of Object.entries(SECTOR_CONFIG)) {
      for (const company of cfg.companies) {
        rows.push({
          company,
          sector,
          targetYear: targets[company] ?? null,
          colorDark: cfg.colorDark,
        });
      }
    }

    const years = rows
      .map((r) => r.targetYear)
      .filter((y): y is number => y != null);
    const min = Math.min(...years) - 3;
    const max = Math.max(...years) + 3;

    return { chartData: rows, minYear: min, maxYear: max };
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Net-Zero Target Year</CardTitle>
        <CardDescription>
          Declared net-zero carbon emissions target year per company
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              layout="vertical"
              margin={{ top: 10, right: 50, bottom: 20, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <YAxis
                dataKey="company"
                type="category"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
                width={90}
              />
              <XAxis
                type="number"
                domain={[minYear, maxYear]}
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => String(v)}
                label={{
                  value: "Target Year",
                  position: "insideBottom",
                  offset: -5,
                  style: {
                    fontSize: 11,
                    fill: "hsl(var(--muted-foreground))",
                  },
                }}
              />
              <ReferenceLine
                x={2050}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="6 3"
                strokeWidth={1}
                label={{
                  value: "Paris Agreement",
                  position: "top",
                  fontSize: 10,
                  fill: "hsl(var(--muted-foreground))",
                }}
              />
              <Tooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload as ChartRow | undefined;
                  if (!d) return null;
                  return (
                    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                      <p className="font-semibold">{d.company}</p>
                      <p className="text-muted-foreground">{d.sector}</p>
                      <p>
                        Net-zero target:{" "}
                        {d.targetYear ? d.targetYear : "Not declared"}
                      </p>
                    </div>
                  );
                }}
              />
              {/* Custom lollipop rendering */}
              <Customized
                component={(props: any) => {
                  const { yAxisMap, xAxisMap } = props;
                  const yAxis = yAxisMap && Object.values(yAxisMap)[0] as any;
                  const xAxis = xAxisMap && Object.values(xAxisMap)[0] as any;
                  if (!yAxis || !xAxis) return null;

                  const scale = xAxis.scale;
                  const bandScale = yAxis.scale;
                  const bandwidth = yAxis.bandSize || 30;

                  return (
                    <g>
                      {chartData.map((row, i) => {
                        const cy = (bandScale(row.company) ?? 0) + bandwidth / 2;
                        const xStart = scale(minYear);

                        if (row.targetYear == null) {
                          // "Not declared" text
                          const xMid = scale((minYear + maxYear) / 2);
                          return (
                            <text
                              key={i}
                              x={xMid}
                              y={cy}
                              textAnchor="middle"
                              dominantBaseline="central"
                              fontSize={11}
                              fill="hsl(var(--muted-foreground))"
                              fontStyle="italic"
                            >
                              Not declared
                            </text>
                          );
                        }

                        const cx = scale(row.targetYear);
                        return (
                          <g key={i}>
                            {/* Lollipop stick */}
                            <line
                              x1={xStart}
                              y1={cy}
                              x2={cx}
                              y2={cy}
                              stroke={row.colorDark}
                              strokeWidth={2}
                              strokeOpacity={0.4}
                            />
                            {/* Dot */}
                            <circle
                              cx={cx}
                              cy={cy}
                              r={7}
                              fill={row.colorDark}
                            />
                            {/* Year label */}
                            <text
                              x={cx + 12}
                              y={cy}
                              dominantBaseline="central"
                              fontSize={11}
                              fontWeight={600}
                              fill="hsl(var(--foreground))"
                            >
                              {row.targetYear}
                            </text>
                          </g>
                        );
                      })}
                    </g>
                  );
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground flex-wrap">
          {Object.entries(SECTOR_CONFIG).map(([name, cfg]) => (
            <div key={name} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: cfg.colorDark }}
              />
              {name}
            </div>
          ))}
          <div className="flex items-center gap-1.5 italic">
            Not declared = no net-zero target identified
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NetZeroChart;
