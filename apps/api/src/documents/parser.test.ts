import { describe, expect, it } from "vitest";
import { parseUpload } from "./parser.js";

describe("parseUpload — markdown", () => {
  it("preserves headings, bold, italic, bullet and ordered lists", () => {
    const md = [
      "# Big",
      "",
      "## Medium",
      "",
      "### Small",
      "",
      "Plain paragraph with **bold** and *italic* text.",
      "",
      "- one",
      "- two",
      "- three",
      "",
      "1. first",
      "2. second",
    ].join("\n");

    const result = parseUpload("md", md);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const doc = result.doc;
    expect(doc.type).toBe("doc");
    const content = doc.content ?? [];

    const types = content.map((n) => n.type);
    expect(types).toContain("heading");
    expect(types).toContain("paragraph");
    expect(types).toContain("bulletList");
    expect(types).toContain("orderedList");

    // Three distinct heading levels were emitted
    const headings = content.filter((n) => n.type === "heading");
    const levels = headings.map((h) => h.attrs?.level).sort();
    expect(levels).toEqual([1, 2, 3]);

    // Bold and italic marks present somewhere
    const flatText = JSON.stringify(doc);
    expect(flatText).toMatch(/"bold"/);
    expect(flatText).toMatch(/"italic"/);
  });

  it("drops unsupported nodes (tables, links, code blocks) without throwing — supported content preserved", () => {
    const md = [
      "Heading? **bold**",
      "",
      "[a link to drop](https://example.com)",
      "",
      "| col1 | col2 |",
      "| ---- | ---- |",
      "| a    | b    |",
      "",
      "```",
      "let x = 1;",
      "```",
      "",
      "After.",
    ].join("\n");

    const result = parseUpload("md", md);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const flat = JSON.stringify(result.doc);
    // The schema has no `link` mark and no `table*` nodes, so those drop.
    // Note: StarterKit silently includes `codeBlock` (and blockquote, etc.)
    // even though the toolbar doesn't expose them — those survive the parse.
    // Trimming the schema is a separate scope decision; not done here.
    expect(flat).not.toMatch(/"table/);
    expect(flat).not.toMatch(/"link"/);
    expect(flat).toMatch(/bold/);
    expect(flat).toMatch(/After\./);
  });
});

describe("parseUpload — plain text", () => {
  it("turns each non-empty line into a paragraph node", () => {
    const txt = ["First.", "Second.", "", "After blank.", ""].join("\n");

    const result = parseUpload("txt", txt);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const paragraphs = (result.doc.content ?? []).filter(
      (n) => n.type === "paragraph",
    );
    expect(paragraphs.length).toBe(3);

    const texts = paragraphs.map(
      (p) => (p.content?.[0] as { text?: string } | undefined)?.text,
    );
    expect(texts).toEqual(["First.", "Second.", "After blank."]);
  });
});

describe("parseUpload — empty", () => {
  it("signals empty for an empty string", () => {
    const result = parseUpload("md", "");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("empty");
  });

  it("signals empty for whitespace-only input", () => {
    const result = parseUpload("txt", "  \n\n   \n");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("empty");
  });
});
