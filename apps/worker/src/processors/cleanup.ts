import type { Job } from "bullmq";
import { prisma } from "@court-wiki/db";
import type { CleanupJobData } from "../queues.js";

/**
 * Cleanup processor.
 * Handles purging of temp files, orphaned assets, expired API keys, etc.
 */
export async function processCleanup(
  job: Job<CleanupJobData>
): Promise<void> {
  const { type } = job.data;

  console.log(`[cleanup] Starting cleanup: type=${type}`);

  switch (type) {
    case "temp-files":
      await cleanTempFiles();
      break;
    case "orphaned-assets":
      await cleanOrphanedAssets();
      break;
    case "expired-api-keys":
      await cleanExpiredApiKeys();
      break;
    case "all":
      await Promise.all([
        cleanTempFiles(),
        cleanOrphanedAssets(),
        cleanExpiredApiKeys(),
      ]);
      break;
    default:
      console.warn(`[cleanup] Unknown cleanup type: ${type as string}`);
  }

  console.log(`[cleanup] Done: type=${type}`);
}

/**
 * Remove temporary files older than 24 hours from the uploads temp directory.
 * In a real system, this would scan a `tmp/` directory in the storage provider.
 */
async function cleanTempFiles(): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h ago

  // In a real implementation:
  // const tmpFiles = await storageProvider.list("tmp/");
  // for (const file of tmpFiles) {
  //   if (new Date(file.lastModified) < cutoff) {
  //     await storageProvider.delete(file.path);
  //   }
  // }

  console.log(
    `[cleanup:temp-files] Would remove temp files older than ${cutoff.toISOString()}`
  );
}

/**
 * Find assets in the DB that no longer have a corresponding file in storage.
 * Optionally mark or delete the orphaned DB records.
 */
async function cleanOrphanedAssets(): Promise<void> {
  // Find assets without a folder that are older than 7 days
  // (might indicate failed uploads)
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const candidates = await prisma.asset.findMany({
    where: {
      folderId: null,
      createdAt: { lt: cutoff },
    },
    take: 100,
  });

  if (candidates.length === 0) {
    console.log("[cleanup:orphaned-assets] No orphaned assets found.");
    return;
  }

  console.log(
    `[cleanup:orphaned-assets] Found ${candidates.length} potentially orphaned assets. ` +
      `Review these asset IDs: ${candidates.map((a) => a.id).join(", ")}`
  );

  // In production you would verify each one against the storage backend
  // and delete confirmed orphans.
}

/**
 * Deactivate or delete API keys that have passed their expiration date.
 */
async function cleanExpiredApiKeys(): Promise<void> {
  const now = new Date();

  const result = await prisma.apiKey.updateMany({
    where: {
      isActive: true,
      expiration: { lte: now },
    },
    data: { isActive: false },
  });

  if (result.count > 0) {
    console.log(
      `[cleanup:expired-api-keys] Deactivated ${result.count} expired API key(s).`
    );
  } else {
    console.log("[cleanup:expired-api-keys] No expired API keys found.");
  }
}
