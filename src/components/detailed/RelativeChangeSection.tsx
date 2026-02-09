import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SECTOR_CONFIG } from "@/config/sectors";
import type { EsgEntry } from "@/types/esg";
import SectorFilter from "./SectorFilter";
import MetricToggle, { type MetricMode } from "./MetricToggle";

interface Props {
  data: EsgEntry[];
}

type YearPair = "2021→2022" | "2022→2023" | "2021→2023";

const YEAR_PAIRS: { value: YearPair; from: number; to: number; label: string }[] = [
  { value: "2021→2022", from: 2021, to: 2022, label: "2021 → 2022" },
  { value: "2022→2023", from: 2022, to: 2023, label: "2022 → 2023" },
  { value: "2021→2023", from: 2021, to: 2023, label: "2021 → 2023" },
];

const safeVal = (v: number | null | undefined): number | null =>
  v != null && isFinite(v) ? v : null;

const getMetricValue = (entry: EsgEntry, metric: MetricMode): number | null => {
  const s1 = safeVal(entry.scope1?.value);
  const s2 = safeVal(entry.scope2_market?.value);
  if (metric === "scope1") return s1;
  if (metric === "scope2") return s2;
  if (s1 === null && s2 === null) return null;
  return (s1 ?? 0) + (s2 ?? 0);
};

const RelativeChangeSection = ({ data }: Props) => {
  const allSectors = useMemo(() => Object.keys(SECTOR_CONFIG), []);
  const [activeSectors, setActiveSectors] = useState<Set<string>>(() => new Set(allSectors));
  const [metric, setMetric] = useState<MetricMode>("total");
  const [yearPair, setYearPair] = useState<YearPair>("2021→2023");

  const toggleSector = (sector: string) => {
    setActiveSectors((prev) => {
      const next = new Set(prev);
      if (next.has(sector)) {
        if (next.size > 1) next.delete(sector);
      } else next.add(sector);
      return next;
    });
  };

  const pair = YEAR_PAIRS.find((p) => p.value === yearPair)!;

  const chartData = useMemo(() => {
    const result: {
      company: string;
      sector: string;
      pctChange: number;
      colorDark: string;
    }[] = [];

    for (const [sector, cfg] of Object.entries(SECTOR_CONFIG)) {
      if (!activeSectors.has(sector)) continue;
      for (const company of cfg.companies) {
        const fromEntry = data.find((d) => d.company === company && d.reporting_year === pair.from);
        const toEntry = data.find((d) => d.company === company && d.reporting_year === pair.to);
        if (!fromEntry || !toEntry) continue;

        const fromVal = getMetricValue(fromEntry, metric);
        const toVal = getMetricValue(toEntry, metric);
        if (fromVal === null || toVal === null || fromVal === 0) continue;

        const pct = Math.round(((toVal - fromVal) / fromVal) * 1000) / 10;
        result.push({ company, sector, pctChange: pct, colorDark: cfg.colorDark });
      }
    }

    // Sort by pctChange ascending (biggest decrease first)
    result.sort((a, b) => a.pctChange - b.pctChange);
    return result;
  }, [data, activeSectors, metric, pair]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Relative Change</CardTitle>
        <CardDescription>
          Percentage change in emissions between selected years
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <ToggleGroup
            type="single"
            value={yearPair}
            onValueChange={(v) => v && setYearPair(v as YearPair)}
            className="bg-muted rounded-lg p-1"
          >
            {YEAR_PAIRS.map((p) => (
              <ToggleGroupItem
                key={p.value}
                value={p.value}
                className="px-3 py-1 text-xs font-medium data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-md"
              >
                {p.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <MetricToggle value={metric} onChange={setMetric} />
          <SectorFilter activeSectors={activeSectors} onToggle={toggleSector} />
        </div>

        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="company" tick={{ fontSize: 11 }} interval={0} tickLine={false} />
              <YAxis
                tickFormatter={(v: number) => `${v}%`}
                tick={{ fontSize: 11 }}
                label={{
                  value: "Change (%)",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
                }}
              />
              <ReferenceLine y={0} stroke="hsl(var(--border))" />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                      <p className="font-semibold">{d.company}</p>
                      <p className="text-muted-foreground">{d.sector}</p>
                      <p>
                        {pair.label}:{" "}
                        <span
                          className="font-medium"
                          style={{ color: d.pctChange < 0 ? "#16a34a" : "#dc2626" }}
                        >
                          {d.pctChange > 0 ? "+" : ""}
                          {d.pctChange.toFixed(1)}%
                        </span>
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="pctChange" name="Change" radius={[4, 4, 0, 0]}>
                {chartData.map((row, i) => (
                  <Cell
                    key={i}
                    fill={row.pctChange < 0 ? "#16a34a" : "#dc2626"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Sector legend */}
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#16a34a" }} />
            Decrease
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#dc2626" }} />
            Increase
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RelativeChangeSection;
