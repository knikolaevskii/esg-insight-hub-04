export const SECTOR_CONFIG: Record<string, string[]> = {
  "Energy & Utilities": ["BP", "ENGIE", "SSE", "Shell"],
  "Technology": ["Amazon", "Intel"],
  "Consumer Goods": ["Coca Cola", "Nestle"],
};

export function getCompanySector(company: string): string | undefined {
  for (const [sector, companies] of Object.entries(SECTOR_CONFIG)) {
    if (companies.includes(company)) return sector;
  }
  return undefined;
}
