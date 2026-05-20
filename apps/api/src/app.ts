import express, {
  type ErrorRequestHandler,
  type Express,
} from "express";
import cors from "cors";
import { withOwner } from "./documents/owner.js";
import { documentsRouter } from "./documents/routes.js";

export function createApp(): Express {
  const app = express();

  app.use(cors());
  // ProseMirror docs can grow; bump the default 100kb cap.
  app.use(express.json({ limit: "5mb" }));

  app.use("/api/documents", withOwner, documentsRouter);

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error("[api] unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  };
  app.use(errorHandler);

  return app;
}
