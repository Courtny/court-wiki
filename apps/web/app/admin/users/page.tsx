import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, UserCheck, UserX } from "lucide-react";
import { auth } from "@court-wiki/auth";
import { createServerCaller } from "@/src/trpc/server";

export const metadata = { title: "Users — Admin" };

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" });
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const session = await auth();
  const user = session?.user as (typeof session.user & { isAdmin?: boolean }) | undefined;
  if (!session?.user || !user?.isAdmin) redirect("/");

  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.search ?? "";
  const trpc = await createServerCaller();

  let result: {
    items: {
      id: string; email: string; name?: string | null;
      isAdmin: boolean; isActive: boolean; createdAt: string | Date;
      _count: { pages: number };
    }[];
    total: number; totalPages: number;
  } = { items: [], total: 0, totalPages: 0 };

  try {
    result = await trpc.users.list({
      page: currentPage,
      perPage: 25,
      search: search || undefined,
    });
  } catch {
    // non-fatal
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.total} user{result.total !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Search */}
      <form method="get" action="/admin/users" className="flex gap-2">
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder="Search by name or email…"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
        >
          Search
        </button>
        {search && (
          <Link href="/admin/users" className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent">
            Clear
          </Link>
        )}
      </form>

      {result.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">No users found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">User</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Pages</th>
                <th className="px-4 py-3 text-left font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {result.items.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{u.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.isAdmin ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
                        User
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.isActive ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <UserCheck className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-destructive">
                        <UserX className="h-3 w-3" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {u._count.pages}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(u.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {currentPage > 1 && (
            <Link href={`/admin/users?page=${currentPage - 1}${search ? `&search=${search}` : ""}`}
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent">
              Previous
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {result.totalPages}
          </span>
          {currentPage < result.totalPages && (
            <Link href={`/admin/users?page=${currentPage + 1}${search ? `&search=${search}` : ""}`}
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
