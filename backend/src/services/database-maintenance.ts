import { databaseStorage, db } from "../config/database.js";
import { env } from "../config/env.js";

const WARNING_THRESHOLD_PERCENTAGE = 80;
const CRITICAL_THRESHOLD_PERCENTAGE = 90;
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

async function readStorage() {
  const stats = await databaseStorage();
  const usedBytes = stats.storageSize;
  const maxBytes = stats.maxBytes;
  const usagePercentage = maxBytes ? Math.min(100, Number(((usedBytes / maxBytes) * 100).toFixed(2))) : null;
  return {
    engine: "MongoDB",
    usedBytes,
    allocatedBytes: stats.storageSize,
    maxBytes,
    usedMB: Number((usedBytes / 1024 / 1024).toFixed(2)),
    allocatedMB: Number((stats.storageSize / 1024 / 1024).toFixed(2)),
    maxMB: maxBytes ? Number((maxBytes / 1024 / 1024).toFixed(2)) : null,
    availableMB: maxBytes ? Number(Math.max(0, (maxBytes - usedBytes) / 1024 / 1024).toFixed(2)) : null,
    usagePercentage,
    status: usagePercentage == null ? "UNKNOWN" : usagePercentage >= CRITICAL_THRESHOLD_PERCENTAGE ? "CRITICAL" : usagePercentage >= WARNING_THRESHOLD_PERCENTAGE ? "WARNING" : usagePercentage >= 70 ? "MONITOR" : "HEALTHY",
    collections: stats.collections
  };
}

async function readCleanupCandidates() {
  const applicationLogs = await db.applicationLog.count({ where: { createdAt: { lt: daysAgo(env.LOG_RETENTION_DAYS) } } });
  return { applicationLogs, total: applicationLogs };
}

export async function getDatabaseMaintenanceStatus() {
  const [storage, candidates] = await Promise.all([readStorage(), readCleanupCandidates()]);
  return {
    storage,
    cleanup: {
      thresholdPercentage: WARNING_THRESHOLD_PERCENTAGE,
      canRun: true,
      candidates,
      retentionPolicy: { applicationLogDays: env.LOG_RETENTION_DAYS },
      allowedLogSources: ["application_logs"],
      protectedData: ["Customer and admin users", "Products and inventory", "Orders and payments", "Inquiries and contact submissions", "Analytics", "Settings", "Audit logs"]
    }
  };
}

export async function runSafeDatabaseCleanup() {
  const cutoff = daysAgo(env.LOG_RETENTION_DAYS);
  const result = await db.applicationLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  const after = await getDatabaseMaintenanceStatus();
  return { allowed: true as const, deletedLogs: result.count, message: "Old application log records were successfully cleaned.", after };
}
