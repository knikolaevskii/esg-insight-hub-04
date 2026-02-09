import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { SECTOR_CONFIG } from "@/config/sectors";
import type { EsgEntry } from "@/types/esg";
import SectorFilter from "./SectorFilter";
import MetricToggle, { type MetricMode } from "./MetricToggle";
import YearFilter from "./YearFilter";

interface Props {
  data: EsgEntry[];
}

const safeVal = (v: number | null | undefined): number | null =>
  v != null && isFinite(v) ? v : null;

const formatValue = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toString();
};

const AbsoluteEmissionsSection = ({ data }: Props) => {
  const allYears = useMemo(
    () => [...new Set(data.map((d) => d.reporting_year))].sort(),
    [data]
  );
  const allSectors = useMemo(() => Object.keys(SECTOR_CONFIG), []);

  const [activeYears, setActiveYears] = useState<Set<number>>(() => new Set(allYears));
  const [activeSectors, setActiveSectors] = useState<Set<string>>(() => new Set(allSectors));
  const [metric, setMetric] = useState<MetricMode>("total");

  const toggleYear = (yr: number) => {
    setActiveYears((prev) => {
      const next = new Set(prev);
      if (next.has(yr)) {
        if (next.size > 1) next.delete(yr);
      } else next.add(yr);
      return next;
    });
  };

  const toggleSector = (sector: string) => {
    setActiveSectors((prev) => {
      const next = new Set(prev);
      if (next.has(sector)) {
        if (next.size > 1) next.delete(sector);
      } else next.add(sector);
      return next;
    });
  };

  const selectedYears = useMemo(
    () => allYears.filter((y) => activeYears.has(y)),
    [allYears, activeYears]
  );

  const chartData = useMemo(() => {
    const result: {
      company: string;
      sector: string;
      colorDark: string;
      colorLight: string;
      [key: string]: any;
    }[] = [];

    for (const [sector, cfg] of Object.entries(SECTOR_CONFIG)) {
      if (!activeSectors.has(sector)) continue;
      for (const company of cfg.companies) {
        const row: any = { company, sector, colorDark: cfg.colorDark, colorLight: cfg.colorLight };
        for (const yr of selectedYears) {
          const entry = data.find((d) => d.company === company && d.reporting_year === yr);
          if (!entry) continue;
          const s1 = safeVal(entry.scope1?.value) ?? 0;
          const s2 = safeVal(entry.scope2_market?.value) ?? 0;

          if (metric === "total") {
            row[`s1_${yr}`] = s1;
            row[`s2_${yr}`] = s2;
          } else if (metric === "scope1") {
            row[`val_${yr}`] = s1;
          } else {
            row[`val_${yr}`] = s2;
          }
        }
        result.push(row);
      }
    }
    return result;
  }, [data, activeSectors, selectedYears, metric]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Absolute Emissions</CardTitle>
        <CardDescription>
          Raw Scope 1 + Scope 2 emissions per company per year (no averaging)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <YearFilter years={allYears} activeYears={activeYears} onToggle={toggleYear} />
          <MetricToggle value={metric} onChange={setMetric} />
          <SectorFilter activeSectors={activeSectors} onToggle={toggleSector} />
        </div>

        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="20%" barGap={1}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="company" tick={{ fontSize: 11 }} interval={0} tickLine={false} />
              <YAxis
                tickFormatter={formatValue}
                tick={{ fontSize: 11 }}
                label={{
                  value: "Emissions (tCO2e)",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
                }}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                      <p className="font-semibold">{d.company}</p>
                      <p className="text-muted-foreground mb-1">{d.sector}</p>
                      {payload.map((p: any) => {
                        const key = p.dataKey as string;
                        const yr = key.split("_")[1];
                        const label = key.startsWith("s1") ? `${yr} Scope 1` : key.startsWith("s2") ? `${yr} Scope 2` : yr;
                        return (
                          <p key={key}>
                            {label}: {Number(p.value).toLocaleString()} tCO2e
                          </p>
                        );
                      })}
                    </div>
                  );
                }}
              />
              {metric === "total"
                ? selectedYears.flatMap((yr, yi) => [
                    <Bar
                      key={`s1_${yr}`}
                      dataKey={`s1_${yr}`}
                      stackId={`stack_${yr}`}
                      name={`${yr} Scope 1`}
                      radius={[0, 0, 0, 0]}
                    >
                      {chartData.map((row, i) => (
                        <Cell key={i} fill={row.colorDark} fillOpacity={1 - yi * 0.2} />
                      ))}
                    </Bar>,
                    <Bar
                      key={`s2_${yr}`}
                      dataKey={`s2_${yr}`}
                      stackId={`stack_${yr}`}
                      name={`${yr} Scope 2`}
                      radius={[4, 4, 0, 0]}
                    >
                      {chartData.map((row, i) => (
                        <Cell key={i} fill={row.colorLight} fillOpacity={1 - yi * 0.2} />
                      ))}
                    </Bar>,
                  ])
                : selectedYears.map((yr, yi) => (
                    <Bar
                      key={`val_${yr}`}
                      dataKey={`val_${yr}`}
                      name={String(yr)}
                      radius={[4, 4, 0, 0]}
                    >
                      {chartData.map((row, i) => (
                        <Cell
                          key={i}
                          fill={metric === "scope1" ? row.colorDark : row.colorLight}
                          fillOpacity={1 - yi * 0.2}
                        />
                      ))}
                    </Bar>
                  ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
          {selectedYears.map((yr, yi) => (
            <div key={yr} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-foreground" style={{ opacity: 1 - yi * 0.2 }} />
              {yr}
            </div>
          ))}
          <span className="mx-1">|</span>
          {Object.entries(SECTOR_CONFIG)
            .filter(([s]) => activeSectors.has(s))
            .map(([name, cfg]) => (
              <div key={name} className="flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: cfg.colorDark }} />
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: cfg.colorLight }} />
                </div>
                {name}
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AbsoluteEmissionsSection;
