import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { SECTOR_CONFIG } from "@/config/sectors";
import type { EsgEntry, Credibility } from "@/types/esg";
import SectorFilter from "./SectorFilter";

interface Props {
  data: EsgEntry[];
}

type CredMetric = "credibility_score" | "alignment" | "realism";

const METRIC_OPTIONS: { value: CredMetric; label: string }[] = [
  { value: "credibility_score", label: "Credibility Score (1-3)" },
  { value: "alignment", label: "Alignment (1-3)" },
  { value: "realism", label: "Realism (1-3)" },
];

/** Map score 1–3 to a color: 1=red, 2=amber, 3=green */
const scoreColor = (score: number): string => {
  if (score <= 1.33) return "hsl(0, 72%, 51%)";      // red
  if (score <= 1.67) return "hsl(15, 80%, 50%)";      // red-orange
  if (score <= 2.0) return "hsl(38, 92%, 50%)";       // amber
  if (score <= 2.33) return "hsl(48, 96%, 50%)";      // yellow-amber
  if (score <= 2.67) return "hsl(80, 60%, 45%)";      // yellow-green
  return "hsl(142, 71%, 40%)";                         // green
};

const textColor = (score: number): string => {
  if (score <= 1.33) return "#fff";
  if (score <= 2.0) return "#000";
  if (score <= 2.67) return "#000";
  return "#fff";
};

const CredibilityHeatmapSection = ({ data }: Props) => {
  const allSectors = useMemo(() => Object.keys(SECTOR_CONFIG), []);
  const allYears = useMemo(
    () => [...new Set(data.map((d) => d.reporting_year))].sort(),
    [data]
  );
  const [activeSectors, setActiveSectors] = useState<Set<string>>(() => new Set(allSectors));
  const [metric, setMetric] = useState<CredMetric>("credibility_score");

  const toggleSector = (sector: string) => {
    setActiveSectors((prev) => {
      const next = new Set(prev);
      if (next.has(sector)) {
        if (next.size > 1) next.delete(sector);
      } else next.add(sector);
      return next;
    });
  };

  // Build lookup: company → year → credibility
  const lookup = useMemo(() => {
    const map = new Map<string, Map<number, Credibility>>();
    for (const entry of data) {
      if (!entry.credibility) continue;
      const byYear = map.get(entry.company) ?? new Map<number, Credibility>();
      byYear.set(entry.reporting_year, entry.credibility);
      map.set(entry.company, byYear);
    }
    return map;
  }, [data]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Credibility Scores</CardTitle>
        <CardDescription>
          Per-company, per-year credibility metrics (scale 1–3)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <ToggleGroup
            type="single"
            value={metric}
            onValueChange={(v) => v && setMetric(v as CredMetric)}
            className="bg-muted rounded-lg p-1"
          >
            {METRIC_OPTIONS.map((opt) => (
              <ToggleGroupItem
                key={opt.value}
                value={opt.value}
                className="px-3 py-1 text-xs font-medium data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-md"
              >
                {opt.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <SectorFilter activeSectors={activeSectors} onToggle={toggleSector} />
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Company</th>
                {allYears.map((yr) => (
                  <th key={yr} className="text-center py-2 px-3 font-medium text-muted-foreground w-24">
                    {yr}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(SECTOR_CONFIG)
                .filter(([sector]) => activeSectors.has(sector))
                .map(([sector, cfg]) => (
                  <SectorGroup
                    key={sector}
                    sector={sector}
                    companies={cfg.companies}
                    years={allYears}
                    metric={metric}
                    lookup={lookup}
                  />
                ))}
            </tbody>
          </table>
        </div>

        {/* Gradient legend */}
        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
          <span>1 (Low)</span>
          <div className="flex h-3 rounded overflow-hidden">
            {[1, 1.5, 2, 2.5, 3].map((v) => (
              <div key={v} className="w-8" style={{ backgroundColor: scoreColor(v) }} />
            ))}
          </div>
          <span>3 (High)</span>
        </div>
      </CardContent>
    </Card>
  );
};

interface SectorGroupProps {
  sector: string;
  companies: string[];
  years: number[];
  metric: CredMetric;
  lookup: Map<string, Map<number, Credibility>>;
}

const SectorGroup = ({ sector, companies, years, metric, lookup }: SectorGroupProps) => (
  <>
    <tr>
      <td
        colSpan={years.length + 1}
        className="py-2 px-3 text-xs font-semibold text-muted-foreground bg-muted/50 uppercase tracking-wider"
      >
        {sector}
      </td>
    </tr>
    {companies.map((company) => {
      const byYear = lookup.get(company);
      return (
        <tr key={company} className="border-b border-border/50">
          <td className="py-2 px-3 font-medium text-sm">{company}</td>
          {years.map((yr) => {
            const cred = byYear?.get(yr);
            const val = cred?.[metric] ?? null;
            if (val === null) {
              return (
                <td key={yr} className="text-center py-2 px-3 text-muted-foreground">
                  —
                </td>
              );
            }
            return (
              <td key={yr} className="text-center py-1 px-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="inline-flex items-center justify-center w-14 h-8 rounded font-semibold text-sm cursor-default"
                      style={{
                        backgroundColor: scoreColor(val),
                        color: textColor(val),
                      }}
                    >
                      {val.toFixed(1)}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      {company} — {yr}
                      <br />
                      Credibility: {cred!.credibility_score.toFixed(1)}
                      <br />
                      Alignment: {cred!.alignment.toFixed(1)}
                      <br />
                      Realism: {cred!.realism.toFixed(1)}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </td>
            );
          })}
        </tr>
      );
    })}
  </>
);

export default CredibilityHeatmapSection;
