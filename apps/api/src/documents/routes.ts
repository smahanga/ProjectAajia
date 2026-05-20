import { Router } from "express";
import { z } from "zod";
import type { ProseMirrorDoc } from "@aajia/shared";
import { findUser } from "../config.js";
import * as service from "./service.js";
import { patchDocumentBodySchema, uuidParamSchema } from "./schema.js";
import { uploadHandler, uploadMiddleware } from "./upload.js";

export const documentsRouter: Router = Router();

documentsRouter.post("/upload", uploadMiddleware, uploadHandler);

documentsRouter.get("/", async (req, res, next) => {
  try {
    const documents = await service.listDocuments(req.ownerId);
    res.json({ documents });
  } catch (err) {
    next(err);
  }
});

documentsRouter.post("/", async (req, res, next) => {
  try {
    const doc = await service.createDocument(req.ownerId);
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
});

documentsRouter.get("/:id", async (req, res, next) => {
  try {
    const params = uuidParamSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid document id" });
      return;
    }
    const doc = await service.getDocumentForUser(
      req.ownerId,
      params.data.id,
    );
    if (!doc) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

documentsRouter.delete("/:id", async (req, res, next) => {
  try {
    const params = uuidParamSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid document id" });
      return;
    }
    // Distinguish 404 (no such doc) vs 403 (exists but not owned) so a
    // shared user gets the correct signal.
    const ownerId = await service.getDocumentOwner(params.data.id);
    if (!ownerId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (ownerId !== req.ownerId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const deleted = await service.deleteDocument(req.ownerId, params.data.id);
    if (!deleted) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

documentsRouter.patch("/:id", async (req, res, next) => {
  try {
    const params = uuidParamSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid document id" });
      return;
    }
    const body = patchDocumentBodySchema.safeParse(req.body);
    if (!body.success) {
      res
        .status(400)
        .json({ error: "Invalid body", details: body.error.issues });
      return;
    }
    const doc = await service.updateDocumentForUser(
      req.ownerId,
      params.data.id,
      {
        title: body.data.title,
        content: body.data.content as ProseMirrorDoc | undefined,
      },
    );
    if (!doc) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

// --- Shares ---

const shareBodySchema = z.object({
  userId: z.string().min(1),
});

documentsRouter.post("/:id/shares", async (req, res, next) => {
  try {
    const params = uuidParamSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid document id" });
      return;
    }
    const body = shareBodySchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Invalid body" });
      return;
    }

    const ownerId = await service.getDocumentOwner(params.data.id);
    if (!ownerId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (ownerId !== req.ownerId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (body.data.userId === req.ownerId) {
      res.status(400).json({ error: "Cannot share with yourself" });
      return;
    }
    if (!findUser(body.data.userId)) {
      res.status(404).json({ error: "Unknown user" });
      return;
    }

    await service.shareDocument(params.data.id, body.data.userId);
    res.status(201).json({
      documentId: params.data.id,
      userId: body.data.userId,
    });
  } catch (err) {
    next(err);
  }
});

documentsRouter.get("/:id/shares", async (req, res, next) => {
  try {
    const params = uuidParamSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid document id" });
      return;
    }
    const ownerId = await service.getDocumentOwner(params.data.id);
    if (!ownerId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (ownerId !== req.ownerId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const shares = await service.listShares(params.data.id);
    const enriched = shares.map((s) => ({
      userId: s.userId,
      name: findUser(s.userId)?.name ?? s.userId,
    }));
    res.json({ shares: enriched });
  } catch (err) {
    next(err);
  }
});
