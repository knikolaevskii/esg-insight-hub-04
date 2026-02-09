export interface SectorStyle {
  companies: string[];
  colorDark: string;   // Scope 1 (darker shade)
  colorLight: string;  // Scope 2 (lighter shade)
  lineStyles: string[]; // dash arrays per company: "" = solid, "5 5" = dashed, "2 2" = dotted
}

export const SECTOR_CONFIG: Record<string, SectorStyle> = {
  "Energy & Utilities": {
    companies: ["BP", "ENGIE", "SSE", "Shell"],
    colorDark: "#c2410c",
    colorLight: "#fdba74",
    lineStyles: ["", "5 5", "2 2", "8 3 2 3"],
  },
  Technology: {
    companies: ["Amazon", "Intel"],
    colorDark: "#1d4ed8",
    colorLight: "#93c5fd",
    lineStyles: ["", "5 5"],
  },
  "Consumer Goods": {
    companies: ["Coca-Cola", "Nestle"],
    colorDark: "#15803d",
    colorLight: "#86efac",
    lineStyles: ["", "5 5"],
  },
};

export function getCompanySector(company: string): string | undefined {
  for (const [sector, cfg] of Object.entries(SECTOR_CONFIG)) {
    if (cfg.companies.includes(company)) return sector;
  }
  return undefined;
}
