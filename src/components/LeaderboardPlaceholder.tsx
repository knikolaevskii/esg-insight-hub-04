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
import type { EsgEntry } from "@/types/esg";

interface Props {
  data: EsgEntry[];
}

const COLUMNS = [
  "Rank",
  "Company",
  "Sector",
  "Avg Emissions Score",
  "Emission Trend Score",
  "Realism Score",
  "Overall Score",
  "Recommendation",
];

interface CompanyScore {
  company: string;
  sector: string;
  emissionsScore: number;
  trendScore: number;
  realismScore: number;
  overallScore: number;
  recommendation: string;
}

const LeaderboardPlaceholder = ({ data }: Props) => {
  const rows = useMemo(() => {
    const companies = Object.values(SECTOR_CONFIG).flatMap((cfg) =>
      cfg.companies.map((c) => c)
    );

    // Step 1: Compute raw values per company
    const rawValues = companies.map((company) => {
      const entries = data.filter((d) => d.company === company);

      // Avg total emissions across years
      const avgEmissions =
        entries.reduce(
          (s, e) =>
            s +
            (e.scope1?.value ?? 0) +
            (e.scope2_market?.value ?? 0),
          0
        ) / (entries.length || 1);

      // Trend: % change from first to last year
      const sorted = [...entries].sort(
        (a, b) => a.reporting_year - b.reporting_year
      );
      const firstTotal =
        (sorted[0]?.scope1?.value ?? 0) +
        (sorted[0]?.scope2_market?.value ?? 0);
      const lastTotal =
        (sorted[sorted.length - 1]?.scope1?.value ?? 0) +
        (sorted[sorted.length - 1]?.scope2_market?.value ?? 0);
      const pctChange =
        firstTotal > 0 ? ((lastTotal - firstTotal) / firstTotal) * 100 : 0;

      // Avg realism across years
      const credEntries = entries.filter((e) => e.credibility);
      const avgRealism =
        credEntries.length > 0
          ? credEntries.reduce(
              (s, e) => s + e.credibility!.realism,
              0
            ) / credEntries.length
          : 1;

      return {
        company,
        sector: getCompanySector(company) ?? "",
        avgEmissions,
        pctChange,
        avgRealism,
      };
    });

    // Step 2: Find min/max for normalization
    const allEmissions = rawValues.map((r) => r.avgEmissions);
    const minEmissions = Math.min(...allEmissions);
    const maxEmissions = Math.max(...allEmissions);
    const emissionsRange = maxEmissions - minEmissions || 1;

    const allChanges = rawValues.map((r) => r.pctChange);
    const minChange = Math.min(...allChanges);
    const maxChange = Math.max(...allChanges);
    const changeRange = maxChange - minChange || 1;

    // Step 3: Normalize and compute overall
    const scored: CompanyScore[] = rawValues.map((r) => {
      // Lowest emissions = 10
      const emissionsScore =
        ((maxEmissions - r.avgEmissions) / emissionsRange) * 10;

      // Biggest decrease = 10 (most negative pctChange = best)
      const trendScore = ((maxChange - r.pctChange) / changeRange) * 10;

      // Realism 1-3 → 0-10
      const realismScore = ((r.avgRealism - 1) / 2) * 10;

      const overallScore =
        emissionsScore * 0.3 + trendScore * 0.4 + realismScore * 0.3;

      let recommendation: string;
      if (overallScore >= 6.0) recommendation = "Finance";
      else if (overallScore >= 4.0) recommendation = "Monitor";
      else recommendation = "Avoid";

      return {
        company: r.company,
        sector: r.sector,
        emissionsScore: Math.round(emissionsScore * 10) / 10,
        trendScore: Math.round(trendScore * 10) / 10,
        realismScore: Math.round(realismScore * 10) / 10,
        overallScore: Math.round(overallScore * 10) / 10,
        recommendation,
      };
    });

    // Sort descending by overall score
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
          Composite scoring — Emissions 30%, Trend 40%, Credibility 30%
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
                  {r.realismScore.toFixed(1)}
                </TableCell>
                <TableCell className="text-center font-semibold">
                  {r.overallScore.toFixed(1)}
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
      </CardContent>
    </Card>
  );
};

export default LeaderboardPlaceholder;
