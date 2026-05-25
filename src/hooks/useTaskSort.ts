import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_TASK_SORT_STATE,
  type TaskSortDirection,
  type TaskSortMode,
  type TaskSortState,
} from "@/lib/taskSort";

const STORAGE_KEY = "poker:task-sort";

const VALID_MODES: readonly TaskSortMode[] = ["created", "manual", "updated"];
const VALID_DIRECTIONS: readonly TaskSortDirection[] = ["asc", "desc"];

function readStoredSortState(): TaskSortState {
  if (typeof window === "undefined") {
    return DEFAULT_TASK_SORT_STATE;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return DEFAULT_TASK_SORT_STATE;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<TaskSortState>;
    const mode =
      parsed.mode && VALID_MODES.includes(parsed.mode) ? parsed.mode : DEFAULT_TASK_SORT_STATE.mode;
    const direction =
      parsed.direction && VALID_DIRECTIONS.includes(parsed.direction)
        ? parsed.direction
        : DEFAULT_TASK_SORT_STATE.direction;
    return { direction, mode };
  } catch {
    return DEFAULT_TASK_SORT_STATE;
  }
}

export function useTaskSort() {
  const [sortState, setSortState] = useState<TaskSortState>(() => readStoredSortState());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sortState));
  }, [sortState]);

  const setMode = useCallback((mode: TaskSortMode) => {
    setSortState((prev) => ({ ...prev, mode }));
  }, []);

  const setDirection = useCallback((direction: TaskSortDirection) => {
    setSortState((prev) => ({ ...prev, direction }));
  }, []);

  return { setDirection, setMode, sortState };
}
