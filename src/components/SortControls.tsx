import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";

import { FilterChip } from "@/components/FilterChip";
import { Button } from "@/components/ui/button";
import type { TaskSortDirection, TaskSortMode, TaskSortState } from "@/lib/taskSort";

interface SortControlsProps {
  sortState: TaskSortState;
  onModeChange: (mode: TaskSortMode) => void;
  onDirectionChange: (direction: TaskSortDirection) => void;
}

const MODE_LABELS: Record<TaskSortMode, string> = {
  created: "Created",
  manual: "Manual",
  updated: "Updated",
};

const MODE_ORDER: readonly TaskSortMode[] = ["manual", "created", "updated"];

export function SortControls({ sortState, onModeChange, onDirectionChange }: SortControlsProps) {
  const showDirection = sortState.mode !== "manual";
  const toggleDirection = () => onDirectionChange(sortState.direction === "desc" ? "asc" : "desc");

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        Sort by
      </span>
      <div className="flex items-center gap-1.5">
        <div className="flex flex-wrap gap-1.5">
          {MODE_ORDER.map((mode) => (
            <FilterChip
              key={mode}
              selected={sortState.mode === mode}
              onClick={() => onModeChange(mode)}
            >
              {MODE_LABELS[mode]}
            </FilterChip>
          ))}
        </div>
        {showDirection ? (
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground ml-auto"
            onClick={toggleDirection}
            aria-label={
              sortState.direction === "desc"
                ? "Sort descending (newest first)"
                : "Sort ascending (oldest first)"
            }
          >
            {sortState.direction === "desc" ? <ArrowDownWideNarrow /> : <ArrowUpNarrowWide />}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
