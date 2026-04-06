import { Queue } from "bullmq";
import type { ConnectionOptions } from "bullmq";

export const connection: ConnectionOptions = {
  url: process.env["REDIS_URL"] ?? "redis://localhost:6379",
};

// ─── Queue definitions ────────────────────────────────────────────────────────

/**
 * PAGE_TREE queue: rebuild the navigation tree after page changes.
 */
export interface PageTreeJobData {
  locale?: string;
  triggeredByPageId?: string;
}

export const pageTreeQueue = new Queue<PageTreeJobData>("page-tree", {
  connection,
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  },
});

/**
 * STORAGE_SYNC queue: sync assets from one storage backend to another,
 * or validate that stored files still exist.
 */
export interface StorageSyncJobData {
  assetId?: string;
  folderId?: string;
  fullSync?: boolean;
}

export const storageSyncQueue = new Queue<StorageSyncJobData>("storage-sync", {
  connection,
  defaultJobOptions: {
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 25 },
    attempts: 2,
    backoff: { type: "fixed", delay: 5000 },
  },
});

/**
 * CLEANUP queue: purge temporary files, orphaned assets, expired API keys.
 */
export interface CleanupJobData {
  type: "temp-files" | "orphaned-assets" | "expired-api-keys" | "all";
}

export const cleanupQueue = new Queue<CleanupJobData>("cleanup", {
  connection,
  defaultJobOptions: {
    removeOnComplete: { count: 20 },
    removeOnFail: { count: 10 },
    attempts: 2,
    backoff: { type: "fixed", delay: 10000 },
  },
});

/**
 * SEARCH_INDEX queue: re-index a page after content changes.
 */
export interface SearchIndexJobData {
  pageId: string;
  action: "index" | "delete";
}

export const searchIndexQueue = new Queue<SearchIndexJobData>("search-index", {
  connection,
  defaultJobOptions: {
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 50 },
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
  },
});

export const allQueues = [
  pageTreeQueue,
  storageSyncQueue,
  cleanupQueue,
  searchIndexQueue,
];
