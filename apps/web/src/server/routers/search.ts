import { z } from "zod";
import { router, publicProcedure, adminProcedure } from "../trpc";
import { createSearchProvider } from "@court-wiki/search";

// Lazy-initialize search provider from env
function getSearchProvider() {
  const providerType =
    (process.env["SEARCH_PROVIDER"] as "typesense" | "postgres" | undefined) ??
    "postgres";

  return createSearchProvider(
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
}

export const searchRouter = router({
  // ─── Full-text search ─────────────────────────────────────────────────────────
  query: publicProcedure
    .input(
      z.object({
        q: z.string().min(1).max(500),
        locale: z.string().optional(),
        limit: z.number().int().positive().max(50).default(20),
        offset: z.number().int().min(0).default(0),
        tags: z.array(z.string()).optional(),
      })
    )
    .query(async ({ input }) => {
      if (!input.q.trim()) return { results: [], total: 0 };

      const provider = await getSearchProvider();
      const results = await provider.search(input.q, {
        locale: input.locale,
        limit: input.limit,
        offset: input.offset,
        tags: input.tags,
      });

      return { results, total: results.length };
    }),

  // ─── Index a single page (triggered by page mutations) ───────────────────────
  indexPage: adminProcedure
    .input(z.object({ pageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const page = await ctx.db.page.findUnique({
        where: { id: input.pageId },
        include: {
          author: { select: { name: true } },
          tags: { include: { tag: true } },
        },
      });

      if (!page) return { success: false };

      const provider = await getSearchProvider();
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

      return { success: true };
    }),

  // ─── Rebuild the entire search index ─────────────────────────────────────────
  rebuild: adminProcedure.mutation(async () => {
    const provider = await getSearchProvider();
    await provider.rebuild();
    return { success: true };
  }),

  // ─── Remove a page from the index ────────────────────────────────────────────
  removeFromIndex: adminProcedure
    .input(z.object({ pageId: z.string() }))
    .mutation(async ({ input }) => {
      const provider = await getSearchProvider();
      await provider.delete(input.pageId);
      return { success: true };
    }),

  // ─── Autocomplete suggestions ─────────────────────────────────────────────────
  suggest: publicProcedure
    .input(
      z.object({
        q: z.string().min(1).max(100),
        locale: z.string().optional(),
        limit: z.number().int().positive().max(10).default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      // Use the DB directly for lightweight suggestions
      const pages = await ctx.db.page.findMany({
        where: {
          isPublished: true,
          isPrivate: false,
          ...(input.locale && { locale: input.locale }),
          OR: [
            { title: { contains: input.q, mode: "insensitive" } },
            { path: { contains: input.q, mode: "insensitive" } },
          ],
        },
        take: input.limit,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          path: true,
          title: true,
          description: true,
        },
      });

      return { suggestions: pages };
    }),
});
