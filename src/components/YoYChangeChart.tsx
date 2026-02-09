import { useMemo } from "react";
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
  Legend,
} from "recharts";
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

  const baseYear = years[0];

  // Build { year, [company]: pctChange } rows
  const { chartData, companies, minVal, maxVal } = useMemo(() => {
    // Collect all companies in sector order
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

    // Compute baseline totals
    const baselines = new Map<string, number>();
    for (const c of allCompanies) {
      const entry = data.find(
        (d) => d.company === c.name && d.reporting_year === baseYear
      );
      if (entry) {
        baselines.set(c.name, entry.scope1.value + entry.scope2_market.value);
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
          const total = entry.scope1.value + entry.scope2_market.value;
          const pct =
            Math.round(((total - baseline) / baseline) * 1000) / 10;
          row[c.name] = pct;
          if (pct < min) min = pct;
          if (pct > max) max = pct;
        }
      }
      return row;
    });

    return { chartData: rows, companies: allCompanies, minVal: min, maxVal: max };
  }, [data, years, baseYear]);

  // Pad axis by ~10%
  const range = maxVal - minVal || 10;
  const yMin = Math.floor(minVal - range * 0.1);
  const yMax = Math.ceil(maxVal + range * 0.1);

  // Group companies by sector for legend
  const sectorGroups = useMemo(() => {
    const map = new Map<string, typeof companies>();
    for (const c of companies) {
      const list = map.get(c.sector) ?? [];
      list.push(c);
      map.set(c.sector, list);
    }
    return Array.from(map.entries());
  }, [companies]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">
          Relative Emission Change vs {baseYear}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              {/* Shaded zones */}
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
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)}%`,
                  name,
                ]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  fontSize: 12,
                }}
              />
              {companies.map((c) => (
                <Line
                  key={c.name}
                  type="monotone"
                  dataKey={c.name}
                  stroke={c.color}
                  strokeDasharray={c.dash}
                  strokeWidth={2}
                  dot={{ r: 4, fill: c.color }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {/* Custom legend grouped by sector */}
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
      </CardContent>
    </Card>
  );
};

export default YoYChangeChart;
