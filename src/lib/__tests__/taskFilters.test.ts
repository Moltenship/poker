import { describe, expect, it } from "vitest";

import { isTaskVisible, toggleLabelFilter } from "@/lib/taskFilters";

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

  it("hides tech_debt labeled tasks when exclude_tech_debt is selected", () => {
    expect(
      isTaskVisible({
        details: { labels: ["frontend"] },
        labelFilter: ["exclude_tech_debt"],
        typeFilter: [],
      }),
    ).toBeTruthy();
    expect(
      isTaskVisible({
        details: { labels: ["tech_debt"] },
        labelFilter: ["exclude_tech_debt"],
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

  it("keeps include and exclude tech_debt filters mutually exclusive", () => {
    expect(toggleLabelFilter([], "tech_debt")).toStrictEqual(["tech_debt"]);
    expect(toggleLabelFilter(["tech_debt"], "tech_debt")).toStrictEqual(["exclude_tech_debt"]);
    expect(toggleLabelFilter(["exclude_tech_debt"], "tech_debt")).toStrictEqual([]);
  });
});
