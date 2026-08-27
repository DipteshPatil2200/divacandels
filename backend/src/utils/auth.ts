import { createHash } from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";

type Claims = { sub: string; email: string; role: string; type: "access" | "refresh" };

export const hashToken = (value: string) => createHash("sha256").update(value).digest("hex");

export function signToken(id: number, email: string, role: string, type: Claims["type"]) {
  const secret = type === "access" ? env.JWT_ACCESS_SECRET : env.JWT_REFRESH_SECRET;
  const expiresIn = (type === "access" ? env.JWT_ACCESS_EXPIRES_IN : env.JWT_REFRESH_EXPIRES_IN) as SignOptions["expiresIn"];
  return jwt.sign({ email, role, type }, secret, { subject: String(id), expiresIn });
}

export function verifyToken(token: string, type: Claims["type"]) {
  const secret = type === "access" ? env.JWT_ACCESS_SECRET : env.JWT_REFRESH_SECRET;
  const claims = jwt.verify(token, secret) as Claims;
  if (claims.type !== type) throw new Error("Wrong token type");
  return claims;
}
