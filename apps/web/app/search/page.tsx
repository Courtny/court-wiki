import Link from "next/link";
import { Search } from "lucide-react";
import { createServerCaller } from "@/src/trpc/server";

export const metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const trpc = await createServerCaller();

  let results: {
    pageId: string; path: string; title: string;
    description?: string | null; snippet?: string | null;
  }[] = [];

  if (q.trim()) {
    try {
      const res = await trpc.search.query({ q });
      results = res.results;
    } catch {
      // search errors are non-fatal
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>
      </div>

      <form method="get" action="/search" className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            autoFocus
            placeholder="Search pages…"
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Search
        </button>
      </form>

      {q.trim() && (
        <p className="text-sm text-muted-foreground">
          {results.length} result{results.length !== 1 ? "s" : ""} for{" "}
          <strong>&ldquo;{q}&rdquo;</strong>
        </p>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((r) => (
            <Link
              key={r.pageId}
              href={`/pages/${r.path}`}
              className="block rounded-lg border border-border bg-card p-4 hover:bg-accent"
            >
              <h2 className="font-semibold">{r.title}</h2>
              {r.description && (
                <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                  {r.description}
                </p>
              )}
              {r.snippet && (
                <p
                  className="mt-1 text-sm text-muted-foreground line-clamp-2"
                  dangerouslySetInnerHTML={{ __html: r.snippet }}
                />
              )}
              <code className="mt-2 block font-mono text-xs text-muted-foreground">
                /{r.path}
              </code>
            </Link>
          ))}
        </div>
      )}

      {q.trim() && results.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-muted-foreground">
            No pages found for &ldquo;{q}&rdquo;.
          </p>
        </div>
      )}

      {!q.trim() && (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <Search className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Enter a query above to search.</p>
        </div>
      )}
    </div>
  );
}
