import { Router } from "express";
import type { ProseMirrorDoc } from "@aajia/shared";
import * as service from "./service.js";
import { patchDocumentBodySchema, uuidParamSchema } from "./schema.js";

export const documentsRouter: Router = Router();

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
    const doc = await service.getDocument(req.ownerId, params.data.id);
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
    // Cast at the validation boundary: zod's structural schema deliberately
    // uses z.unknown() inside arrays (see schema.ts) since we don't deeply
    // validate ProseMirror nodes in phase 1.
    const doc = await service.updateDocument(req.ownerId, params.data.id, {
      title: body.data.title,
      content: body.data.content as ProseMirrorDoc | undefined,
    });
    if (!doc) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(doc);
  } catch (err) {
    next(err);
  }
});
