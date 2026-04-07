import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, User, Tag, Edit } from "lucide-react";
import { createServerCaller } from "@/src/trpc/server";
import { render } from "@court-wiki/rendering";
import type { ContentType } from "@court-wiki/core";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  return { title: path.join("/") };
}

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function PageViewPage({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  const pagePath = path.join("/");
  const trpc = await createServerCaller();

  let page: {
    id: string; title: string; description?: string | null;
    content: string; contentType: ContentType; path: string;
    updatedAt: string | Date; createdAt: string | Date;
    author: { name?: string | null };
    tags: { tag: { name: string } }[];
    _count: { versions: number; comments: number };
  } | null = null;

  try {
    page = await trpc.pages.get({ path: pagePath });
  } catch {
    notFound();
  }

  if (!page) notFound();

  const { html } = await render(page.content, page.contentType);

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      {/* Back */}
      <Link
        href="/pages"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All pages
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{page.title}</h1>
        {page.description && (
          <p className="text-lg text-muted-foreground">{page.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {page.author?.name && (
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              {page.author.name}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Updated {formatDate(page.updatedAt)}
          </span>
          {page.tags.length > 0 && (
            <span className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              {page.tags.map(({ tag }) => (
                <span
                  key={tag.name}
                  className="rounded-full bg-secondary px-2 py-0.5 text-xs"
                >
                  {tag.name}
                </span>
              ))}
            </span>
          )}
          <Link
            href={`/pages/${page.path}/edit`}
            className="ml-auto flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs hover:bg-accent"
          >
            <Edit className="h-3 w-3" />
            Edit
          </Link>
        </div>
      </div>

      <hr className="border-border" />

      {/* Content */}
      <div
        className="prose prose-neutral dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
