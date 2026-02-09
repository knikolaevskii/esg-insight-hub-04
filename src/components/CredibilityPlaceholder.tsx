import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const CredibilityPlaceholder = () => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-lg">Credibility Assessment</CardTitle>
      <CardDescription>
        Evaluating target ambition, assurance coverage, and action plan quality
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="h-[350px] flex items-center justify-center">
        <p className="text-muted-foreground text-sm">
          Coming soon — analysis in progress
        </p>
      </div>
    </CardContent>
  </Card>
);

export default CredibilityPlaceholder;
