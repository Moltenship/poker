/**
 * This test file validates ADF to Markdown conversion for Jira descriptions.
 * It mirrors the convertAdfNode logic to test link rendering without importing internals.
 */
import { describe, expect, it } from "vitest";

interface AdfMark {
  type: string;
  attrs?: Record<string, string>;
}
interface AdfNode {
  type: string;
  text?: string;
  content?: AdfNode[];
  attrs?: Record<string, unknown>;
  marks?: AdfMark[];
}

function applyMarks(text: string, marks: AdfMark[]): string {
  let out = text;
  for (const mark of marks) {
    if (mark.type === "strong") {
      out = `**${out}**`;
    } else if (mark.type === "em") {
      out = `_${out}_`;
    } else if (mark.type === "code") {
      out = `\`${out}\``;
    } else if (mark.type === "strike") {
      out = `~~${out}~~`;
    } else if (mark.type === "link") {
      out = `[${out}](${mark.attrs?.href ?? ""})`;
    }
  }
  return out;
}

function convertInline(nodes: AdfNode[]): string {
  return nodes
    .map((n) => {
      if (n.type === "text") {
        return applyMarks(n.text ?? "", n.marks ?? []);
      }
      if (n.type === "hardBreak") {
        return "  \n";
      }
      return convertAdfNode(n, 0);
    })
    .join("");
}

function convertListItem(item: AdfNode, depth: number): string {
  const parts: string[] = [];
  for (const child of item.content ?? []) {
    if (child.type === "paragraph") {
      parts.push(convertInline(child.content ?? []));
    } else if (child.type === "bulletList" || child.type === "orderedList") {
      parts.push("\n" + convertAdfNode(child, depth + 1));
    } else {
      parts.push(convertAdfNode(child, depth));
    }
  }
  return parts.join("");
}

function convertAdfNode(node: AdfNode, depth: number): string {
  const indent = "  ".repeat(depth);
  switch (node.type) {
    case "doc":
      return (node.content ?? []).map((n) => convertAdfNode(n, 0)).join("\n\n");
    case "paragraph":
      return convertInline(node.content ?? []);
    case "heading": {
      const level = Math.min(Number(node.attrs?.level ?? 1), 6);
      return `${"#".repeat(level)} ${convertInline(node.content ?? [])}`;
    }
    case "bulletList":
      return (node.content ?? [])
        .map((item) => `${indent}- ${convertListItem(item, depth)}`)
        .join("\n");
    case "orderedList":
      return (node.content ?? [])
        .map((item, i) => `${indent}${i + 1}. ${convertListItem(item, depth)}`)
        .join("\n");
    case "blockquote":
      return (node.content ?? [])
        .map((n) =>
          convertAdfNode(n, 0)
            .split("\n")
            .map((l) => `> ${l}`)
            .join("\n"),
        )
        .join("\n>\n");
    case "codeBlock": {
      const lang = String(node.attrs?.language ?? "");
      const code = (node.content ?? []).map((n) => n.text ?? "").join("");
      return `\`\`\`${lang}\n${code}\n\`\`\``;
    }
    case "rule":
      return "---";
    case "hardBreak":
      return "  \n";
    case "text":
      return applyMarks(node.text ?? "", node.marks ?? []);
    case "mention":
      return String(node.attrs?.text ?? "");
    case "inlineLink":
      return `[${convertInline(node.content ?? [])}](${String(node.attrs?.href ?? "")})`;
    default:
      if (node.content) {
        return convertInline(node.content);
      }
      return "";
  }
}

function adfToMarkdown(adf: unknown): string {
  if (!adf || typeof adf !== "object") {
    return "";
  }
  return convertAdfNode(adf as AdfNode, 0).trim();
}

describe("aDF to Markdown conversion", () => {
  it("renders inlineLink nodes as markdown links", () => {
    const adf = {
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Check out " },
            {
              type: "inlineLink",
              attrs: { href: "https://example.com" },
              content: [{ type: "text", text: "this link" }],
            },
          ],
        },
      ],
      type: "doc",
    };
    const result = adfToMarkdown(adf);
    expect(result).toContain("[this link](https://example.com)");
    expect(result).toContain("Check out");
  });

  it("renders multiple inlineLink nodes", () => {
    const adf = {
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "inlineLink",
              attrs: { href: "https://first.com" },
              content: [{ type: "text", text: "First" }],
            },
            { type: "text", text: " and " },
            {
              type: "inlineLink",
              attrs: { href: "https://second.com" },
              content: [{ type: "text", text: "Second" }],
            },
          ],
        },
      ],
      type: "doc",
    };
    const result = adfToMarkdown(adf);
    expect(result).toContain("[First](https://first.com)");
    expect(result).toContain("[Second](https://second.com)");
  });

  it("handles inlineLink with empty URL", () => {
    const adf = {
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "inlineLink",
              attrs: { href: "" },
              content: [{ type: "text", text: "broken link" }],
            },
          ],
        },
      ],
      type: "doc",
    };
    const result = adfToMarkdown(adf);
    expect(result).toBe("[broken link]()");
  });

  it("handles inlineLink with missing href attribute", () => {
    const adf = {
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "inlineLink",
              attrs: {},
              content: [{ type: "text", text: "no href" }],
            },
          ],
        },
      ],
      type: "doc",
    };
    const result = adfToMarkdown(adf);
    expect(result).toBe("[no href]()");
  });

  it("renders inlineLink with formatted text inside", () => {
    const adf = {
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "inlineLink",
              attrs: { href: "https://example.com" },
              content: [{ type: "text", text: "bold link", marks: [{ type: "strong" }] }],
            },
          ],
        },
      ],
      type: "doc",
    };
    const result = adfToMarkdown(adf);
    expect(result).toContain("[**bold link**](https://example.com)");
  });
});
