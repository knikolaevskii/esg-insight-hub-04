import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SECTOR_CONFIG } from "@/config/sectors";
import type { EsgEntry } from "@/types/esg";

interface Props {
  data: EsgEntry[];
}

/** Safely read a numeric value, treating null/undefined as null */
const safeVal = (v: number | null | undefined): number | null =>
  v != null && isFinite(v) ? v : null;

/** Get total emissions for an entry, returns null if both scopes are null */
const getTotal = (entry: EsgEntry): number | null => {
  const s1 = safeVal(entry.scope1?.value);
  const s2 = safeVal(entry.scope2_market?.value);
  if (s1 === null && s2 === null) return null;
  return (s1 ?? 0) + (s2 ?? 0);
};

const YoYChangeChart = ({ data }: Props) => {
  const years = useMemo(
    () => [...new Set(data.map((d) => d.reporting_year))].sort(),
    [data]
  );

  const baseYear = years[0];

  const { chartData, companies, minVal, maxVal, partialPoints } = useMemo(() => {
    const allCompanies: {
      name: string;
      sector: string;
      color: string;
      dash: string;
    }[] = [];
    for (const [sector, cfg] of Object.entries(SECTOR_CONFIG)) {
      cfg.companies.forEach((c, i) => {
        if (data.some((d) => d.company === c)) {
          allCompanies.push({
            name: c,
            sector,
            color: cfg.colorDark,
            dash: cfg.lineStyles[i] || "",
          });
        }
      });
    }

    // Compute baseline totals (only from non-null data)
    const baselines = new Map<string, number>();
    const partials = new Set<string>(); // "company|year" keys with partial data
    for (const c of allCompanies) {
      const entry = data.find(
        (d) => d.company === c.name && d.reporting_year === baseYear
      );
      if (entry) {
        const total = getTotal(entry);
        if (total !== null) {
          baselines.set(c.name, total);
          // Check if baseline is partial (one scope null)
          const s1 = safeVal(entry.scope1?.value);
          const s2 = safeVal(entry.scope2_market?.value);
          if (s1 === null || s2 === null) {
            partials.add(`${c.name}|${baseYear}`);
          }
        }
      }
    }

    let min = 0;
    let max = 0;
    const rows = years.map((year) => {
      const row: Record<string, number | string> = { year };
      for (const c of allCompanies) {
        const baseline = baselines.get(c.name);
        const entry = data.find(
          (d) => d.company === c.name && d.reporting_year === year
        );
        if (baseline && entry) {
          const total = getTotal(entry);
          if (total !== null) {
            const pct =
              Math.round(((total - baseline) / baseline) * 1000) / 10;
            row[c.name] = pct;
            if (pct < min) min = pct;
            if (pct > max) max = pct;
            // Track partial points
            const s1 = safeVal(entry.scope1?.value);
            const s2 = safeVal(entry.scope2_market?.value);
            if (s1 === null || s2 === null) {
              partials.add(`${c.name}|${year}`);
            }
          }
        }
      }
      return row;
    });

    return {
      chartData: rows,
      companies: allCompanies,
      minVal: min,
      maxVal: max,
      partialPoints: partials,
    };
  }, [data, years, baseYear]);

  const range = maxVal - minVal || 10;
  const yMin = Math.floor(minVal - range * 0.1);
  const yMax = Math.ceil(maxVal + range * 0.1);

  const sectorGroups = useMemo(() => {
    const map = new Map<string, typeof companies>();
    for (const c of companies) {
      const list = map.get(c.sector) ?? [];
      list.push(c);
      map.set(c.sector, list);
    }
    return Array.from(map.entries());
  }, [companies]);

  const [activeSectors, setActiveSectors] = useState<Set<string>>(
    () => new Set(Object.keys(SECTOR_CONFIG))
  );

  const toggleSector = (sector: string) => {
    setActiveSectors((prev) => {
      const next = new Set(prev);
      if (next.has(sector)) next.delete(sector);
      else next.add(sector);
      return next;
    });
  };

  const visibleCompanies = companies.filter((c) => activeSectors.has(c.sector));

  const hasPartialData = partialPoints.size > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">
          Relative Emission Change vs {baseYear}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Sector filter buttons */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {Object.entries(SECTOR_CONFIG).map(([sector, cfg]) => {
            const active = activeSectors.has(sector);
            return (
              <button
                key={sector}
                onClick={() => toggleSector(sector)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors border"
                style={{
                  backgroundColor: active ? cfg.colorDark : "transparent",
                  color: active ? "#fff" : "hsl(var(--muted-foreground))",
                  borderColor: active ? cfg.colorDark : "hsl(var(--border))",
                  opacity: active ? 1 : 0.5,
                }}
              >
                {sector}
              </button>
            );
          })}
        </div>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <ReferenceArea
                y1={0}
                y2={yMax}
                fill="#fee2e2"
                fillOpacity={0.5}
                label={{
                  value: "Increasing emissions",
                  position: "insideTopRight",
                  style: { fontSize: 10, fill: "#dc2626" },
                }}
              />
              <ReferenceArea
                y1={yMin}
                y2={0}
                fill="#dcfce7"
                fillOpacity={0.5}
                label={{
                  value: "Decreasing emissions",
                  position: "insideBottomRight",
                  style: { fontSize: 10, fill: "#16a34a" },
                }}
              />
              <ReferenceLine y={0} stroke="hsl(var(--foreground))" strokeWidth={1.5} />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis
                domain={[yMin, yMax]}
                tickFormatter={(v) => `${v}%`}
                label={{
                  value: `Change in Emissions vs ${baseYear} (%)`,
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
                }}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  // Find which year this tooltip is for
                  const suffix = partialPoints.size > 0 ? " †" : "";
                  return [`${value.toFixed(1)}%`, name];
                }}
                labelFormatter={(year: number) => {
                  // Check if any visible company has partial data for this year
                  const partialCompanies = visibleCompanies
                    .filter((c) => partialPoints.has(`${c.name}|${year}`))
                    .map((c) => c.name);
                  if (partialCompanies.length > 0) {
                    return `${year} (partial data for: ${partialCompanies.join(", ")})`;
                  }
                  return String(year);
                }}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  fontSize: 12,
                }}
              />
              {visibleCompanies.map((c) => (
                <Line
                  key={c.name}
                  type="linear"
                  dataKey={c.name}
                  stroke={c.color}
                  strokeDasharray={c.dash}
                  strokeWidth={2}
                  dot={(dotProps: any) => {
                    const { cx, cy, payload } = dotProps;
                    if (cx == null || cy == null) return <></>;
                    const year = payload?.year;
                    const isPartial = partialPoints.has(`${c.name}|${year}`);
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isPartial ? 5 : 4}
                        fill={isPartial ? "transparent" : c.color}
                        stroke={c.color}
                        strokeWidth={isPartial ? 2 : 0}
                      />
                    );
                  }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {/* Custom legend */}
        <div className="flex items-center justify-center gap-8 mt-4 text-xs text-muted-foreground flex-wrap">
          {sectorGroups.map(([sector, comps]) => (
            <div key={sector} className="flex flex-col gap-1">
              <span className="font-semibold uppercase tracking-wide text-[10px]">
                {sector}
              </span>
              <div className="flex gap-3">
                {comps.map((c) => (
                  <div key={c.name} className="flex items-center gap-1.5">
                    <svg width="20" height="3">
                      <line
                        x1="0"
                        y1="1.5"
                        x2="20"
                        y2="1.5"
                        stroke={c.color}
                        strokeWidth="2"
                        strokeDasharray={c.dash}
                      />
                    </svg>
                    {c.name}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {hasPartialData && (
          <p className="text-center text-[11px] text-muted-foreground mt-2">
            Open circles (○) indicate data points where only one emission scope was available.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default YoYChangeChart;
