import type { Request, Response, NextFunction } from "express";
import { config } from "../config.js";

declare module "express-serve-static-core" {
  interface Request {
    ownerId: string;
  }
}

// Phase 3: reads current user from `x-user-id` header (sent by the
// frontend's user switcher). Falls back to PLACEHOLDER_USER_ID so curl
// and the upload smoke path keep working. Real auth is still the next
// swap point.
export function withOwner(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.header("x-user-id");
  req.ownerId =
    typeof header === "string" && header.length > 0
      ? header
      : config.placeholderUserId;
  next();
}
