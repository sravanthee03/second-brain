// apps/backend/src/middleware/authJwt.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "replace_with_your_secret";

export interface AuthedRequest extends Request {
  userId?: string;
}

export function authJwt(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers?.authorization;
    if (!authHeader) {
      // allow anonymous (dev mode) — don't set userId
      return next();
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({ error: "invalid auth header" });
    }

    const token = parts[1];
    const payload = jwt.verify(token, JWT_SECRET) as any;
    // expect payload.id to exist (you used jwt.sign({ id }, ...))
    if (payload && payload.id) {
      req.userId = String(payload.id);
    }
    return next();
  } catch (err) {
    console.error("authJwt error:", err);
    // don't reject immediately — if token invalid, treat as unauthenticated
    return res.status(401).json({ error: "invalid token" });
  }
}
