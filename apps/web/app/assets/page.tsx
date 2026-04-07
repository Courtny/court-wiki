import { redirect } from "next/navigation";
import Link from "next/link";
import { Upload, File, Image, Video } from "lucide-react";
import { auth } from "@court-wiki/auth";
import { createServerCaller } from "@/src/trpc/server";

export const metadata = { title: "Assets" };

function mimeIcon(mime: string | null) {
  if (!mime) return File;
  if (mime.startsWith("image/")) return Image;
  if (mime.startsWith("video/")) return Video;
  return File;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function AssetsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/assets");

  const trpc = await createServerCaller();
  let result: {
    items: {
      id: string; filename: string; originalName: string | null;
      mimeType: string | null; size: number; url: string;
      author: { name?: string | null };
    }[];
    total: number;
  } = { items: [], total: 0 };

  try {
    result = await trpc.assets.list({ page: 1, perPage: 40 });
  } catch {
    // non-fatal
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.total} file{result.total !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/assets/upload"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Upload className="h-4 w-4" />
          Upload
        </Link>
      </div>

      {result.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-semibold">No assets yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload images, PDFs, and other files to use in your pages.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {result.items.map((asset) => {
            const Icon = mimeIcon(asset.mimeType);
            const isImage = asset.mimeType?.startsWith("image/");
            return (
              <div
                key={asset.id}
                className="group relative overflow-hidden rounded-lg border border-border bg-card"
              >
                {isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.url}
                    alt={asset.originalName ?? asset.filename}
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-muted">
                    <Icon className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                <div className="p-2">
                  <p className="truncate text-xs font-medium" title={asset.originalName ?? asset.filename}>
                    {asset.originalName ?? asset.filename}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(asset.size)}
                  </p>
                </div>
                <a
                  href={asset.url}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute inset-0"
                  aria-label={`Open ${asset.originalName ?? asset.filename}`}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
