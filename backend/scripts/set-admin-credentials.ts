import bcrypt from "bcryptjs";
import { db } from "../src/config/database.js";

const email = process.env.NEW_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.NEW_ADMIN_PASSWORD;
const name = process.env.NEW_ADMIN_NAME?.trim() || "DIVA Candles Administrator";
if (!email || !password) throw new Error("Set NEW_ADMIN_EMAIL and NEW_ADMIN_PASSWORD before running this script.");
if (password.length < 14 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) throw new Error("Admin password must be 14+ characters with uppercase, lowercase, number and symbol.");

const passwordHash = await bcrypt.hash(password, 12);
const admin = await db.adminUser.upsert({
  where: { email },
  update: { name, passwordHash, role: "SUPER_ADMIN", isActive: true, mustChangePassword: false, failedLoginAttempts: 0, lockedUntil: null },
  create: { name, email, passwordHash, role: "SUPER_ADMIN", isActive: true, mustChangePassword: false }
});
await db.refreshToken.updateMany({ where: { adminId: admin.id, revokedAt: null }, data: { revokedAt: new Date() } });
console.log(`Admin account ready: ${admin.email}`);
await db.$disconnect();
