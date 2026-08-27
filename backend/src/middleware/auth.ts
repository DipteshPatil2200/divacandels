import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/http.js";
import { verifyToken } from "../utils/auth.js";

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = req.cookies?.accessToken ?? (header?.startsWith("Bearer ") ? header.slice(7) : undefined);
  if (!token) return next(new AppError(401, "Authentication required", "UNAUTHENTICATED"));
  try {
    const claims = verifyToken(token, "access");
    req.admin = { id: Number(claims.sub), email: claims.email, role: claims.role };
    return next();
  } catch {
    return next(new AppError(401, "Session expired", "SESSION_EXPIRED"));
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.admin || !roles.includes(req.admin.role)) return next(new AppError(403, "Insufficient permission", "FORBIDDEN"));
    next();
  };
}
