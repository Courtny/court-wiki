import * as Typesense from "typesense";
import type { SearchOptions, SearchResult } from "@court-wiki/core";
import type { PageIndexInput, SearchProvider } from './index';
import { prisma } from "@court-wiki/db";

const COLLECTION_NAME = "pages";

interface TypesenseConfig {
  host: string;
  port: number;
  apiKey: string;
  protocol?: "http" | "https";
}

interface TypesensePageDocument {
  id: string;
  path: string;
  title: string;
  description: string;
  content: string;
  locale: string;
  tags: string[];
  authorName: string;
  updatedAt: number;
}

export class TypesenseSearchProvider implements SearchProvider {
  private client: Typesense.Client;

  constructor(config: TypesenseConfig) {
    this.client = new Typesense.Client({
      nodes: [
        {
          host: config.host,
          port: config.port,
          protocol: config.protocol ?? "http",
        },
      ],
      apiKey: config.apiKey,
      connectionTimeoutSeconds: 5,
    });
  }

  private async ensureCollection(): Promise<void> {
    try {
      await this.client.collections(COLLECTION_NAME).retrieve();
    } catch {
      await this.client.collections().create({
        name: COLLECTION_NAME,
        fields: [
          { name: "id", type: "string" },
          { name: "path", type: "string" },
          { name: "title", type: "string" },
          { name: "description", type: "string", optional: true },
          { name: "content", type: "string" },
          { name: "locale", type: "string", facet: true },
          { name: "tags", type: "string[]", facet: true, optional: true },
          { name: "authorName", type: "string", optional: true },
          { name: "updatedAt", type: "int64" },
        ],
        default_sorting_field: "updatedAt",
      });
    }
  }

  async index(page: PageIndexInput): Promise<void> {
    await this.ensureCollection();

    const doc: TypesensePageDocument = {
      id: page.pageId,
      path: page.path,
      title: page.title,
      description: page.description ?? "",
      content: page.content.slice(0, 50000), // Typesense has limits
      locale: page.locale,
      tags: page.tags ?? [],
      authorName: page.authorName ?? "",
      updatedAt: Math.floor(page.updatedAt.getTime() / 1000),
    };

    await this.client
      .collections(COLLECTION_NAME)
      .documents()
      .upsert(doc);
  }

  async search(
    query: string,
    opts: SearchOptions = {}
  ): Promise<SearchResult[]> {
    await this.ensureCollection();

    const filterBy = opts.locale ? `locale:=${opts.locale}` : undefined;

    const results = await this.client
      .collections(COLLECTION_NAME)
      .documents()
      .search({
        q: query,
        query_by: "title,description,content",
        query_by_weights: "10,5,1",
        highlight_fields: "title,description,content",
        highlight_affix_num_tokens: 30,
        per_page: opts.limit ?? 20,
        page: opts.offset ? Math.floor(opts.offset / (opts.limit ?? 20)) + 1 : 1,
        ...(filterBy && { filter_by: filterBy }),
      });

    return (results.hits ?? []).map((hit) => {
      const doc = hit.document as TypesensePageDocument;
      const highlights = Object.entries(hit.highlights ?? {}).flatMap(
        ([field, highlight]) => {
          if (!highlight) return [];
          const snippets = Array.isArray(highlight)
            ? (highlight as Array<{ snippet?: string }>).map((h) => h.snippet ?? "")
            : [(highlight as { snippet?: string }).snippet ?? ""];
          return snippets.filter(Boolean).map((snippet) => ({ field, snippet }));
        }
      );

      return {
        pageId: doc.id,
        path: doc.path,
        title: doc.title,
        description: doc.description || null,
        locale: doc.locale,
        score: hit.text_match ?? 0,
        highlights,
      };
    });
  }

  async delete(pageId: string): Promise<void> {
    await this.ensureCollection();
    try {
      await this.client
        .collections(COLLECTION_NAME)
        .documents(pageId)
        .delete();
    } catch {
      // Document may not exist; ignore
    }
  }

  async rebuild(): Promise<void> {
    await this.ensureCollection();

    // Drop and recreate collection
    try {
      await this.client.collections(COLLECTION_NAME).delete();
    } catch {
      // Collection may not exist
    }

    // Re-create and re-index all published pages
    const pages = await prisma.page.findMany({
      where: { isPublished: true },
      include: {
        author: { select: { name: true } },
        tags: { include: { tag: true } },
      },
    });

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
  }
}
