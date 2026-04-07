import { redirect } from "next/navigation";
import { FileText, Users, Upload, Layers, Clock, User } from "lucide-react";
import Link from "next/link";
import { auth } from "@court-wiki/auth";
import { createServerCaller } from "@/src/trpc/server";

export const metadata = { title: "Settings — Admin" };

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" });
}

export default async function AdminSettingsPage() {
  const session = await auth();
  const user = session?.user as (typeof session.user & { isAdmin?: boolean }) | undefined;
  if (!session?.user || !user?.isAdmin) redirect("/");

  const trpc = await createServerCaller();

  let stats: {
    totals: { pages: number; users: number; assets: number; groups: number };
    recentPages: { id: string; title: string; path: string; updatedAt: string | Date; author: { name?: string | null } }[];
    recentUsers: { id: string; email: string; name?: string | null; createdAt: string | Date }[];
  } | null = null;

  try {
    stats = await trpc.admin.stats();
  } catch {
    // non-fatal
  }

  const statCards = stats
    ? [
        { label: "Pages", value: stats.totals.pages, icon: FileText, href: "/pages" },
        { label: "Users", value: stats.totals.users, icon: Users, href: "/admin/users" },
        { label: "Assets", value: stats.totals.assets, icon: Upload, href: "/assets" },
        { label: "Groups", value: stats.totals.groups, icon: Layers, href: "#" },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Site Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          System statistics and recent activity.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              href={s.href}
              className="rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-primary/10 p-2">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {stats && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent pages */}
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-semibold">Recent Pages</h2>
            </div>
            <ul className="divide-y divide-border">
              {stats.recentPages.map((p) => (
                <li key={p.id}>
                  <Link href={`/pages/${p.path}`} className="flex items-center justify-between px-5 py-3 hover:bg-accent">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.title}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        {p.author?.name ?? "—"}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(p.updatedAt)}
                    </span>
                  </Link>
                </li>
              ))}
              {stats.recentPages.length === 0 && (
                <li className="px-5 py-4 text-sm text-muted-foreground">No pages yet.</li>
              )}
            </ul>
          </div>

          {/* Recent users */}
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-semibold">Recent Users</h2>
            </div>
            <ul className="divide-y divide-border">
              {stats.recentUsers.map((u) => (
                <li key={u.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{u.name ?? u.email}</p>
                    {u.name && (
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    )}
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDate(u.createdAt)}
                  </span>
                </li>
              ))}
              {stats.recentUsers.length === 0 && (
                <li className="px-5 py-4 text-sm text-muted-foreground">No users yet.</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Environment info */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 font-semibold">Environment</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
          {[
            { label: "Auth URL", value: process.env["AUTH_URL"] ?? process.env["NEXTAUTH_URL"] ?? "unset" },
            { label: "Search", value: process.env["SEARCH_PROVIDER"] ?? "postgres" },
            { label: "Storage", value: process.env["STORAGE_PROVIDER"] ?? "local" },
            { label: "Node env", value: process.env["NODE_ENV"] ?? "unknown" },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="font-mono text-xs">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
