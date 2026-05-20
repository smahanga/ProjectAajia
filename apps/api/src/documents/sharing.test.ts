import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { pool } from "../db.js";

const app = createApp();

const ALICE = "user-alice";
const BOB = "user-bob";
const CAROL = "user-carol"; // not in the known USERS list

async function asUser(userId: string, makeReq: ReturnType<typeof request>) {
  return makeReq;
}
void asUser; // (unused helper kept for readability)

beforeEach(async () => {
  await pool.query("TRUNCATE documents CASCADE");
});

afterAll(async () => {
  await pool.end();
});

describe("sharing", () => {
  it("Bob sees and can edit a doc Alice shared with him; can't delete; Carol can't see it", async () => {
    // Alice creates a doc
    const created = await request(app)
      .post("/api/documents")
      .set("x-user-id", ALICE)
      .send();
    expect(created.status).toBe(201);
    const docId = created.body.id;

    // Alice shares with Bob
    const shared = await request(app)
      .post(`/api/documents/${docId}/shares`)
      .set("x-user-id", ALICE)
      .send({ userId: BOB });
    expect(shared.status).toBe(201);

    // Bob's list includes it with isOwner: false
    const bobList = await request(app)
      .get("/api/documents")
      .set("x-user-id", BOB);
    expect(bobList.status).toBe(200);
    const item = bobList.body.documents.find(
      (d: { id: string }) => d.id === docId,
    );
    expect(item).toBeDefined();
    expect(item.isOwner).toBe(false);

    // Bob can PATCH it
    const patched = await request(app)
      .patch(`/api/documents/${docId}`)
      .set("x-user-id", BOB)
      .send({ title: "Bob edited" });
    expect(patched.status).toBe(200);
    expect(patched.body.title).toBe("Bob edited");

    // Bob CANNOT DELETE it
    const bobDel = await request(app)
      .delete(`/api/documents/${docId}`)
      .set("x-user-id", BOB);
    expect(bobDel.status).toBe(403);

    // Carol gets 404 on GET (don't leak existence)
    const carolGet = await request(app)
      .get(`/api/documents/${docId}`)
      .set("x-user-id", CAROL);
    expect(carolGet.status).toBe(404);
  });

  it("can't share with yourself", async () => {
    const created = await request(app)
      .post("/api/documents")
      .set("x-user-id", ALICE)
      .send();
    const res = await request(app)
      .post(`/api/documents/${created.body.id}/shares`)
      .set("x-user-id", ALICE)
      .send({ userId: ALICE });
    expect(res.status).toBe(400);
  });

  it("share is idempotent", async () => {
    const created = await request(app)
      .post("/api/documents")
      .set("x-user-id", ALICE)
      .send();
    const first = await request(app)
      .post(`/api/documents/${created.body.id}/shares`)
      .set("x-user-id", ALICE)
      .send({ userId: BOB });
    expect(first.status).toBe(201);
    const second = await request(app)
      .post(`/api/documents/${created.body.id}/shares`)
      .set("x-user-id", ALICE)
      .send({ userId: BOB });
    expect(second.status).toBe(201);
  });
});
