export interface SectorInfo {
  companies: string[];
  color: string;       // darker shade (Scope 1)
  colorLight: string;  // lighter shade (Scope 2)
}

export const SECTOR_CONFIG: Record<string, SectorInfo> = {
  "Energy & Utilities": {
    companies: ["BP", "ENGIE", "SSE", "Shell"],
    color: "hsl(24, 100%, 50%)",       // ING orange
    colorLight: "hsl(24, 100%, 75%)",
  },
  "Technology": {
    companies: ["Amazon", "Intel"],
    color: "hsl(210, 70%, 45%)",
    colorLight: "hsl(210, 70%, 72%)",
  },
  "Consumer Goods": {
    companies: ["Coca Cola", "Nestle"],
    color: "hsl(160, 55%, 40%)",
    colorLight: "hsl(160, 55%, 68%)",
  },
};

// Line styles for distinguishing companies within the same sector
export const LINE_STYLES: Array<{ strokeDasharray: string; label: string }> = [
  { strokeDasharray: "0", label: "solid" },
  { strokeDasharray: "8 4", label: "dashed" },
  { strokeDasharray: "2 3", label: "dotted" },
  { strokeDasharray: "12 4 2 4", label: "dash-dot" },
];

export function getCompanySector(company: string): string | undefined {
  for (const [sector, info] of Object.entries(SECTOR_CONFIG)) {
    if (info.companies.includes(company)) return sector;
  }
  return undefined;
}
