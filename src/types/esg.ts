export interface EsgEntry {
  company: string;
  reporting_year: number;
  scope1: { value: number; unit: string };
  scope2_market: { value: number; unit: string };
  assurance: boolean;
  primary_target: {
    description: string;
    pct_reduction: number | null;
    target_year: number;
    base_year: number | null;
  };
  other_targets: {
    description: string;
    target_year: number;
    pct_reduction: number | null;
  }[];
  action_plans: string;
  data_reliability_notes: string;
}
