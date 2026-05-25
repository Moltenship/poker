import { describe, expect, it } from "vitest";

import {
  DEFAULT_TASK_SORT_STATE,
  type SortableTask,
  sortTasks,
  type TaskSortState,
} from "@/lib/taskSort";
import type { JiraTaskDetails } from "@convex/jiraTypes";

function task(overrides: Partial<SortableTask>): SortableTask {
  return {
    _creationTime: 1_000_000,
    isManual: false,
    jiraKey: undefined,
    order: 0,
    ...overrides,
  };
}

function jiraDetails(
  overrides: Partial<JiraTaskDetails>,
): JiraTaskDetails {
  return {
    blockedBy: [],
    description: "",
    isBlocked: false,
    labels: [],
    status: "To Do",
    title: "T",
    type: "Task",
    url: "https://example.invalid",
    ...overrides,
  };
}

describe(sortTasks, () => {
  it("manual mode sorts by order ascending (default state)", () => {
    const tasks = [
      task({ _creationTime: 3, order: 30 }),
      task({ _creationTime: 1, order: 10 }),
      task({ _creationTime: 2, order: 20 }),
    ];

    const result = sortTasks(tasks, {}, DEFAULT_TASK_SORT_STATE);

    expect(result.map((t) => t.order)).toStrictEqual([10, 20, 30]);
  });

  it("manual mode ignores direction", () => {
    const tasks = [
      task({ order: 2 }),
      task({ order: 1 }),
    ];
    const state: TaskSortState = { direction: "asc", mode: "manual" };

    const result = sortTasks(tasks, {}, state);

    expect(result.map((t) => t.order)).toStrictEqual([1, 2]);
  });

  it("created desc sorts Jira tasks by Jira created newest first", () => {
    const tasks = [
      task({ jiraKey: "OLD-1", order: 1 }),
      task({ jiraKey: "NEW-1", order: 2 }),
      task({ jiraKey: "MID-1", order: 3 }),
    ];
    const details = {
      "OLD-1": jiraDetails({ created: "2026-01-01T00:00:00.000Z" }),
      "NEW-1": jiraDetails({ created: "2026-05-01T00:00:00.000Z" }),
      "MID-1": jiraDetails({ created: "2026-03-01T00:00:00.000Z" }),
    };
    const state: TaskSortState = { direction: "desc", mode: "created" };

    const result = sortTasks(tasks, details, state);

    expect(result.map((t) => t.jiraKey)).toStrictEqual(["NEW-1", "MID-1", "OLD-1"]);
  });

  it("updated asc sorts Jira tasks by Jira updated oldest first", () => {
    const tasks = [
      task({ jiraKey: "A", order: 1 }),
      task({ jiraKey: "B", order: 2 }),
    ];
    const details = {
      A: jiraDetails({ updated: "2026-05-01T00:00:00.000Z" }),
      B: jiraDetails({ updated: "2026-04-01T00:00:00.000Z" }),
    };
    const state: TaskSortState = { direction: "asc", mode: "updated" };

    const result = sortTasks(tasks, details, state);

    expect(result.map((t) => t.jiraKey)).toStrictEqual(["B", "A"]);
  });

  it("falls back to _creationTime when Jira details are missing", () => {
    const tasks = [
      task({ _creationTime: 100, jiraKey: "X", order: 1 }),
      task({ _creationTime: 200, jiraKey: "Y", order: 2 }),
    ];
    const state: TaskSortState = { direction: "desc", mode: "created" };

    const result = sortTasks(tasks, {}, state);

    expect(result.map((t) => t.jiraKey)).toStrictEqual(["Y", "X"]);
  });

  it("falls back to _creationTime when Jira date is unparseable", () => {
    const tasks = [
      task({ _creationTime: 100, jiraKey: "X", order: 1 }),
      task({ _creationTime: 200, jiraKey: "Y", order: 2 }),
    ];
    const details = {
      X: jiraDetails({ created: "not-a-date" }),
      Y: jiraDetails({ created: "also-not-a-date" }),
    };
    const state: TaskSortState = { direction: "desc", mode: "created" };

    const result = sortTasks(tasks, details, state);

    expect(result.map((t) => t.jiraKey)).toStrictEqual(["Y", "X"]);
  });

  it("uses _creationTime for manual tasks even when Jira details exist for siblings", () => {
    const tasks = [
      task({ _creationTime: 5_000, isManual: true, jiraKey: undefined, order: 1 }),
      task({ jiraKey: "J-1", order: 2 }),
    ];
    const details = {
      "J-1": jiraDetails({ created: "2026-01-01T00:00:00.000Z" }),
    };
    const state: TaskSortState = { direction: "desc", mode: "created" };

    const result = sortTasks(tasks, details, state);

    expect(result[0].jiraKey).toBe("J-1");
    expect(result[1].isManual).toBeTruthy();
  });

  it("tiebreaks equal timestamps by order ascending", () => {
    const sameTime = "2026-05-01T00:00:00.000Z";
    const tasks = [
      task({ jiraKey: "B", order: 20 }),
      task({ jiraKey: "A", order: 10 }),
      task({ jiraKey: "C", order: 30 }),
    ];
    const details = {
      A: jiraDetails({ created: sameTime }),
      B: jiraDetails({ created: sameTime }),
      C: jiraDetails({ created: sameTime }),
    };
    const state: TaskSortState = { direction: "desc", mode: "created" };

    const result = sortTasks(tasks, details, state);

    expect(result.map((t) => t.order)).toStrictEqual([10, 20, 30]);
  });

  it("does not mutate the input array", () => {
    const tasks = [
      task({ order: 2 }),
      task({ order: 1 }),
    ];
    const originalRef = tasks;
    const originalOrders = tasks.map((t) => t.order);

    const result = sortTasks(tasks, {}, DEFAULT_TASK_SORT_STATE);

    expect(tasks).toBe(originalRef);
    expect(tasks.map((t) => t.order)).toStrictEqual(originalOrders);
    expect(result).not.toBe(tasks);
  });
});
