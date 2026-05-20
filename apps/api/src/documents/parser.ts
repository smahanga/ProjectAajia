import { JSDOM } from "jsdom";
import { marked } from "marked";
import { DOMParser as PMDOMParser } from "prosemirror-model";
import { getDocumentSchema, type ProseMirrorDoc } from "@aajia/shared";

export type UploadFormat = "md" | "txt";

export type ParseResult =
  | { ok: true; doc: ProseMirrorDoc }
  | { ok: false; reason: "empty" | "parse_failed" };

// Build the schema once. The shared module guarantees web and api agree on
// nodes/marks, so anything outside the schema (tables, links, code blocks…)
// gets dropped during ProseMirror's parse, which is the desired behavior.
const schema = getDocumentSchema();

// Marked options:
// - default GFM-ish output is fine; the schema's drop-unknowns behavior
//   handles tables/links/code blocks that aren't in our extension set.
// - async: false forces sync, returns string.
marked.use({ async: false });

export function parseUpload(
  format: UploadFormat,
  content: string,
): ParseResult {
  if (content.trim() === "") {
    return { ok: false, reason: "empty" };
  }

  try {
    const html = format === "md" ? mdToHtml(content) : txtToHtml(content);
    const doc = htmlToDoc(html);
    return { ok: true, doc };
  } catch {
    return { ok: false, reason: "parse_failed" };
  }
}

function mdToHtml(content: string): string {
  // marked.parse is sync because we configured async: false above.
  return marked.parse(content) as string;
}

function txtToHtml(content: string): string {
  // Per spec: each non-empty line is a paragraph; blank lines act as
  // separators only (not preserved as empty paragraphs).
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("\n");
}

function htmlToDoc(html: string): ProseMirrorDoc {
  // Fresh JSDOM per call — we don't share DOM state between parses.
  // JSDOM does not execute <script> tags by default, so untrusted HTML is
  // not a script-execution risk here. ProseMirror's schema enforcement is
  // the structural sanitization.
  const dom = new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`);
  const body = dom.window.document.body;
  const node = PMDOMParser.fromSchema(schema).parse(body);
  return node.toJSON() as ProseMirrorDoc;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
