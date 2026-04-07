import Link from "next/link";
import { FileText, Plus, Clock, User } from "lucide-react";
import { createServerCaller } from "@/src/trpc/server";

export const metadata = { title: "Pages" };

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function PagesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10));
  const trpc = await createServerCaller();

  let result = { items: [] as {
    id: string; path: string; title: string; description?: string | null;
    updatedAt: string | Date; author?: { name?: string | null } | null;
    tags: { tag: { name: string } }[];
  }[], total: 0, totalPages: 0 };

  try {
    result = await trpc.pages.list({ page: currentPage, perPage: 20 });
  } catch {
    // unauthenticated users see published only — handled by router
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pages</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.total} page{result.total !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link
          href="/pages/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Page
        </Link>
      </div>

      {result.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-semibold">No pages yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first wiki page to get started.
          </p>
          <Link
            href="/pages/new"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Page
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {result.items.map((page) => (
            <Link
              key={page.id}
              href={`/pages/${page.path}`}
              className="block rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold">{page.title}</h2>
                  {page.description && (
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {page.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(page.updatedAt)}
                    </span>
                    {page.author?.name && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {page.author.name}
                      </span>
                    )}
                    {page.tags.length > 0 && (
                      <span className="flex gap-1">
                        {page.tags.slice(0, 3).map(({ tag }) => (
                          <span
                            key={tag.name}
                            className="rounded-full bg-secondary px-2 py-0.5 text-xs"
                          >
                            {tag.name}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                </div>
                <code className="shrink-0 rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  /{page.path}
                </code>
              </div>
            </Link>
          ))}
        </div>
      )}

      {result.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {currentPage > 1 && (
            <Link
              href={`/pages?page=${currentPage - 1}`}
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {result.totalPages}
          </span>
          {currentPage < result.totalPages && (
            <Link
              href={`/pages?page=${currentPage + 1}`}
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
