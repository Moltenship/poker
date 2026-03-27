import { describe, it, expect } from "vitest";
import { adfToPlainText } from "../adf";

describe("adfToPlainText", () => {
  it("returns '(no description)' for null", () => {
    expect(adfToPlainText(null)).toBe("(no description)");
  });
  it("returns '(no description)' for empty doc", () => {
    expect(adfToPlainText({ type: "doc", content: [] })).toBe("(no description)");
  });
  it("extracts simple paragraph text", () => {
    const adf = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Hello world" }] }],
    };
    expect(adfToPlainText(adf)).toBe("Hello world");
  });
  it("extracts text from nested list items", () => {
    const adf = {
      type: "doc",
      content: [{
        type: "bulletList",
        content: [{
          type: "listItem",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Item 1" }] }],
        }],
      }],
    };
    expect(adfToPlainText(adf)).toContain("Item 1");
  });
  it("returns '(no description)' for media-only doc", () => {
    const adf = {
      type: "doc",
      content: [{ type: "mediaSingle", content: [{ type: "media", attrs: {} }] }],
    };
    expect(adfToPlainText(adf)).toBe("(no description)");
  });
  it("handles heading nodes", () => {
    const adf = {
      type: "doc",
      content: [{ type: "heading", content: [{ type: "text", text: "My Heading" }] }],
    };
    expect(adfToPlainText(adf)).toContain("My Heading");
  });
  it("handles hardBreak as newline or space", () => {
    const adf = {
      type: "doc",
      content: [{
        type: "paragraph",
        content: [
          { type: "text", text: "Line 1" },
          { type: "hardBreak" },
          { type: "text", text: "Line 2" },
        ],
      }],
    };
    const result = adfToPlainText(adf);
    expect(result).toContain("Line 1");
    expect(result).toContain("Line 2");
  });
});
