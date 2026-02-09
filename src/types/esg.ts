export interface EsgTarget {
  description: string;
  pct_reduction: number | null;
  target_year: number | null;
  base_year: number | null;
  scope: string;
}

export interface EsgEntry {
  company: string;
  reporting_year: number;
  scope1: { value: number; unit: string };
  scope2_market: { value: number; unit: string };
  assurance: boolean;
  assurance_notes: string;
  targets: EsgTarget[];
  action_plans: string;
  source_file: string;
}

export interface EsgCompany {
  company: string;
  years: EsgEntry[];
}

export interface EsgData {
  metadata: {
    generated_at: string;
    total_companies: number;
    total_records: number;
    source_directory: string;
  };
  companies: EsgCompany[];
}
