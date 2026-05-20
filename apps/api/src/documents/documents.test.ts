import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { pool } from "../db.js";

const app = createApp();
const OWNER = process.env.PLACEHOLDER_USER_ID;
if (!OWNER) {
  throw new Error("PLACEHOLDER_USER_ID must be set for tests");
}

beforeEach(async () => {
  await pool.query("TRUNCATE documents CASCADE");
});

afterAll(async () => {
  await pool.end();
});

describe("documents API", () => {
  it("POST /api/documents creates an empty doc", async () => {
    const res = await request(app).post("/api/documents").send();
    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(res.body.title).toBe("Untitled");
    expect(res.body.ownerId).toBe(OWNER);
    expect(res.body.content).toEqual({ type: "doc", content: [] });
  });

  it("GET /api/documents lists docs without content", async () => {
    await request(app).post("/api/documents").send();
    await request(app).post("/api/documents").send();

    const res = await request(app).get("/api/documents");
    expect(res.status).toBe(200);
    expect(res.body.documents).toHaveLength(2);
    for (const item of res.body.documents) {
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("title");
      expect(item).toHaveProperty("updatedAt");
      expect(item).not.toHaveProperty("content");
    }
  });

  it("GET /api/documents/:id returns full doc", async () => {
    const created = await request(app).post("/api/documents").send();
    const res = await request(app).get(`/api/documents/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
    expect(res.body.content).toEqual({ type: "doc", content: [] });
  });

  it("PATCH /api/documents/:id updates title and content", async () => {
    const created = await request(app).post("/api/documents").send();
    const newContent = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "hi" }] },
      ],
    };
    const res = await request(app)
      .patch(`/api/documents/${created.body.id}`)
      .send({ title: "Hello", content: newContent });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Hello");
    expect(res.body.content).toEqual(newContent);
  });

  it("DELETE /api/documents/:id returns 204 and removes the doc", async () => {
    const created = await request(app).post("/api/documents").send();
    const del = await request(app).delete(`/api/documents/${created.body.id}`);
    expect(del.status).toBe(204);

    const get = await request(app).get(`/api/documents/${created.body.id}`);
    expect(get.status).toBe(404);
  });

  it("PATCH on another user's doc returns 404 (owner scoping)", async () => {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO documents (owner_id, title) VALUES ('other-user', 'Theirs') RETURNING id`,
    );
    const otherId = rows[0]?.id;
    expect(otherId).toBeDefined();

    const res = await request(app)
      .patch(`/api/documents/${otherId}`)
      .send({ title: "Hijacked" });
    expect(res.status).toBe(404);
  });
});
