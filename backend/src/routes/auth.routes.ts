import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../config/database.js";
import { env } from "../config/env.js";
import { requireAdmin } from "../middleware/auth.js";
import { hashToken, signToken, verifyToken } from "../utils/auth.js";
import { AppError, asyncHandler } from "../utils/http.js";

export const authRouter = Router();
const credentials = z.object({ email: z.string().email().transform((v) => v.toLowerCase()), password: z.string().min(8).max(200) });
const cookieBase = { httpOnly: true, secure: env.COOKIE_SECURE, sameSite: "strict" as const, path: "/api/v1/admin/auth" };

function setSession(res: import("express").Response, user: { id: number; email: string; role: string }) {
  const access = signToken(user.id, user.email, user.role, "access");
  const refresh = signToken(user.id, user.email, user.role, "refresh");
  res.cookie("accessToken", access, { ...cookieBase, path: "/", maxAge: 15 * 60 * 1000 });
  res.cookie("refreshToken", refresh, { ...cookieBase, maxAge: 7 * 24 * 60 * 60 * 1000 });
  return refresh;
}

authRouter.post("/login", asyncHandler(async (req, res) => {
  const input = credentials.parse(req.body);
  const user = await db.adminUser.findUnique({ where: { email: input.email } });
  if (!user || !user.isActive || (user.lockedUntil && user.lockedUntil > new Date())) throw new AppError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  if (!(await bcrypt.compare(input.password, user.passwordHash))) {
    const attempts = user.failedLoginAttempts + 1;
    await db.adminUser.update({ where: { id: user.id }, data: { failedLoginAttempts: attempts, lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null } });
    throw new AppError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }
  const refresh = setSession(res, user);
  await db.$transaction([
    db.refreshToken.create({ data: { tokenHash: hashToken(refresh), expiresAt: new Date(Date.now() + 7 * 86400000), adminId: user.id } }),
    db.adminUser.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() } })
  ]);
  res.json({ success: true, data: { id: user.id, name: user.name, email: user.email, role: user.role, mustChangePassword: user.mustChangePassword } });
}));

authRouter.post("/refresh", asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken as string | undefined;
  if (!token) throw new AppError(401, "Refresh token required", "UNAUTHENTICATED");
  let claims;
  try { claims = verifyToken(token, "refresh"); } catch { throw new AppError(401, "Session expired", "SESSION_EXPIRED"); }
  const stored = await db.refreshToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { admin: true } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date() || !stored.admin.isActive) throw new AppError(401, "Session expired", "SESSION_EXPIRED");
  const nextRefresh = setSession(res, { id: Number(claims.sub), email: claims.email, role: claims.role });
  await db.$transaction([
    db.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } }),
    db.refreshToken.create({ data: { tokenHash: hashToken(nextRefresh), expiresAt: new Date(Date.now() + 7 * 86400000), adminId: stored.adminId } })
  ]);
  res.json({ success: true });
}));

authRouter.post("/logout", asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken as string | undefined;
  if (token) await db.refreshToken.updateMany({ where: { tokenHash: hashToken(token), revokedAt: null }, data: { revokedAt: new Date() } });
  res.clearCookie("accessToken", { ...cookieBase, path: "/" });
  res.clearCookie("refreshToken", cookieBase);
  res.json({ success: true });
}));

authRouter.get("/me", requireAdmin, asyncHandler(async (req, res) => {
  const user = await db.adminUser.findUnique({ where: { id: req.admin!.id }, select: { id: true, name: true, email: true, role: true, mustChangePassword: true } });
  res.json({ success: true, data: user });
}));

authRouter.post("/change-password", requireAdmin, asyncHandler(async (req, res) => {
  const input = z.object({ currentPassword: z.string(), newPassword: z.string().min(12).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/) }).parse(req.body);
  const user = await db.adminUser.findUniqueOrThrow({ where: { id: req.admin!.id } });
  if (!(await bcrypt.compare(input.currentPassword, user.passwordHash))) throw new AppError(400, "Current password is incorrect", "INVALID_PASSWORD");
  await db.adminUser.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(input.newPassword, 12), mustChangePassword: false } });
  await db.refreshToken.updateMany({ where: { adminId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  res.json({ success: true });
}));
