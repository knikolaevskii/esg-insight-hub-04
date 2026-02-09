import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { SECTOR_CONFIG } from "@/config/sectors";
import type { EsgEntry } from "@/types/esg";

interface Props {
  data: EsgEntry[];
}

interface ChartRow {
  company: string;
  sector: string;
  avgAlignment: number;
  avgCredibility: number;
  colorDark: string;
  colorLight: string;
}

const CredibilityChart = ({ data }: Props) => {
  const allSectors = useMemo(() => Object.keys(SECTOR_CONFIG), []);
  const [activeSectors, setActiveSectors] = useState<Set<string>>(
    () => new Set(allSectors)
  );

  const toggleSector = (sector: string) => {
    setActiveSectors((prev) => {
      const next = new Set(prev);
      if (next.has(sector)) {
        if (next.size > 1) next.delete(sector);
      } else {
        next.add(sector);
      }
      return next;
    });
  };

  const chartData = useMemo(() => {
    const result: ChartRow[] = [];

    for (const [sector, cfg] of Object.entries(SECTOR_CONFIG)) {
      if (!activeSectors.has(sector)) continue;

      for (const company of cfg.companies) {
        const entries = data.filter(
          (d) => d.company === company && d.credibility
        );
        if (entries.length === 0) continue;

        const avgAlignment =
          entries.reduce((s, e) => s + e.credibility!.alignment, 0) /
          entries.length;
        const avgCredibility =
          entries.reduce((s, e) => s + e.credibility!.credibility_score, 0) /
          entries.length;

        result.push({
          company,
          sector,
          avgAlignment: Math.round(avgAlignment * 100) / 100,
          avgCredibility: Math.round(avgCredibility * 100) / 100,
          colorDark: cfg.colorDark,
          colorLight: cfg.colorLight,
        });
      }
    }
    return result;
  }, [data, activeSectors]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Credibility Assessment</CardTitle>
        <CardDescription>
          Average Alignment &amp; Credibility scores across all reporting years
          (scale 1–3)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Sector filter buttons */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {allSectors.map((sector) => {
            const cfg = SECTOR_CONFIG[sector];
            const active = activeSectors.has(sector);
            return (
              <button
                key={sector}
                onClick={() => toggleSector(sector)}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: active ? cfg.colorDark : "transparent",
                  color: active ? "#fff" : cfg.colorDark,
                  borderColor: cfg.colorDark,
                  opacity: active ? 1 : 0.5,
                }}
              >
                {sector}
              </button>
            );
          })}
        </div>

        <div className="h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="20%" barGap={2}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="company"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis
                domain={[0, 3]}
                ticks={[0, 1, 2, 3]}
                tick={{ fontSize: 11 }}
                label={{
                  value: "Score (1–3)",
                  angle: -90,
                  position: "insideLeft",
                  style: {
                    fontSize: 11,
                    fill: "hsl(var(--muted-foreground))",
                  },
                }}
              />
              <ReferenceLine
                y={2}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="6 3"
                strokeWidth={1}
                label={{
                  value: "Average (2.0)",
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
                      <p>Alignment: {d.avgAlignment.toFixed(2)}</p>
                      <p>Credibility: {d.avgCredibility.toFixed(2)}</p>
                    </div>
                  );
                }}
              />
              
              <Bar dataKey="avgAlignment" name="Alignment" radius={[3, 3, 0, 0]}>
                {chartData.map((row, i) => (
                  <Cell key={`align-${i}`} fill={row.colorDark} />
                ))}
              </Bar>
              <Bar dataKey="avgCredibility" name="Credibility Score" radius={[3, 3, 0, 0]}>
                {chartData.map((row, i) => (
                  <Cell key={`cred-${i}`} fill={row.colorLight} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Custom legend with sector-aware colors */}
        <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: chartData[0]?.colorDark ?? "#666" }} />
            Alignment
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: chartData[0]?.colorLight ?? "#aaa" }} />
            Credibility Score
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CredibilityChart;
