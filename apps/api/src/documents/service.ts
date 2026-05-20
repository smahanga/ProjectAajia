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

export async function listDocuments(
  ownerId: string,
): Promise<DocumentListItem[]> {
  const res = await pool.query<{
    id: string;
    title: string;
    updated_at: Date;
  }>(
    `SELECT id, title, updated_at
       FROM documents
      WHERE owner_id = $1
      ORDER BY updated_at DESC`,
    [ownerId],
  );
  return res.rows.map((r) => ({
    id: r.id,
    title: r.title,
    updatedAt: r.updated_at.toISOString(),
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
  if (!row) {
    throw new Error("createDocument: INSERT returned no rows");
  }
  return rowToDocument(row);
}

export async function getDocument(
  ownerId: string,
  id: string,
): Promise<Document | null> {
  const res = await pool.query<DocumentRow>(
    `SELECT * FROM documents WHERE id = $1 AND owner_id = $2`,
    [id, ownerId],
  );
  const row = res.rows[0];
  return row ? rowToDocument(row) : null;
}

export async function updateDocument(
  ownerId: string,
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

  const idPlaceholder = `$${idx++}`;
  const ownerPlaceholder = `$${idx++}`;
  values.push(id, ownerId);

  const res = await pool.query<DocumentRow>(
    `UPDATE documents SET ${sets.join(", ")}
      WHERE id = ${idPlaceholder} AND owner_id = ${ownerPlaceholder}
      RETURNING *`,
    values,
  );
  const row = res.rows[0];
  return row ? rowToDocument(row) : null;
}

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
