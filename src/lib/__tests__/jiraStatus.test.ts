import { describe, expect, it } from "vitest";

import { statusColorClass } from "@/lib/jiraStatus";

describe(statusColorClass, () => {
  it("returns the slate palette for blue-gray", () => {
    expect(statusColorClass("blue-gray")).toContain("slate");
  });

  it("returns the blue palette for blue", () => {
    expect(statusColorClass("blue")).toContain("blue");
  });

  it("returns the yellow palette for yellow", () => {
    expect(statusColorClass("yellow")).toContain("yellow");
  });

  it("returns the green palette for green", () => {
    expect(statusColorClass("green")).toContain("green");
  });

  it("returns an empty string for unknown colors", () => {
    expect(statusColorClass("magenta")).toBe("");
  });

  it("returns an empty string when colorName is undefined", () => {
    expect(statusColorClass(undefined)).toBe("");
  });
});
