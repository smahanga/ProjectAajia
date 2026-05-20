import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { DocumentListItem } from "@aajia/shared";
import { api } from "../lib/api";

export function DocumentListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<DocumentListItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    api
      .listDocuments()
      .then((res) => {
        if (!cancelled) setItems(res.documents);
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const doc = await api.createDocument();
      navigate(`/documents/${doc.id}`);
    } catch (err) {
      setCreating(false);
      alert(`Failed to create document: ${(err as Error).message}`);
    }
  };

  const handleDelete = async (doc: DocumentListItem) => {
    if (items === null) return;
    if (!window.confirm("Delete this document? This cannot be undone.")) {
      return;
    }
    // Optimistic remove; snapshot for rollback.
    const snapshot = items;
    setItems(items.filter((d) => d.id !== doc.id));
    setRowErrors((prev) => {
      if (!(doc.id in prev)) return prev;
      const next = { ...prev };
      delete next[doc.id];
      return next;
    });

    try {
      await api.deleteDocument(doc.id);
    } catch (err) {
      setItems(snapshot);
      setRowErrors((prev) => ({
        ...prev,
        [doc.id]: (err as Error).message || "Failed to delete",
      }));
    }
  };

  return (
    <main className="page">
      <header className="page-header">
        <h1>Documents</h1>
        <button
          type="button"
          className="primary"
          onClick={handleCreate}
          disabled={creating}
        >
          {creating ? "Creating…" : "New document"}
        </button>
      </header>

      {loadError && (
        <p className="error">Couldn't load documents: {loadError}</p>
      )}

      {items === null && !loadError && <p className="muted">Loading…</p>}

      {items !== null && items.length === 0 && (
        <p className="muted">No documents yet. Create one to get started.</p>
      )}

      {items !== null && items.length > 0 && (
        <ul className="doc-list">
          {items.map((doc) => (
            <li key={doc.id} className="doc-list-row">
              <Link
                to={`/documents/${doc.id}`}
                className="doc-list-item"
              >
                <span className="doc-title">{doc.title || "Untitled"}</span>
                <span className="doc-meta">
                  Edited {formatRelative(doc.updatedAt)}
                </span>
              </Link>
              <button
                type="button"
                className="doc-delete-btn"
                onClick={() => handleDelete(doc)}
                aria-label={`Delete ${doc.title || "Untitled"}`}
              >
                Delete
              </button>
              {rowErrors[doc.id] && (
                <div className="row-error" role="alert">
                  {rowErrors[doc.id]}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.round((now - then) / 1000));
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}
