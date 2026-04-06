import { Worker, type Job } from "bullmq";
import {
  connection,
  pageTreeQueue,
  storageSyncQueue,
  cleanupQueue,
  searchIndexQueue,
  allQueues,
  type PageTreeJobData,
  type StorageSyncJobData,
  type CleanupJobData,
  type SearchIndexJobData,
} from "./queues.js";
import { processPageTree } from "./processors/page-tree.js";
import { processStorageSync } from "./processors/storage-sync.js";
import { processCleanup } from "./processors/cleanup.js";
import { createSearchProvider } from "@court-wiki/search";
import { prisma } from "@court-wiki/db";

// ─── Search index processor ───────────────────────────────────────────────────

async function processSearchIndex(job: Job<SearchIndexJobData>): Promise<void> {
  const { pageId, action } = job.data;
  console.log(`[search-index] ${action} page: ${pageId}`);

  const providerType =
    (process.env["SEARCH_PROVIDER"] as "typesense" | "postgres" | undefined) ??
    "postgres";

  const provider = await createSearchProvider(
    providerType === "typesense"
      ? {
          provider: "typesense",
          typesense: {
            host: process.env["TYPESENSE_HOST"] ?? "localhost",
            port: parseInt(process.env["TYPESENSE_PORT"] ?? "8108", 10),
            apiKey: process.env["TYPESENSE_API_KEY"] ?? "",
            protocol: "http",
          },
        }
      : { provider: "postgres" }
  );

  if (action === "delete") {
    await provider.delete(pageId);
    console.log(`[search-index] Removed page ${pageId} from index.`);
    return;
  }

  const page = await prisma.page.findUnique({
    where: { id: pageId },
    include: {
      author: { select: { name: true } },
      tags: { include: { tag: true } },
    },
  });

  if (!page) {
    console.warn(`[search-index] Page not found: ${pageId}`);
    return;
  }

  await provider.index({
    pageId: page.id,
    path: page.path,
    title: page.title,
    description: page.description,
    content: page.content,
    locale: page.locale,
    tags: page.tags.map((pt) => pt.tag.name),
    authorName: page.author.name,
    updatedAt: page.updatedAt,
  });

  console.log(`[search-index] Indexed page: ${page.path}`);
}

// ─── Workers ──────────────────────────────────────────────────────────────────

const workers: Worker[] = [];

function createWorker<T>(
  queueName: string,
  processor: (job: Job<T>) => Promise<void>,
  concurrency = 2
): Worker<T> {
  const worker = new Worker<T>(queueName, processor, {
    connection,
    concurrency,
  });

  worker.on("completed", (job) => {
    console.log(`[${queueName}] Job ${job.id} completed.`);
  });

  worker.on("failed", (job, err) => {
    console.error(
      `[${queueName}] Job ${job?.id ?? "unknown"} failed:`,
      err.message
    );
  });

  worker.on("error", (err) => {
    console.error(`[${queueName}] Worker error:`, err.message);
  });

  return worker;
}

// ─── Schedule recurring jobs ──────────────────────────────────────────────────

async function scheduleRecurringJobs(): Promise<void> {
  // Clean up expired API keys and temp files every 6 hours
  await cleanupQueue.add(
    "scheduled-cleanup",
    { type: "all" },
    {
      repeat: { pattern: "0 */6 * * *" }, // every 6 hours
      jobId: "scheduled-cleanup",
    }
  );

  // Rebuild nav tree daily at midnight
  await pageTreeQueue.add(
    "daily-tree-rebuild",
    {},
    {
      repeat: { pattern: "0 0 * * *" },
      jobId: "daily-tree-rebuild",
    }
  );

  console.log("[worker] Recurring jobs scheduled.");
}

// ─── Startup ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("[worker] Court Wiki background worker starting...");
  console.log(
    `[worker] Redis URL: ${(process.env["REDIS_URL"] ?? "redis://localhost:6379").replace(/:([^@]+)@/, ":***@")}`
  );

  // Verify DB connection
  await prisma.$connect();
  console.log("[worker] Database connection established.");

  // Register workers
  workers.push(
    createWorker<PageTreeJobData>("page-tree", processPageTree, 1),
    createWorker<StorageSyncJobData>("storage-sync", processStorageSync, 2),
    createWorker<CleanupJobData>("cleanup", processCleanup, 1),
    createWorker<SearchIndexJobData>("search-index", processSearchIndex, 4)
  );

  console.log(`[worker] ${workers.length} workers registered.`);

  await scheduleRecurringJobs();

  console.log("[worker] Ready and listening for jobs.");
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  console.log(`\n[worker] Received ${signal}. Shutting down gracefully...`);

  try {
    // Stop all workers (wait for current jobs to finish)
    await Promise.all(workers.map((w) => w.close()));
    console.log("[worker] All workers stopped.");

    // Close all queues
    await Promise.all(allQueues.map((q) => q.close()));
    console.log("[worker] All queues closed.");

    // Disconnect from database
    await prisma.$disconnect();
    console.log("[worker] Database disconnected.");

    console.log("[worker] Shutdown complete.");
    process.exit(0);
  } catch (err) {
    console.error("[worker] Error during shutdown:", err);
    process.exit(1);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

main().catch((err) => {
  console.error("[worker] Fatal startup error:", err);
  process.exit(1);
});
