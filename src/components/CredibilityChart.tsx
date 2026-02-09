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
import { SECTOR_CONFIG, getCompanySector } from "@/config/sectors";
import type { EsgEntry } from "@/types/esg";

interface Props {
  data: EsgEntry[];
}

interface ChartRow {
  company: string;
  sector: string;
  credibility: number;
  alignment: number;
  realism: number;
  credibilityNorm: number;
  alignmentNorm: number;
  realismNorm: number;
  colorDark: string;
  colorMid: string;
  colorLight: string;
}

/** Blend a hex colour toward white by a given ratio (0 = original, 1 = white) */
const lighten = (hex: string, ratio: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * ratio);
  const lg = Math.round(g + (255 - g) * ratio);
  const lb = Math.round(b + (255 - b) * ratio);
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
};

const METRICS = [
  { key: "credibilityNorm" as const, label: "Credibility Score", raw: "credibility" as const, max: 5 },
  { key: "alignmentNorm" as const, label: "Alignment", raw: "alignment" as const, max: 3 },
  { key: "realismNorm" as const, label: "Realism", raw: "realism" as const, max: 3 },
];

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
        // Find latest year entry with credibility data
        const entries = data
          .filter((d) => d.company === company && d.credibility)
          .sort((a, b) => b.reporting_year - a.reporting_year);
        if (entries.length === 0) continue;

        const latest = entries[0];
        const c = latest.credibility!;

        result.push({
          company,
          sector,
          credibility: c.credibility_score,
          alignment: c.alignment,
          realism: c.realism,
          // Normalize to 0-100%
          credibilityNorm: (c.credibility_score / 5) * 100,
          alignmentNorm: (c.alignment / 3) * 100,
          realismNorm: (c.realism / 3) * 100,
          colorDark: cfg.colorDark,
          colorMid: lighten(cfg.colorDark, 0.35),
          colorLight: lighten(cfg.colorDark, 0.6),
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
          Evaluating target ambition, assurance coverage, and action plan quality
          (normalised to 0–100%)
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
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
                tick={{ fontSize: 11 }}
                label={{
                  value: "Normalised Score (%)",
                  angle: -90,
                  position: "insideLeft",
                  style: {
                    fontSize: 11,
                    fill: "hsl(var(--muted-foreground))",
                  },
                }}
              />
              {/* Midpoint reference lines: credibility 2.5/5 = 50%, alignment & realism 2/3 ≈ 66.7% */}
              <ReferenceLine
                y={50}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="6 3"
                strokeWidth={1}
                label={{
                  value: "Credibility mid (2.5/5)",
                  position: "right",
                  fontSize: 10,
                  fill: "hsl(var(--muted-foreground))",
                }}
              />
              <ReferenceLine
                y={66.7}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="3 3"
                strokeWidth={1}
                label={{
                  value: "Alignment/Realism mid (2/3)",
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
                      <p>Credibility: {d.credibility} / 5</p>
                      <p>Alignment: {d.alignment} / 3</p>
                      <p>Realism: {d.realism} / 3</p>
                    </div>
                  );
                }}
              />
              {METRICS.map((m, mi) => (
                <Bar
                  key={m.key}
                  dataKey={m.key}
                  name={m.label}
                  radius={[3, 3, 0, 0]}
                >
                  {chartData.map((row, i) => (
                    <Cell
                      key={`${m.key}-${i}`}
                      fill={mi === 0 ? row.colorDark : mi === 1 ? row.colorMid : row.colorLight}
                    />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-foreground/70" />
            Credibility (0–5)
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-foreground/45" />
            Alignment (1–3)
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-foreground/25" />
            Realism (1–3)
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CredibilityChart;
