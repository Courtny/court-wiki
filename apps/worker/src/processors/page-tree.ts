import type { Job } from "bullmq";
import { prisma } from "@court-wiki/db";
import { buildNavigationTree } from "@court-wiki/core";
import type { PageTreeJobData } from "../queues.js";

/**
 * Rebuild the navigation tree for a given locale (or all locales).
 * The tree is derived from NavigationItem records and stored pages.
 * After computation, we could cache the result in Redis for fast serving.
 */
export async function processPageTree(job: Job<PageTreeJobData>): Promise<void> {
  const { locale, triggeredByPageId } = job.data;

  console.log(
    `[page-tree] Rebuilding nav tree${locale ? ` for locale: ${locale}` : " for all locales"}` +
      (triggeredByPageId ? ` (triggered by page: ${triggeredByPageId})` : "")
  );

  // Determine which locales to rebuild
  let localesToRebuild: string[];

  if (locale) {
    localesToRebuild = [locale];
  } else {
    // Find all distinct locales that have nav items or pages
    const [navLocales, pageLocales] = await Promise.all([
      prisma.navigationItem.findMany({
        distinct: ["locale"],
        select: { locale: true },
      }),
      prisma.page.findMany({
        distinct: ["locale"],
        select: { locale: true },
        where: { isPublished: true },
      }),
    ]);

    const localeSet = new Set([
      ...navLocales.map((n) => n.locale),
      ...pageLocales.map((p) => p.locale),
    ]);
    localesToRebuild = Array.from(localeSet);
  }

  for (const loc of localesToRebuild) {
    const navItems = await prisma.navigationItem.findMany({
      where: { locale: loc },
      orderBy: [{ parentId: "asc" }, { order: "asc" }],
    });

    const tree = buildNavigationTree(navItems);

    // Here you would cache the tree in Redis for fast serving:
    // await redis.set(`nav:tree:${loc}`, JSON.stringify(tree), "EX", 3600);

    console.log(
      `[page-tree] Locale "${loc}": built tree with ${navItems.length} items, ${tree.length} root nodes`
    );
  }

  console.log(`[page-tree] Done. Rebuilt ${localesToRebuild.length} locale(s).`);
}
