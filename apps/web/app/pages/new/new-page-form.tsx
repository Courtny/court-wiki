"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/src/trpc/client";

export function NewPageForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const createPage = trpc.pages.create.useMutation({
    onSuccess: (page) => router.push(`/pages/${page.path}`),
    onError: (e) => setError(e.message),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    createPage.mutate({
      title: fd.get("title") as string,
      path: fd.get("path") as string,
      description: (fd.get("description") as string) || undefined,
      content: fd.get("content") as string,
      contentType: "MARKDOWN",
      isPublished: fd.get("isPublished") === "on",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="title" className="text-sm font-medium">
            Title <span className="text-destructive">*</span>
          </label>
          <input
            id="title"
            name="title"
            required
            placeholder="My Page Title"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="path" className="text-sm font-medium">
            Path <span className="text-destructive">*</span>
          </label>
          <div className="flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-ring">
            <span className="mr-1 text-muted-foreground">/</span>
            <input
              id="path"
              name="path"
              required
              pattern="[a-z0-9/_-]+"
              placeholder="my-page"
              className="flex-1 bg-transparent focus:outline-none"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Lowercase letters, numbers, dashes, underscores and slashes only.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <input
          id="description"
          name="description"
          placeholder="Brief summary of this page"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="content" className="text-sm font-medium">
          Content (Markdown) <span className="text-destructive">*</span>
        </label>
        <textarea
          id="content"
          name="content"
          required
          rows={20}
          placeholder="# My Page&#10;&#10;Write your content here using Markdown..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isPublished"
          name="isPublished"
          className="h-4 w-4 rounded border-border"
        />
        <label htmlFor="isPublished" className="text-sm">
          Publish immediately
        </label>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={createPage.isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {createPage.isPending ? "Creating…" : "Create Page"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
