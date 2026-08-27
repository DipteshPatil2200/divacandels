import { env } from "../config/env.js";
import { prisma } from "../config/database.js";

const CLEANUP_THRESHOLD_PERCENTAGE = 80;
const EXPRESS_LIMIT_BYTES = 10 * 1024 * 1024 * 1024;

type StorageRow = {
  edition: string | null;
  databaseMaxBytes: bigint | number | null;
  usedBytes: bigint | number | null;
  allocatedBytes: bigint | number | null;
  fileMaxBytes: bigint | number | null;
};

const asNumber = (value: bigint | number | null | undefined) => value == null ? 0 : Number(value);
const round = (value: number, digits = 2) => Number(value.toFixed(digits));
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

async function readStorage() {
  const [row] = await prisma.$queryRaw<StorageRow[]>`
    SELECT
      CAST(SERVERPROPERTY('Edition') AS NVARCHAR(128)) AS edition,
      CAST(DATABASEPROPERTYEX(DB_NAME(), 'MaxSizeInBytes') AS BIGINT) AS databaseMaxBytes,
      SUM(CAST(FILEPROPERTY(name, 'SpaceUsed') AS BIGINT)) * 8192 AS usedBytes,
      SUM(CAST(size AS BIGINT)) * 8192 AS allocatedBytes,
      SUM(CASE WHEN max_size = -1 THEN 0 ELSE CAST(max_size AS BIGINT) END) * 8192 AS fileMaxBytes
    FROM sys.database_files
    WHERE type_desc = 'ROWS'
  `;

  const usedBytes = asNumber(row?.usedBytes);
  const allocatedBytes = asNumber(row?.allocatedBytes);
  const databaseMaxBytes = asNumber(row?.databaseMaxBytes);
  const fileMaxBytes = asNumber(row?.fileMaxBytes);
  const configuredMaxBytes = env.DB_STORAGE_LIMIT_MB ? env.DB_STORAGE_LIMIT_MB * 1024 * 1024 : 0;
  const isExpress = row?.edition?.toLowerCase().includes("express") ?? false;
  const maxBytes = databaseMaxBytes || configuredMaxBytes || fileMaxBytes || (isExpress ? EXPRESS_LIMIT_BYTES : 0);
  const usagePercentage = maxBytes > 0 ? round(Math.min(100, usedBytes / maxBytes * 100)) : null;

  return {
    edition: row?.edition ?? "Microsoft SQL Server",
    usedBytes,
    allocatedBytes,
    maxBytes: maxBytes || null,
    usedMB: round(usedBytes / 1024 / 1024),
    allocatedMB: round(allocatedBytes / 1024 / 1024),
    maxMB: maxBytes ? round(maxBytes / 1024 / 1024) : null,
    usagePercentage,
    status: usagePercentage == null ? "UNKNOWN" : usagePercentage >= CLEANUP_THRESHOLD_PERCENTAGE ? "CRITICAL" : usagePercentage >= 65 ? "WARNING" : "HEALTHY"
  };
}

async function readCleanupCandidates() {
  const now = new Date();
  const clickCutoff = daysAgo(365);
  const auditCutoff = daysAgo(730);
  const [expiredSessions, oldClickEvents, oldAuditLogs] = await prisma.$transaction([
    prisma.refreshToken.count({ where: { OR: [{ expiresAt: { lt: now } }, { revokedAt: { not: null } }] } }),
    prisma.clickEvent.count({ where: { createdAt: { lt: clickCutoff } } }),
    prisma.auditLog.count({ where: { createdAt: { lt: auditCutoff } } })
  ]);
  return { expiredSessions, oldClickEvents, oldAuditLogs, total: expiredSessions + oldClickEvents + oldAuditLogs };
}

export async function getDatabaseMaintenanceStatus() {
  const [storage, candidates] = await Promise.all([readStorage(), readCleanupCandidates()]);
  return {
    storage,
    cleanup: {
      thresholdPercentage: CLEANUP_THRESHOLD_PERCENTAGE,
      canRun: storage.usagePercentage != null && storage.usagePercentage >= CLEANUP_THRESHOLD_PERCENTAGE,
      candidates,
      retentionPolicy: {
        clickAnalyticsDays: 365,
        auditLogDays: 730
      },
      protectedData: ["Product and candle photos", "Products and categories", "Orders and payments", "Customer inquiries"]
    }
  };
}

export async function runSafeDatabaseCleanup() {
  const before = await getDatabaseMaintenanceStatus();
  if (!before.cleanup.canRun) return { allowed: false as const, before };
  const now = new Date();
  const clickCutoff = daysAgo(before.cleanup.retentionPolicy.clickAnalyticsDays);
  const auditCutoff = daysAgo(before.cleanup.retentionPolicy.auditLogDays);
  const [sessions, clickEvents, auditLogs] = await prisma.$transaction([
    prisma.refreshToken.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { revokedAt: { not: null } }] } }),
    prisma.clickEvent.deleteMany({ where: { createdAt: { lt: clickCutoff } } }),
    prisma.auditLog.deleteMany({ where: { createdAt: { lt: auditCutoff } } })
  ]);
  const after = await getDatabaseMaintenanceStatus();
  return { allowed: true as const, deleted: { expiredSessions: sessions.count, oldClickEvents: clickEvents.count, oldAuditLogs: auditLogs.count, total: sessions.count + clickEvents.count + auditLogs.count }, before, after };
}
