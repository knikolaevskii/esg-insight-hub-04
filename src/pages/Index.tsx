import { useState } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import EmissionsChart from "@/components/EmissionsChart";
import YoYChangeChart from "@/components/YoYChangeChart";
import esgData from "@/data/esg_data.json";
import type { EsgEntry } from "@/types/esg";

const data = esgData as EsgEntry[];

const Index = () => {
  const [mode, setMode] = useState<"overview" | "detailed">("overview");

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader mode={mode} onModeChange={setMode} />
      <main className="max-w-7xl mx-auto px-8 py-8">
        {mode === "overview" ? (
          <div className="grid gap-8">
            <EmissionsChart data={data} />
            <YoYChangeChart data={data} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-lg text-muted-foreground">
              Detailed Report — coming soon
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
