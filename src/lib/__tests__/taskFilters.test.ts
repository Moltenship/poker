import { describe, expect, it } from "vitest";

import { isTaskVisible } from "@/lib/taskFilters";

describe(isTaskVisible, () => {
  it("shows every task when no label filter is selected", () => {
    expect(
      isTaskVisible({
        details: { labels: [] },
        labelFilter: [],
        typeFilter: [],
      }),
    ).toBeTruthy();
  });

  it("shows only tech_debt labeled tasks when tech_debt is selected", () => {
    expect(
      isTaskVisible({
        details: { labels: ["tech_debt"] },
        labelFilter: ["tech_debt"],
        typeFilter: [],
      }),
    ).toBeTruthy();
    expect(
      isTaskVisible({
        details: { labels: ["frontend"] },
        labelFilter: ["tech_debt"],
        typeFilter: [],
      }),
    ).toBeFalsy();
  });

  it("ignores unsupported labels", () => {
    expect(
      isTaskVisible({
        details: { labels: ["frontend"] },
        labelFilter: ["frontend"],
        typeFilter: [],
      }),
    ).toBeTruthy();
  });
});
