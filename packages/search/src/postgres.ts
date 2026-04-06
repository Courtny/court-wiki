import { prisma } from "@court-wiki/db";
import type { SearchOptions, SearchResult } from "@court-wiki/core";
import type { PageIndexInput, SearchProvider } from "./index.js";

export class PostgresSearchProvider implements SearchProvider {
  async index(page: PageIndexInput): Promise<void> {
    // Build a tokens string combining all searchable text fields
    const tokens = [
      page.title,
      page.description ?? "",
      page.content,
      ...(page.tags ?? []),
      page.authorName ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    await prisma.searchIndex.upsert({
      where: { pageId: page.pageId },
      create: {
        pageId: page.pageId,
        locale: page.locale,
        tokens,
      },
      update: {
        locale: page.locale,
        tokens,
      },
    });
  }

  async search(
    query: string,
    opts: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const limit = opts.limit ?? 20;
    const offset = opts.offset ?? 0;
    const locale = opts.locale;

    // Normalize query for PostgreSQL tsvector
    const terms = query
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => `${t}:*`)
      .join(" & ");

    if (!terms) return [];

    // Use raw query for full-text search
    const rows = await prisma.$queryRaw<
      Array<{
        pageId: string;
        path: string;
        title: string;
        description: string | null;
        locale: string;
        rank: number;
      }>
    >`
      SELECT
        si.page_id AS "pageId",
        p.path,
        p.title,
        p.description,
        si.locale,
        ts_rank(to_tsvector('simple', si.tokens), to_tsquery('simple', ${terms})) AS rank
      FROM search_index si
      JOIN pages p ON p.id = si.page_id
      WHERE
        to_tsvector('simple', si.tokens) @@ to_tsquery('simple', ${terms})
        AND p.is_published = true
        AND p.is_private = false
        ${locale ? prisma.$queryRaw`AND si.locale = ${locale}` : prisma.$queryRaw``}
      ORDER BY rank DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return rows.map((row) => ({
      pageId: row.pageId,
      path: row.path,
      title: row.title,
      description: row.description,
      locale: row.locale,
      score: row.rank,
      highlights: [],
    }));
  }

  async delete(pageId: string): Promise<void> {
    await prisma.searchIndex.deleteMany({ where: { pageId } });
  }

  async rebuild(): Promise<void> {
    // Delete all existing index entries
    await prisma.searchIndex.deleteMany();

    // Re-index all published pages in batches
    const batchSize = 100;
    let skip = 0;

    while (true) {
      const pages = await prisma.page.findMany({
        where: { isPublished: true },
        include: {
          author: { select: { name: true } },
          tags: { include: { tag: true } },
        },
        take: batchSize,
        skip,
      });

      if (pages.length === 0) break;

      for (const page of pages) {
        await this.index({
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
      }

      skip += batchSize;
    }
  }
}
