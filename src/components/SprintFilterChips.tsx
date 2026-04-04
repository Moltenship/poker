import { BACKLOG_FILTER_ID, type JiraSprint } from "@convex/jiraTypes";

import { FilterChip } from "@/components/FilterChip";

interface SprintFilterChipsProps {
  sprints: JiraSprint[];
  selectedIds: number[];
  syncing?: boolean;
  syncError?: string | null;
  onToggle: (id: number) => void;
  onClear: () => void;
}

export function SprintFilterChips({
  sprints,
  selectedIds,
  syncing,
  syncError,
  onToggle,
  onClear,
}: SprintFilterChipsProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Sprints
        </span>
        {selectedIds.length > 0 && (
          <button
            className="text-muted-foreground hover:text-foreground text-xs transition-colors"
            onClick={onClear}
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <FilterChip
          selected={selectedIds.includes(BACKLOG_FILTER_ID)}
          onClick={() => onToggle(BACKLOG_FILTER_ID)}
        >
          Backlog
        </FilterChip>
        {sprints.map((sprint) => (
          <FilterChip
            key={sprint.id}
            selected={selectedIds.includes(sprint.id)}
            onClick={() => onToggle(sprint.id)}
          >
            {sprint.state === "active" && (
              <span className="size-1.5 shrink-0 rounded-full bg-green-500" />
            )}
            {sprint.name}
          </FilterChip>
        ))}
      </div>
      {sprints.length === 0 && (
        <p className="text-muted-foreground text-xs">
          {syncing ? "Loading sprints\u2026" : "No sprints found"}
        </p>
      )}
      {syncError ? <p className="text-destructive truncate text-xs">{syncError}</p> : null}
    </div>
  );
}
