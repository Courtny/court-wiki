import { NextResponse } from "next/server";
import { prisma } from "@court-wiki/db";

/** Debug-only route: returns auth config health without exposing secrets. */
export async function GET() {
  // #region agent log
  const secret =
    process.env["AUTH_SECRET"] ?? process.env["NEXTAUTH_SECRET"] ?? null;
  const githubId =
    process.env["GITHUB_CLIENT_ID"] ??
    process.env["AUTH_GITHUB_ID"] ??
    null;
  const githubSecret =
    process.env["GITHUB_CLIENT_SECRET"] ??
    process.env["AUTH_GITHUB_SECRET"] ??
    null;
  const dbUrl = process.env["DATABASE_URL"] ?? null;
  const authUrl =
    process.env["AUTH_URL"] ?? process.env["NEXTAUTH_URL"] ?? null;

  let dbOk = false;
  let dbError: string | null = null;
  let usersTableExists = false;
  let accountsTableExists = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
    // Check if auth tables exist (missing = migrations/db push not run)
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    const names = tables.map((t) => t.tablename);
    usersTableExists = names.includes("users");
    accountsTableExists = names.includes("accounts");
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
  }

  const diag = {
    ok: !!(secret && githubId && githubSecret && dbOk && usersTableExists && accountsTableExists),
    checks: {
      AUTH_SECRET: !!secret,
      GITHUB_CLIENT_ID_or_AUTH_GITHUB_ID: !!githubId,
      GITHUB_CLIENT_SECRET_or_AUTH_GITHUB_SECRET: !!githubSecret,
      DATABASE_URL: !!dbUrl,
      AUTH_URL: authUrl ?? "unset",
      db_reachable: dbOk,
      db_error: dbError,
      users_table_exists: usersTableExists,
      accounts_table_exists: accountsTableExists,
      note: (!dbOk || !usersTableExists || !accountsTableExists)
        ? "Run: cd packages/db && DATABASE_URL=<your-neon-url> pnpm db:push"
        : "DB looks healthy",
    },
  };

  console.log("[auth-diag]", JSON.stringify(diag));

  return NextResponse.json(diag);
  // #endregion
}
