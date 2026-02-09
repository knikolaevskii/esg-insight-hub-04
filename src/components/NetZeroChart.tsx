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
  ReferenceLine,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { SECTOR_CONFIG } from "@/config/sectors";

const NET_ZERO_TARGETS: Record<string, number | null> = {
  Amazon: 2040,
  BP: 2050,
  ENGIE: 2045,
  Intel: 2040,
  "Nestle": 2050,
  Shell: 2025,
  SSE: 2040,
  "Coca-Cola": null,
};

interface ChartRow {
  company: string;
  sector: string;
  targetYear: number | null;
  colorDark: string;
}

const NetZeroChart = () => {
  const chartData = useMemo(() => {
    const result: ChartRow[] = [];
    for (const [sector, cfg] of Object.entries(SECTOR_CONFIG)) {
      for (const company of cfg.companies) {
        const target = NET_ZERO_TARGETS[company] ?? null;
        result.push({
          company,
          sector,
          targetYear: target,
          colorDark: cfg.colorDark,
        });
      }
    }
    return result;
  }, []);

  const minYear = 2020;
  const maxYear = 2055;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Net-Zero Target Year</CardTitle>
        <CardDescription>
          Declared net-zero carbon emissions target year per company
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="company"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis
                domain={[minYear, maxYear]}
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => String(v)}
                label={{
                  value: "Target Year",
                  angle: -90,
                  position: "insideLeft",
                  style: {
                    fontSize: 11,
                    fill: "hsl(var(--muted-foreground))",
                  },
                }}
              />
              <ReferenceLine
                y={2030}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="6 3"
                strokeWidth={1}
                label={{
                  value: "2030",
                  position: "right",
                  fontSize: 10,
                  fill: "hsl(var(--muted-foreground))",
                }}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as ChartRow;
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
              <Bar dataKey="targetYear" name="Target Year" radius={[4, 4, 0, 0]}>
                {chartData.map((row, i) => (
                  <Cell
                    key={i}
                    fill={row.targetYear ? row.colorDark : "hsl(var(--muted))"}
                    opacity={row.targetYear ? 1 : 0.3}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground flex-wrap">
          {Object.entries(SECTOR_CONFIG).map(([name, cfg]) => (
            <div key={name} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: cfg.colorDark }}
              />
              {name}
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-muted" />
            Not declared
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NetZeroChart;
