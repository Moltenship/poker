import { describe, expect, it, vi } from "vitest";

vi.mock(import("idb-keyval"));

import { JIRA_QUERY_OPTIONS } from "../persister";

describe("jira query options", () => {
  it("has 5-minute staleTime", () => {
    expect(JIRA_QUERY_OPTIONS.staleTime).toBe(5 * 60 * 1000);
  });

  it("has infinite gcTime for session-long memory retention", () => {
    expect(JIRA_QUERY_OPTIONS.gcTime).toBe(Infinity);
  });

  it("provides a persister function for IndexedDB persistence", () => {
    expect(JIRA_QUERY_OPTIONS.persister).toBeTypeOf("function");
  });
});
