import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { SECTOR_CONFIG, getCompanySector } from "@/config/sectors";

const companies = Object.values(SECTOR_CONFIG).flatMap((cfg) =>
  cfg.companies.map((c) => ({ company: c, sector: getCompanySector(c) ?? "" }))
);

const COLUMNS = [
  "Rank",
  "Company",
  "Sector",
  "Avg Emissions Score",
  "Emission Trend Score",
  "Credibility Score",
  "Overall Score",
  "Recommendation",
];

const LeaderboardPlaceholder = () => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-lg">Financing Recommendation Leaderboard</CardTitle>
      <CardDescription>
        Composite scoring based on emission performance, relative change, and credibility
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
          {companies.map((c, i) => (
            <TableRow key={c.company}>
              <TableCell>{i + 1}</TableCell>
              <TableCell className="font-medium">{c.company}</TableCell>
              <TableCell>{c.sector}</TableCell>
              <TableCell className="text-center">—</TableCell>
              <TableCell className="text-center">—</TableCell>
              <TableCell className="text-center">—</TableCell>
              <TableCell className="text-center">—</TableCell>
              <TableCell className="text-center">—</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);

export default LeaderboardPlaceholder;
