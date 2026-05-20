// ProseMirror / TipTap JSON document shape.
// Kept structural rather than importing from @tiptap/core so the shared
// package stays dependency-free and usable from both web and api.
export type ProseMirrorMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

export type ProseMirrorNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: ProseMirrorNode[];
  marks?: ProseMirrorMark[];
  text?: string;
};

export type ProseMirrorDoc = {
  type: "doc";
  content?: ProseMirrorNode[];
};

export const EMPTY_DOC: ProseMirrorDoc = { type: "doc", content: [] };

export type Document = {
  id: string;
  title: string;
  content: ProseMirrorDoc;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
};

// Item shape for the list endpoint — intentionally omits content so list
// payloads stay small even when docs are large.
export type DocumentListItem = Pick<Document, "id" | "title" | "updatedAt"> & {
  isOwner: boolean;
};

// Request/response shapes
export type ListDocumentsResponse = {
  documents: DocumentListItem[];
};

export type CreateDocumentResponse = Document;

export type GetDocumentResponse = Document;

export type PatchDocumentRequest = {
  title?: string;
  content?: ProseMirrorDoc;
};

export type PatchDocumentResponse = Document;
