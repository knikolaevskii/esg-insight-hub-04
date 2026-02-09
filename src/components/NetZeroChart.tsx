import { useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SECTOR_CONFIG } from "@/config/sectors";
import esgData from "@/data/esg_data.json";
import type { EsgData } from "@/types/esg";

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

function getAmbitionLabel(year: number | null): { text: string; className: string } {
  if (year == null) return { text: "None", className: "bg-red-100 text-red-700 border-red-200" };
  if (year <= 2040) return { text: "Ambitious", className: "bg-green-100 text-green-700 border-green-200" };
  if (year <= 2045) return { text: "Moderate", className: "bg-amber-100 text-amber-700 border-amber-200" };
  return { text: "Standard", className: "bg-gray-100 text-gray-600 border-gray-200" };
}

interface Row {
  company: string;
  targetYear: number | null;
  sectorColor: string;
}

const NetZeroChart = () => {
  const rows = useMemo(() => {
    const targets = getNetZeroTargets();
    const items: Row[] = [];

    for (const [, cfg] of Object.entries(SECTOR_CONFIG)) {
      for (const company of cfg.companies) {
        items.push({
          company,
          targetYear: targets[company] ?? null,
          sectorColor: cfg.colorDark,
        });
      }
    }

    items.sort((a, b) => {
      if (a.targetYear == null && b.targetYear == null) return 0;
      if (a.targetYear == null) return 1;
      if (b.targetYear == null) return -1;
      return a.targetYear - b.targetYear;
    });

    return items;
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Net-Zero Target Year</CardTitle>
        <CardDescription>
          Declared net-zero target year per company, sorted by ambition
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border">
          {rows.map((row) => {
            const ambition = getAmbitionLabel(row.targetYear);
            return (
              <div
                key={row.company}
                className="flex items-center justify-between py-2.5 px-1"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: row.sectorColor }}
                  />
                  <span className="text-sm font-medium">{row.company}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="text-lg font-bold tabular-nums"
                    style={{ color: row.targetYear ? row.sectorColor : "hsl(var(--muted-foreground))" }}
                  >
                    {row.targetYear ?? "—"}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-2 py-0 leading-5 ${ambition.className}`}
                  >
                    {ambition.text}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>

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
        </div>
      </CardContent>
    </Card>
  );
};

export default NetZeroChart;
