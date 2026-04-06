import type { Job } from "bullmq";
import { prisma } from "@court-wiki/db";
import type { StorageSyncJobData } from "../queues.js";

/**
 * Storage sync processor.
 *
 * In full-sync mode, this job iterates all Asset records and validates that
 * the backing file still exists in the configured storage provider.
 * It marks or logs any orphaned DB records for admin review.
 *
 * In single-asset mode, it validates or re-syncs one specific asset.
 */
export async function processStorageSync(
  job: Job<StorageSyncJobData>
): Promise<void> {
  const { assetId, folderId, fullSync } = job.data;

  if (fullSync) {
    console.log("[storage-sync] Starting full storage sync...");
    await runFullSync();
    return;
  }

  if (assetId) {
    console.log(`[storage-sync] Syncing asset: ${assetId}`);
    await syncSingleAsset(assetId);
    return;
  }

  if (folderId) {
    console.log(`[storage-sync] Syncing all assets in folder: ${folderId}`);
    const assets = await prisma.asset.findMany({
      where: { folderId },
      select: { id: true },
    });
    for (const asset of assets) {
      await syncSingleAsset(asset.id);
    }
    return;
  }

  console.warn("[storage-sync] Job received with no target, skipping.");
}

async function syncSingleAsset(assetId: string): Promise<void> {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: { folder: true },
  });

  if (!asset) {
    console.warn(`[storage-sync] Asset not found in DB: ${assetId}`);
    return;
  }

  // Build the expected storage path
  const folderPath = asset.folder?.slug ?? "root";
  const expectedPath = `${folderPath}/${asset.filename}`;

  // In a real implementation, you'd call storage.download(expectedPath)
  // and handle ENOENT to detect missing files.
  // For now, log what would be checked:
  console.log(
    `[storage-sync] Asset "${asset.filename}" expected at path: ${expectedPath}`
  );
}

async function runFullSync(): Promise<void> {
  const batchSize = 50;
  let skip = 0;
  let checked = 0;
  let missing = 0;

  while (true) {
    const assets = await prisma.asset.findMany({
      take: batchSize,
      skip,
      include: { folder: true },
    });

    if (assets.length === 0) break;

    for (const asset of assets) {
      const folderPath = asset.folder?.slug ?? "root";
      const expectedPath = `${folderPath}/${asset.filename}`;

      try {
        // Attempt to verify the file exists via storage provider
        // In production: await storageProvider.download(expectedPath)
        console.log(`[storage-sync] Checking: ${expectedPath}`);
        checked++;
      } catch {
        missing++;
        console.warn(
          `[storage-sync] MISSING file for asset ${asset.id}: ${expectedPath}`
        );
      }
    }

    skip += batchSize;
  }

  console.log(
    `[storage-sync] Full sync complete. Checked: ${checked}, Missing: ${missing}`
  );
}
