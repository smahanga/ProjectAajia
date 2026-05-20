import type { Request, Response, NextFunction } from "express";
import { config } from "../config.js";

declare module "express-serve-static-core" {
  interface Request {
    ownerId: string;
  }
}

// Phase 1 placeholder. Single seam to swap for real auth later: replace this
// middleware with one that reads the user from a session/JWT/etc.
export function withOwner(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  req.ownerId = config.placeholderUserId;
  next();
}
