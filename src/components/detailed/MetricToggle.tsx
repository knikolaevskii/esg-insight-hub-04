import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type MetricMode = "total" | "scope1" | "scope2";

interface Props {
  value: MetricMode;
  onChange: (v: MetricMode) => void;
}

const MetricToggle = ({ value, onChange }: Props) => (
  <ToggleGroup
    type="single"
    value={value}
    onValueChange={(v) => v && onChange(v as MetricMode)}
    className="bg-muted rounded-lg p-1"
  >
    <ToggleGroupItem
      value="total"
      className="px-3 py-1 text-xs font-medium data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-md"
    >
      Total (Scope 1+2)
    </ToggleGroupItem>
    <ToggleGroupItem
      value="scope1"
      className="px-3 py-1 text-xs font-medium data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-md"
    >
      Scope 1 only
    </ToggleGroupItem>
    <ToggleGroupItem
      value="scope2"
      className="px-3 py-1 text-xs font-medium data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-md"
    >
      Scope 2 only
    </ToggleGroupItem>
  </ToggleGroup>
);

export default MetricToggle;
