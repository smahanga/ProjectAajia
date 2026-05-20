import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Document } from "@aajia/shared";
import { Editor } from "../editor/Editor";
import { SaveStatus } from "../editor/SaveStatus";
import { useAutoSave } from "../editor/useAutoSave";
import { useDocument } from "../editor/useDocument";

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const state = useDocument(id);

  return (
    <main className="page editor-page">
      <header className="page-header">
        <Link to="/documents" className="back-link">
          ← Documents
        </Link>
      </header>

      {state.kind === "loading" && <EditorSkeleton />}

      {state.kind === "not-found" && (
        <div className="not-found">
          <p>This document doesn't exist (or was deleted).</p>
          <Link to="/documents">Back to documents</Link>
        </div>
      )}

      {state.kind === "error" && (
        <p className="error">Couldn't load document: {state.message}</p>
      )}

      {state.kind === "ready" && <DocumentEditor doc={state.doc} />}
    </main>
  );
}

function DocumentEditor({ doc }: { doc: Document }) {
  const { status, setTitle, setContent, flush } = useAutoSave(
    doc.id,
    doc.title,
    doc.content,
  );
  // Local state for the title input so the field is fully responsive; the
  // hook owns persistence.
  const [titleValue, setTitleValue] = useState(doc.title);

  // Flush any pending edit when the user closes the tab, refreshes, or
  // navigates to an external URL. Does NOT fire on internal SPA navigation
  // (clicking the back link) — that path still drops the 800ms window.
  useEffect(() => {
    const handler = () => flush();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [flush]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitleValue(e.target.value);
    setTitle(e.target.value);
  };

  return (
    <>
      <div className="title-row">
        <input
          type="text"
          className="doc-title-input"
          value={titleValue}
          onChange={handleTitleChange}
          placeholder="Untitled"
          maxLength={200}
          aria-label="Document title"
        />
        <SaveStatus status={status} />
      </div>
      <Editor initialContent={doc.content} onChange={setContent} />
    </>
  );
}

// Per editor-patterns/SKILL.md: do NOT mount the editor with placeholder
// content while loading; show a skeleton instead.
function EditorSkeleton() {
  return (
    <div className="editor-skeleton" aria-hidden="true">
      <div className="skeleton-line" style={{ width: "60%" }} />
      <div className="skeleton-line" style={{ width: "90%" }} />
      <div className="skeleton-line" style={{ width: "80%" }} />
      <div className="skeleton-line" style={{ width: "70%" }} />
    </div>
  );
}
