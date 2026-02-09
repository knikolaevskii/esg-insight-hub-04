import { useState } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import EmissionsChart from "@/components/EmissionsChart";
import YoYChangeChart from "@/components/YoYChangeChart";
import CredibilityChart from "@/components/CredibilityChart";
import NetZeroChart from "@/components/NetZeroChart";
import LeaderboardPlaceholder from "@/components/LeaderboardPlaceholder";
import AbsoluteEmissionsSection from "@/components/detailed/AbsoluteEmissionsSection";
import RelativeChangeSection from "@/components/detailed/RelativeChangeSection";
import CredibilityHeatmapSection from "@/components/detailed/CredibilityHeatmapSection";
import esgData from "@/data/esg_data.json";
import type { EsgData } from "@/types/esg";

const data = (esgData as EsgData).companies.flatMap((c) => c.years);

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
            <NetZeroChart />
            <CredibilityChart data={data} />
            <LeaderboardPlaceholder data={data} />
          </div>
        ) : (
          <div className="grid gap-8">
            <AbsoluteEmissionsSection data={data} />
            <RelativeChangeSection data={data} />
            <CredibilityHeatmapSection data={data} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
