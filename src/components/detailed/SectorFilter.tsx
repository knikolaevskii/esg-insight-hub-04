import { SECTOR_CONFIG } from "@/config/sectors";

interface Props {
  activeSectors: Set<string>;
  onToggle: (sector: string) => void;
}

const SectorFilter = ({ activeSectors, onToggle }: Props) => {
  const allSectors = Object.keys(SECTOR_CONFIG);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {allSectors.map((sector) => {
        const cfg = SECTOR_CONFIG[sector];
        const active = activeSectors.has(sector);
        return (
          <button
            key={sector}
            onClick={() => onToggle(sector)}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
            style={{
              backgroundColor: active ? cfg.colorDark : "transparent",
              color: active ? "#fff" : cfg.colorDark,
              borderColor: cfg.colorDark,
              opacity: active ? 1 : 0.5,
            }}
          >
            {sector}
          </button>
        );
      })}
    </div>
  );
};

export default SectorFilter;
