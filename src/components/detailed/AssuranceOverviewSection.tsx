import { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { SECTOR_CONFIG } from "@/config/sectors";
import type { EsgEntry } from "@/types/esg";

interface Props {
  data: EsgEntry[];
}

const YEARS = [2021, 2022, 2023];

const AssuranceOverviewSection = ({ data }: Props) => {
  const lookup = useMemo(() => {
    const map = new Map<string, Map<number, boolean>>();
    for (const entry of data) {
      const byYear = map.get(entry.company) ?? new Map<number, boolean>();
      byYear.set(entry.reporting_year, entry.assurance);
      map.set(entry.company, byYear);
    }
    return map;
  }, [data]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Assurance Overview</CardTitle>
        <CardDescription>
          External assurance status per company and reporting year
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Company</th>
                {YEARS.map((yr) => (
                  <th key={yr} className="text-center py-2 px-3 font-medium text-muted-foreground w-20">
                    {yr}
                  </th>
                ))}
                <th className="text-center py-2 px-3 font-medium text-muted-foreground w-20">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(SECTOR_CONFIG).map(([sector, cfg]) => (
                <SectorGroup
                  key={sector}
                  sector={sector}
                  companies={cfg.companies}
                  lookup={lookup}
                />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

interface SectorGroupProps {
  sector: string;
  companies: string[];
  lookup: Map<string, Map<number, boolean>>;
}

const SectorGroup = ({ sector, companies, lookup }: SectorGroupProps) => (
  <>
    <tr>
      <td
        colSpan={YEARS.length + 2}
        className="py-2 px-3 text-xs font-semibold text-muted-foreground bg-muted/50 uppercase tracking-wider"
      >
        {sector}
      </td>
    </tr>
    {companies.map((company) => {
      const byYear = lookup.get(company);
      const assuredCount = YEARS.filter((yr) => byYear?.get(yr) === true).length;
      return (
        <tr key={company} className="border-b border-border/50">
          <td className="py-2 px-3 font-medium text-sm">{company}</td>
          {YEARS.map((yr) => {
            const assured = byYear?.get(yr);
            return (
              <td key={yr} className="text-center py-2 px-3">
                {assured === true ? (
                  <span className="text-green-600 font-bold text-base">✓</span>
                ) : (
                  <span className="text-red-500 font-bold text-base">✗</span>
                )}
              </td>
            );
          })}
          <td className="text-center py-2 px-3 font-semibold text-sm">
            {assuredCount}/{YEARS.length}
          </td>
        </tr>
      );
    })}
  </>
);

export default AssuranceOverviewSection;
