type AdfNode = {
  type: string;
  text?: string;
  content?: AdfNode[];
};

export function adfToPlainText(adf: unknown): string {
  if (!adf || typeof adf !== "object") return "(no description)";
  const parts: string[] = [];
  function extractText(node: AdfNode): void {
    if (node.type === "text" && node.text) {
      parts.push(node.text);
    } else if (node.type === "hardBreak") {
      parts.push("\n");
    } else if (node.content) {
      node.content.forEach(extractText);
      if (["paragraph", "heading", "bulletList", "orderedList", "blockquote", "codeBlock"].includes(node.type)) {
        if (parts.length > 0 && parts[parts.length - 1] !== "\n") {
          parts.push("\n");
        }
      }
    }
  }
  extractText(adf as AdfNode);
  const result = parts.join("").trim();
  return result || "(no description)";
}
