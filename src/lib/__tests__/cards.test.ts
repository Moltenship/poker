import { FIBONACCI, FIBONACCI_EXTENDED, isNumericCard, parseCardValue } from "../cards";

describe("fIBONACCI presets", () => {
  it("fIBONACCI has 7 values", () => {
    expect(FIBONACCI.values).toHaveLength(7);
    expect(FIBONACCI.values).toStrictEqual(["1", "2", "3", "5", "8", "13", "21"]);
  });

  it("fIBONACCI_EXTENDED includes '?' and '☕'", () => {
    expect(FIBONACCI_EXTENDED.values).toContain("?");
    expect(FIBONACCI_EXTENDED.values).toContain("☕");
  });
});

describe(isNumericCard, () => {
  it("returns true for numeric strings", () => {
    expect(isNumericCard("1")).toBeTruthy();
    expect(isNumericCard("13")).toBeTruthy();
    expect(isNumericCard("0")).toBeTruthy();
  });

  it("returns false for non-numeric", () => {
    expect(isNumericCard("?")).toBeFalsy();
    expect(isNumericCard("☕")).toBeFalsy();
  });

  it("returns true for '½'", () => {
    expect(isNumericCard("½")).toBeTruthy();
  });
});

describe(parseCardValue, () => {
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
