import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import type { Schema } from "prosemirror-model";

// Single source of truth for both the editor and the server-side parser.
// Adding/removing extensions here automatically updates the schema used by
// every consumer.
export const extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  Underline,
];

// Builds the ProseMirror schema from the extensions above. Used by the
// server-side import parser (apps/api) to drive DOMParser. Pure — does not
// touch DOM globals.
export function getDocumentSchema(): Schema {
  return getSchema(extensions);
}
