import path from "node:path";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import multer from "multer";
import * as service from "./service.js";
import { parseUpload, type UploadFormat } from "./parser.js";

const MAX_BYTES = 1 * 1024 * 1024; // 1 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
});

// Wraps multer so its errors come back as proper HTTP responses instead of
// bubbling up to the generic error handler as 500s.
export const uploadMiddleware: RequestHandler = (req, res, next) => {
  upload.single("file")(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res
          .status(413)
          .json({ error: "file_too_large", maxBytes: MAX_BYTES });
        return;
      }
      res.status(400).json({ error: "malformed_upload" });
      return;
    }
    if (err) {
      next(err);
      return;
    }
    next();
  });
};

export async function uploadHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: "empty_file" });
      return;
    }

    const filename = req.file.originalname;
    const ext = path.extname(filename).toLowerCase();
    if (ext !== ".md" && ext !== ".txt") {
      res.status(400).json({ error: "unsupported_type" });
      return;
    }

    const format: UploadFormat = ext === ".md" ? "md" : "txt";
    const content = req.file.buffer.toString("utf-8");

    const result = parseUpload(format, content);
    if (!result.ok) {
      if (result.reason === "empty") {
        res.status(400).json({ error: "empty_file" });
        return;
      }
      res.status(400).json({ error: "parse_failed" });
      return;
    }

    const title = path.basename(filename, ext) || "Untitled";
    const doc = await service.createDocumentWithContent(
      req.ownerId,
      title,
      result.doc,
    );
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
}
