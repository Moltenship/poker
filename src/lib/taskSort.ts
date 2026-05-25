import type { JiraTaskDetails } from "@convex/jiraTypes";

export type TaskSortMode = "created" | "manual" | "updated";
export type TaskSortDirection = "asc" | "desc";

export interface TaskSortState {
  direction: TaskSortDirection;
  mode: TaskSortMode;
}

export const DEFAULT_TASK_SORT_STATE: TaskSortState = {
  direction: "desc",
  mode: "manual",
};

/**
 * Minimal shape `sortTasks` requires. Keeps the helper decoupled from the
 * Convex `Task` doc shape so it can be tested in isolation.
 */
export interface SortableTask {
  _creationTime: number;
  isManual: boolean;
  jiraKey?: string;
  order: number;
}

function getSortKey(
  task: SortableTask,
  details: JiraTaskDetails | undefined,
  mode: "created" | "updated",
): number {
  const iso = details?.[mode];
  if (iso) {
    const parsed = Date.parse(iso);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return task._creationTime;
}

export function sortTasks<T extends SortableTask>(
  tasks: readonly T[],
  jiraDetails: Record<string, JiraTaskDetails>,
  sortState: TaskSortState,
): T[] {
  const copy = [...tasks];

  if (sortState.mode === "manual") {
    return copy.sort((a, b) => a.order - b.order);
  }

  const { direction, mode } = sortState;
  const directionMultiplier = direction === "asc" ? 1 : -1;

  return copy.sort((a, b) => {
    const keyA = getSortKey(a, a.jiraKey ? jiraDetails[a.jiraKey] : undefined, mode);
    const keyB = getSortKey(b, b.jiraKey ? jiraDetails[b.jiraKey] : undefined, mode);

    if (keyA !== keyB) {
      return (keyA - keyB) * directionMultiplier;
    }
    return a.order - b.order;
  });
}
