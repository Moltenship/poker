import { describe, it, expect } from "vitest";
import {
  FIBONACCI,
  FIBONACCI_EXTENDED,
  isNumericCard,
  parseCardValue,
  type CardSet,
} from "../cards";

describe("FIBONACCI presets", () => {
  it("FIBONACCI has 7 values", () => {
    expect(FIBONACCI.values).toHaveLength(7);
    expect(FIBONACCI.values).toEqual(["1", "2", "3", "5", "8", "13", "21"]);
  });
  it("FIBONACCI_EXTENDED includes '?' and '☕'", () => {
    expect(FIBONACCI_EXTENDED.values).toContain("?");
    expect(FIBONACCI_EXTENDED.values).toContain("☕");
  });
});

describe("isNumericCard", () => {
  it("returns true for numeric strings", () => {
    expect(isNumericCard("1")).toBe(true);
    expect(isNumericCard("13")).toBe(true);
    expect(isNumericCard("0")).toBe(true);
  });
  it("returns false for non-numeric", () => {
    expect(isNumericCard("?")).toBe(false);
    expect(isNumericCard("☕")).toBe(false);
  });
  it("returns true for '½'", () => {
    expect(isNumericCard("½")).toBe(true);
  });
});

describe("parseCardValue", () => {
  it("parses normal numbers", () => {
    expect(parseCardValue("5")).toBe(5);
    expect(parseCardValue("13")).toBe(13);
  });
  it("parses '½' as 0.5", () => {
    expect(parseCardValue("½")).toBe(0.5);
  });
  it("returns null for '?'", () => {
    expect(parseCardValue("?")).toBeNull();
  });
  it("returns null for '☕'", () => {
    expect(parseCardValue("☕")).toBeNull();
  });
  it("returns null for empty string", () => {
    expect(parseCardValue("")).toBeNull();
  });
});
