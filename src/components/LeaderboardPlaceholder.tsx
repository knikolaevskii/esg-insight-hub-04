import { useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SECTOR_CONFIG, getCompanySector } from "@/config/sectors";
import esgData from "@/data/esg_data.json";
import type { EsgEntry, EsgData } from "@/types/esg";

interface Props {
  data: EsgEntry[];
}

const COLUMNS = [
  "Rank",
  "Company",
  "Sector",
  "Avg Emissions Score",
  "Emission Trend Score",
  "Target Score",
  "Overall Score",
  "Recommendation",
];

function getNetZeroTargets(): Record<string, number | null> {
  const d = esgData as EsgData;
  const result: Record<string, number | null> = {};
  for (const company of d.companies) {
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

function targetYearToScore(year: number | null): number {
  if (year == null) return 0;
  if (year <= 2040) return 10;
  if (year <= 2045) return 7.5;
  if (year <= 2050) return 5;
  return 2.5;
}

interface CompanyScore {
  company: string;
  sector: string;
  emissionsScore: number;
  trendScore: number;
  targetScore: number;
  overallScore: number;
  recommendation: string;
  hasPenalty: boolean;
}

const LeaderboardPlaceholder = ({ data }: Props) => {
  const rows = useMemo(() => {
    const companies = Object.values(SECTOR_CONFIG).flatMap((cfg) =>
      cfg.companies.map((c) => c)
    );
    const netZeroTargets = getNetZeroTargets();

    const rawValues = companies.map((company) => {
      const entries = data.filter((d) => d.company === company);

      const avgEmissions =
        entries.reduce(
          (s, e) =>
            s + (e.scope1?.value ?? 0) + (e.scope2_market?.value ?? 0),
          0
        ) / (entries.length || 1);

      const sorted = [...entries].sort(
        (a, b) => a.reporting_year - b.reporting_year
      );
      const firstTotal =
        (sorted[0]?.scope1?.value ?? 0) + (sorted[0]?.scope2_market?.value ?? 0);
      const lastTotal =
        (sorted[sorted.length - 1]?.scope1?.value ?? 0) +
        (sorted[sorted.length - 1]?.scope2_market?.value ?? 0);
      const pctChange =
        firstTotal > 0 ? ((lastTotal - firstTotal) / firstTotal) * 100 : 0;

      // Credibility component: avg credibility_score normalized to 0-10
      const credEntries = entries.filter((e) => e.credibility);
      const avgCredScore =
        credEntries.length > 0
          ? credEntries.reduce((s, e) => s + (e.credibility!.credibility_score ?? 1), 0) /
            credEntries.length
          : 1;
      const credibilityComponent = ((avgCredScore - 1) / 2) * 10;

      // Target year component
      const targetYearComponent = targetYearToScore(netZeroTargets[company] ?? null);

      return {
        company,
        sector: getCompanySector(company) ?? "",
        avgEmissions,
        pctChange,
        credibilityComponent,
        targetYearComponent,
      };
    });

    const allEmissions = rawValues.map((r) => r.avgEmissions);
    const minEmissions = Math.min(...allEmissions);
    const maxEmissions = Math.max(...allEmissions);
    const emissionsRange = maxEmissions - minEmissions || 1;

    const allChanges = rawValues.map((r) => r.pctChange);
    const minChange = Math.min(...allChanges);
    const maxChange = Math.max(...allChanges);
    const changeRange = maxChange - minChange || 1;

    const scored: CompanyScore[] = rawValues.map((r) => {
      const emissionsScore =
        ((maxEmissions - r.avgEmissions) / emissionsRange) * 10;
      const trendScore = ((maxChange - r.pctChange) / changeRange) * 10;
      const targetScore = r.credibilityComponent * 0.5 + r.targetYearComponent * 0.5;

      let overallScore =
        emissionsScore * 0.2 + trendScore * 0.5 + targetScore * 0.3;

      const hasPenalty = r.company === "Amazon";
      if (hasPenalty) {
        overallScore = Math.max(0, overallScore - 0.5);
      }

      let recommendation: string;
      if (overallScore >= 5.0) recommendation = "Finance";
      else if (overallScore >= 3.65) recommendation = "Monitor";
      else recommendation = "Avoid";

      return {
        company: r.company,
        sector: r.sector,
        emissionsScore: Math.round(emissionsScore * 10) / 10,
        trendScore: Math.round(trendScore * 10) / 10,
        targetScore: Math.round(targetScore * 10) / 10,
        overallScore: Math.round(overallScore * 10) / 10,
        recommendation,
        hasPenalty,
      };
    });

    scored.sort((a, b) => b.overallScore - a.overallScore);
    return scored;
  }, [data]);

  const badgeStyle = (rec: string) => {
    switch (rec) {
      case "Finance":
        return "bg-green-100 text-green-800 border-green-300 hover:bg-green-100";
      case "Monitor":
        return "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100";
      case "Avoid":
        return "bg-red-100 text-red-800 border-red-300 hover:bg-red-100";
      default:
        return "";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">
          Financing Recommendation Leaderboard
        </CardTitle>
        <CardDescription>
          Composite scoring — Emissions 20%, Trend 50%, Target 30%
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((col) => (
                <TableHead key={col}>{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={r.company}>
                <TableCell>{i + 1}</TableCell>
                <TableCell className="font-medium">{r.company}</TableCell>
                <TableCell>{r.sector}</TableCell>
                <TableCell className="text-center">
                  {r.emissionsScore.toFixed(1)}
                </TableCell>
                <TableCell className="text-center">
                  {r.trendScore.toFixed(1)}
                </TableCell>
                <TableCell className="text-center">
                  {r.targetScore.toFixed(1)}
                </TableCell>
                <TableCell className="text-center font-semibold">
                  {r.overallScore.toFixed(1)}{r.hasPenalty && " *"}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={badgeStyle(r.recommendation)}>
                    {r.recommendation}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-[11px] text-muted-foreground mt-3">
          * Score adjusted: Amazon lacked external assurance in 2021 (-0.5 penalty)
        </p>
      </CardContent>
    </Card>
  );
};

export default LeaderboardPlaceholder;
