interface Props {
  years: number[];
  activeYears: Set<number>;
  onToggle: (year: number) => void;
}

const YearFilter = ({ years, activeYears, onToggle }: Props) => (
  <div className="flex items-center gap-2">
    {years.map((yr) => {
      const active = activeYears.has(yr);
      return (
        <button
          key={yr}
          onClick={() => onToggle(yr)}
          className="rounded-md border px-3 py-1 text-xs font-medium transition-colors"
          style={{
            backgroundColor: active
              ? "hsl(var(--primary))"
              : "transparent",
            color: active
              ? "hsl(var(--primary-foreground))"
              : "hsl(var(--foreground))",
            borderColor: active
              ? "hsl(var(--primary))"
              : "hsl(var(--border))",
          }}
        >
          {yr}
        </button>
      );
    })}
  </div>
);

export default YearFilter;
