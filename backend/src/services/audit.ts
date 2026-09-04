import type { Request } from "express";
import { db } from "../config/database.js";

export async function audit(req: Request, action: string, entityType: string, entityId?: string, previousData?: unknown, newData?: unknown) {
  await db.auditLog.create({ data: {
    adminUserId: req.admin?.id,
    action,
    entityType,
    entityId,
    previousData: previousData === undefined ? null : JSON.stringify(previousData),
    newData: newData === undefined ? null : JSON.stringify(newData),
    ipAddress: req.ip,
    userAgent: req.header("user-agent")?.slice(0, 500)
  }});
}
