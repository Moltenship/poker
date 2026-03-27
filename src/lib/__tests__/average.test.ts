import { describe, it, expect } from "vitest";
import { calculateAverage, findNearestCard } from "../average";

describe("calculateAverage", () => {
  it("calculates mean of all-numeric votes", () => {
    const result = calculateAverage(["3", "5", "8"]);
    expect(result.average).toBeCloseTo(5.33, 1);
    expect(result.numericCount).toBe(3);
    expect(result.totalCount).toBe(3);
  });
  it("excludes non-numeric '?' from average", () => {
    const result = calculateAverage(["3", "?", "8"]);
    expect(result.average).toBeCloseTo(5.5, 1);
    expect(result.numericCount).toBe(2);
    expect(result.totalCount).toBe(3);
  });
  it("returns null if all non-numeric", () => {
    const result = calculateAverage(["?", "☕"]);
    expect(result.average).toBeNull();
    expect(result.numericCount).toBe(0);
  });
  it("returns null for empty votes", () => {
    const result = calculateAverage([]);
    expect(result.average).toBeNull();
    expect(result.totalCount).toBe(0);
  });
  it("works for single voter", () => {
    const result = calculateAverage(["5"]);
    expect(result.average).toBe(5);
    expect(result.numericCount).toBe(1);
  });
});

describe("findNearestCard", () => {
  const fibonacci = ["1", "2", "3", "5", "8", "13", "21"];
  it("finds exact match", () => {
    expect(findNearestCard(5, fibonacci)).toBe("5");
  });
  it("rounds to nearest card", () => {
    // 6.5 is between 5 and 8 — nearest is 8 (or 5, either is acceptable)
    const result = findNearestCard(6.5, fibonacci);
    expect(["5", "8"]).toContain(result);
  });
  it("returns null for empty card set", () => {
    expect(findNearestCard(5, [])).toBeNull();
  });
});
