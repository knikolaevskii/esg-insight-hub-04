import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface DashboardHeaderProps {
  mode: "overview" | "detailed";
  onModeChange: (mode: "overview" | "detailed") => void;
}

const DashboardHeader = ({ mode, onModeChange }: DashboardHeaderProps) => {
  return (
    <header className="border-b bg-card px-8 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-ing-orange" />
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            ESG Climate Dashboard
          </h1>
        </div>
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v) => v && onModeChange(v as "overview" | "detailed")}
          className="bg-muted rounded-lg p-1"
        >
          <ToggleGroupItem
            value="overview"
            className="px-4 py-1.5 text-sm font-medium data-[state=on]:bg-ing-orange data-[state=on]:text-white rounded-md"
          >
            Overview
          </ToggleGroupItem>
          <ToggleGroupItem
            value="detailed"
            className="px-4 py-1.5 text-sm font-medium data-[state=on]:bg-ing-orange data-[state=on]:text-white rounded-md"
          >
            Detailed Report
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </header>
  );
};

export default DashboardHeader;
