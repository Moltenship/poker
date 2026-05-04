import { FilterChip } from "@/components/FilterChip";
import { Separator } from "@/components/ui/separator";
import { AVAILABLE_LABEL_FILTERS } from "@/lib/taskFilters";

interface LabelFilterChipsProps {
  selectedLabels: string[];
  onToggle: (label: string) => void;
  onClear: () => void;
}

export function LabelFilterChips({ selectedLabels, onToggle, onClear }: LabelFilterChipsProps) {
  return (
    <>
      <Separator className="my-1" />
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Label
        </span>
        {selectedLabels.length > 0 && (
          <button
            className="text-muted-foreground hover:text-foreground text-xs transition-colors"
            onClick={onClear}
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {AVAILABLE_LABEL_FILTERS.map((label) => (
          <FilterChip
            key={label}
            selected={selectedLabels.includes(label)}
            onClick={() => onToggle(label)}
          >
            {label}
          </FilterChip>
        ))}
      </div>
      {selectedLabels.length === 0 && (
        <p className="text-muted-foreground text-xs">Showing all labels</p>
      )}
    </>
  );
}
