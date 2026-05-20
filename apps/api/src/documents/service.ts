import { pool } from "../db.js";
import {
  EMPTY_DOC,
  type Document,
  type DocumentListItem,
  type ProseMirrorDoc,
} from "@aajia/shared";

type DocumentRow = {
  id: string;
  owner_id: string;
  title: string;
  content: ProseMirrorDoc;
  created_at: Date;
  updated_at: Date;
};

function rowToDocument(r: DocumentRow): Document {
  return {
    id: r.id,
    ownerId: r.owner_id,
    title: r.title,
    content: r.content,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

// Lists documents the user owns OR has been shared. `isOwner` lets the
// client split into "My documents" vs "Shared with me".
export async function listDocuments(
  userId: string,
): Promise<DocumentListItem[]> {
  const res = await pool.query<{
    id: string;
    title: string;
    updated_at: Date;
    is_owner: boolean;
  }>(
    `SELECT d.id, d.title, d.updated_at, (d.owner_id = $1) AS is_owner
       FROM documents d
      WHERE d.owner_id = $1
         OR EXISTS (
              SELECT 1 FROM document_shares s
               WHERE s.document_id = d.id AND s.user_id = $1
            )
      ORDER BY d.updated_at DESC`,
    [userId],
  );
  return res.rows.map((r) => ({
    id: r.id,
    title: r.title,
    updatedAt: r.updated_at.toISOString(),
    isOwner: r.is_owner,
  }));
}

export async function createDocument(ownerId: string): Promise<Document> {
  const res = await pool.query<DocumentRow>(
    `INSERT INTO documents (owner_id, title, content)
     VALUES ($1, 'Untitled', $2::jsonb)
     RETURNING *`,
    [ownerId, JSON.stringify(EMPTY_DOC)],
  );
  const row = res.rows[0];
  if (!row) throw new Error("createDocument: INSERT returned no rows");
  return rowToDocument(row);
}

export async function createDocumentWithContent(
  ownerId: string,
  title: string,
  content: ProseMirrorDoc,
): Promise<Document> {
  const res = await pool.query<DocumentRow>(
    `INSERT INTO documents (owner_id, title, content)
     VALUES ($1, $2, $3::jsonb)
     RETURNING *`,
    [ownerId, title, JSON.stringify(content)],
  );
  const row = res.rows[0];
  if (!row)
    throw new Error("createDocumentWithContent: INSERT returned no rows");
  return rowToDocument(row);
}

// Returns the doc only if the user can access it (owner OR shared).
// Caller treats null as 404 — don't leak existence.
export async function getDocumentForUser(
  userId: string,
  id: string,
): Promise<Document | null> {
  const res = await pool.query<DocumentRow>(
    `SELECT d.* FROM documents d
      WHERE d.id = $1
        AND (d.owner_id = $2
             OR EXISTS (SELECT 1 FROM document_shares s
                         WHERE s.document_id = d.id AND s.user_id = $2))`,
    [id, userId],
  );
  const row = res.rows[0];
  return row ? rowToDocument(row) : null;
}

// Update if accessible (owner OR shared). Same access rule as GET.
export async function updateDocumentForUser(
  userId: string,
  id: string,
  patch: { title?: string; content?: ProseMirrorDoc },
): Promise<Document | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (patch.title !== undefined) {
    sets.push(`title = $${idx++}`);
    values.push(patch.title);
  }
  if (patch.content !== undefined) {
    sets.push(`content = $${idx++}::jsonb`);
    values.push(JSON.stringify(patch.content));
  }
  sets.push(`updated_at = now()`);

  const idP = `$${idx++}`;
  const userP = `$${idx++}`;
  values.push(id, userId);

  const res = await pool.query<DocumentRow>(
    `UPDATE documents SET ${sets.join(", ")}
      WHERE id = ${idP}
        AND (owner_id = ${userP}
             OR EXISTS (SELECT 1 FROM document_shares s
                         WHERE s.document_id = documents.id AND s.user_id = ${userP}))
      RETURNING *`,
    values,
  );
  const row = res.rows[0];
  return row ? rowToDocument(row) : null;
}

// Returns the owner id for a doc, or null if it doesn't exist.
// Used to distinguish 404 vs 403 in DELETE.
export async function getDocumentOwner(id: string): Promise<string | null> {
  const res = await pool.query<{ owner_id: string }>(
    `SELECT owner_id FROM documents WHERE id = $1`,
    [id],
  );
  return res.rows[0]?.owner_id ?? null;
}

// Owner-only delete. Caller checks ownership first to return 403 vs 404.
export async function deleteDocument(
  ownerId: string,
  id: string,
): Promise<boolean> {
  const res = await pool.query(
    `DELETE FROM documents WHERE id = $1 AND owner_id = $2`,
    [id, ownerId],
  );
  return (res.rowCount ?? 0) > 0;
}

// Idempotent share: no-op if already shared.
export async function shareDocument(
  documentId: string,
  userId: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO document_shares (document_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (document_id, user_id) DO NOTHING`,
    [documentId, userId],
  );
}

export async function listShares(
  documentId: string,
): Promise<{ userId: string }[]> {
  const res = await pool.query<{ user_id: string }>(
    `SELECT user_id FROM document_shares WHERE document_id = $1`,
    [documentId],
  );
  return res.rows.map((r) => ({ userId: r.user_id }));
}
