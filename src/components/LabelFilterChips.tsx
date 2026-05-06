import { FilterChip } from "@/components/FilterChip";
import { Separator } from "@/components/ui/separator";
import {
  getLabelFilterState,
  LABEL_FILTER_CHIP_LABELS,
  LABEL_FILTER_CHIPS,
} from "@/lib/taskFilters";

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
        {LABEL_FILTER_CHIPS.map((label) => {
          const state = getLabelFilterState(selectedLabels, label);
          return (
            <FilterChip
              key={label}
              selected={state !== "none"}
              className={
                state === "excluded"
                  ? "border-destructive bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive"
                  : undefined
              }
              onClick={() => onToggle(label)}
            >
              {LABEL_FILTER_CHIP_LABELS[state]}
            </FilterChip>
          );
        })}
      </div>
      {selectedLabels.length === 0 && (
        <p className="text-muted-foreground text-xs">Showing all labels</p>
      )}
    </>
  );
}
