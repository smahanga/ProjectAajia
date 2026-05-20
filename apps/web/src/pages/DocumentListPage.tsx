import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { DocumentListItem } from "@aajia/shared";
import {
  ApiError,
  api,
  getCurrentUserId,
  type User,
} from "../lib/api";

const MAX_UPLOAD_BYTES = 1 * 1024 * 1024;
const ALLOWED_EXTS = [".md", ".txt"];

export function DocumentListPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<DocumentListItem[] | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [shareFormFor, setShareFormFor] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<string>("");
  const [shareNotice, setShareNotice] = useState<Record<string, string>>({});

  const currentUserId = getCurrentUserId();

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
    api
      .listUsers()
      .then((r) => {
        if (!cancelled) setUsers(r.users);
      })
      .catch(() => {
        // Best-effort.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { owned, shared } = useMemo(() => {
    const o: DocumentListItem[] = [];
    const s: DocumentListItem[] = [];
    for (const d of items ?? []) {
      (d.isOwner ? o : s).push(d);
    }
    return { owned: o, shared: s };
  }, [items]);

  const otherUsers = useMemo(
    () => users.filter((u) => u.id !== currentUserId),
    [users, currentUserId],
  );

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

  const handleUploadClick = () => {
    setUploadError(null);
    fileInputRef.current?.click();
  };

  const handleFilePicked = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!ALLOWED_EXTS.some((ext) => lower.endsWith(ext))) {
      setUploadError("Only .md and .txt files are supported.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError("File is too large. Maximum size is 1 MB.");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const doc = await api.uploadDocument(file);
      navigate(`/documents/${doc.id}`);
    } catch (err) {
      setUploading(false);
      setUploadError(uploadErrorMessage(err));
    }
  };

  const openShareFor = (id: string) => {
    setShareFormFor(id);
    setShareTarget(otherUsers[0]?.id ?? "");
    setRowErrors((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const submitShare = async (docId: string) => {
    if (!shareTarget) return;
    try {
      await api.shareDocument(docId, shareTarget);
      const targetName =
        otherUsers.find((u) => u.id === shareTarget)?.name ?? shareTarget;
      setShareNotice((prev) => ({
        ...prev,
        [docId]: `Shared with ${targetName}`,
      }));
      setShareFormFor(null);
      setTimeout(() => {
        setShareNotice((prev) => {
          if (!(docId in prev)) return prev;
          const next = { ...prev };
          delete next[docId];
          return next;
        });
      }, 2500);
    } catch (err) {
      setRowErrors((prev) => ({
        ...prev,
        [docId]: (err as Error).message || "Share failed",
      }));
    }
  };

  return (
    <main className="page">
      <header className="page-header">
        <h1>Documents</h1>
        <div className="page-actions">
          <button
            type="button"
            className="secondary"
            onClick={handleUploadClick}
            disabled={uploading}
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt,text/markdown,text/plain"
            onChange={handleFilePicked}
            style={{ display: "none" }}
          />
          <button
            type="button"
            className="primary"
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? "Creating…" : "New document"}
          </button>
        </div>
      </header>

      {uploadError && (
        <div className="error upload-error" role="alert">
          <span>{uploadError}</span>
          <button
            type="button"
            className="dismiss"
            aria-label="Dismiss"
            onClick={() => setUploadError(null)}
          >
            ×
          </button>
        </div>
      )}

      {loadError && (
        <p className="error">Couldn't load documents: {loadError}</p>
      )}

      {items === null && !loadError && <p className="muted">Loading…</p>}

      {items !== null && items.length === 0 && (
        <p className="muted">No documents yet. Create one to get started.</p>
      )}

      {owned.length > 0 && (
        <section>
          <h2 className="section-heading">My documents</h2>
          <ul className="doc-list">
            {owned.map((doc) => (
              <li key={doc.id} className="doc-list-row">
                <Link to={`/documents/${doc.id}`} className="doc-list-item">
                  <span className="doc-title">{doc.title || "Untitled"}</span>
                  <span className="doc-meta">
                    Edited {formatRelative(doc.updatedAt)}
                  </span>
                </Link>
                <div className="doc-row-actions">
                  <button
                    type="button"
                    className="doc-share-btn"
                    onClick={() =>
                      shareFormFor === doc.id
                        ? setShareFormFor(null)
                        : openShareFor(doc.id)
                    }
                    aria-label={`Share ${doc.title || "Untitled"}`}
                  >
                    Share
                  </button>
                  <button
                    type="button"
                    className="doc-delete-btn"
                    onClick={() => handleDelete(doc)}
                    aria-label={`Delete ${doc.title || "Untitled"}`}
                  >
                    Delete
                  </button>
                </div>
                {shareNotice[doc.id] && (
                  <div className="row-notice">{shareNotice[doc.id]}</div>
                )}
                {shareFormFor === doc.id && (
                  <form
                    className="share-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitShare(doc.id);
                    }}
                  >
                    <label htmlFor={`share-target-${doc.id}`} className="muted">
                      Share with
                    </label>
                    <select
                      id={`share-target-${doc.id}`}
                      value={shareTarget}
                      onChange={(e) => setShareTarget(e.target.value)}
                    >
                      {otherUsers.length === 0 && (
                        <option value="">No other users</option>
                      )}
                      {otherUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="primary"
                      disabled={!shareTarget}
                    >
                      Share
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setShareFormFor(null)}
                    >
                      Cancel
                    </button>
                  </form>
                )}
                {rowErrors[doc.id] && (
                  <div className="row-error" role="alert">
                    {rowErrors[doc.id]}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {shared.length > 0 && (
        <section>
          <h2 className="section-heading">Shared with me</h2>
          <ul className="doc-list">
            {shared.map((doc) => (
              <li key={doc.id} className="doc-list-row">
                <Link to={`/documents/${doc.id}`} className="doc-list-item">
                  <span className="doc-title">{doc.title || "Untitled"}</span>
                  <span className="doc-meta">
                    Edited {formatRelative(doc.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function uploadErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    let code: string | undefined;
    try {
      code = (JSON.parse(err.message) as { error?: string }).error;
    } catch {
      // not JSON
    }
    switch (code) {
      case "unsupported_type":
        return "Only .md and .txt files are supported.";
      case "file_too_large":
        return "File is too large. Maximum size is 1 MB.";
      case "parse_failed":
        return "Couldn't read that file. Make sure it's a valid .md or .txt file.";
      case "empty_file":
        return "That file appears to be empty.";
      default:
        return "Upload failed. Please try again.";
    }
  }
  return "Upload failed. Please try again.";
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
