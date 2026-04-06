import type { SearchOptions, SearchResult } from "@court-wiki/core";

// ─── SearchProvider Interface ─────────────────────────────────────────────────

export interface PageIndexInput {
  pageId: string;
  path: string;
  title: string;
  description?: string | null;
  content: string;
  locale: string;
  tags?: string[];
  authorName?: string | null;
  updatedAt: Date;
}

export interface SearchProvider {
  /**
   * Index (create or update) a page in the search engine.
   */
  index(page: PageIndexInput): Promise<void>;

  /**
   * Search for pages matching the query string.
   */
  search(query: string, opts?: SearchOptions): Promise<SearchResult[]>;

  /**
   * Remove a page from the search index.
   */
  delete(pageId: string): Promise<void>;

  /**
   * Rebuild the entire search index from the database.
   */
  rebuild(): Promise<void>;
}

export type SearchProviderType = "typesense" | "postgres";

export interface SearchConfig {
  provider: SearchProviderType;
  typesense?: {
    host: string;
    port: number;
    apiKey: string;
    protocol?: "http" | "https";
  };
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export async function createSearchProvider(
  config: SearchConfig
): Promise<SearchProvider> {
  switch (config.provider) {
    case "typesense": {
      const { TypesenseSearchProvider } = await import('./typesense');
      if (!config.typesense) {
        throw new Error("Typesense search config missing");
      }
      return new TypesenseSearchProvider(config.typesense);
    }
    case "postgres": {
      const { PostgresSearchProvider } = await import('./postgres');
      return new PostgresSearchProvider();
    }
    default:
      throw new Error(
        `Unknown search provider: ${config.provider as string}`
      );
  }
}

export type { SearchOptions, SearchResult };
