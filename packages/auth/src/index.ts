import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@court-wiki/db";
import { getActiveProviders } from './providers';

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env["AUTH_SECRET"] ?? process.env["NEXTAUTH_SECRET"],
  // #region agent log
  logger: {
    error(error) {
      const cause = error && typeof error === 'object' && 'cause' in error ? error.cause : null
      // #region agent log
      console.error('[auth][error-detail]', JSON.stringify({
        type: (error as Record<string, unknown>)?.type ?? 'unknown',
        message: error instanceof Error ? error.message : String(error),
        causeMessage: cause instanceof Error ? cause.message : String(cause),
        causeStack: cause instanceof Error ? cause.stack?.slice(0, 800) : null,
        hasSecret: !!(process.env["AUTH_SECRET"] ?? process.env["NEXTAUTH_SECRET"]),
        hasGithubId: !!(process.env["GITHUB_CLIENT_ID"] ?? process.env["AUTH_GITHUB_ID"]),
        hasGithubSecret: !!(process.env["GITHUB_CLIENT_SECRET"] ?? process.env["AUTH_GITHUB_SECRET"]),
        hasDbUrl: !!process.env["DATABASE_URL"],
      }))
      // #endregion
    },
  },
  // #endregion
  adapter: PrismaAdapter(prisma),
  providers: getActiveProviders(),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // #region agent log
      console.log('[auth][signIn-callback]', JSON.stringify({
        provider: account?.provider,
        hasUser: !!user,
        userId: user?.id ?? null,
        email: user?.email ?? null,
        accountType: account?.type ?? null,
      }))
      // #endregion
      return true
    },
    authorized({ auth: session, request: { nextUrl } }) {
      const isLoggedIn = !!session?.user
      const isAdminRoute = nextUrl.pathname.startsWith('/admin')
      const publicPaths = ['/', '/login', '/register']
      const publicPrefixes = ['/api/trpc', '/api/health', '/api/auth', '/_next', '/favicon']
      const isPublic =
        publicPaths.includes(nextUrl.pathname) ||
        publicPrefixes.some((p) => nextUrl.pathname.startsWith(p))

      const isRsc = nextUrl.searchParams.has('_rsc')
      const decision = (() => {
        if (isAdminRoute && !isLoggedIn) return false
        if (!isPublic && !isLoggedIn) return false
        return true
      })()

      // #region agent log
      fetch('http://127.0.0.1:7294/ingest/c29688ab-6971-42ae-8a4f-934c905524cb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '29ec90' },
        body: JSON.stringify({
          sessionId: '29ec90', runId: 'run1', hypothesisId: 'H1',
          location: 'auth/index.ts:authorized',
          message: 'middleware authorized check',
          data: { path: nextUrl.pathname, isLoggedIn, isPublic, isRsc, decision },
          timestamp: Date.now(),
        }),
      }).catch(() => {})
      // #endregion

      return decision
    },
    async jwt({ token, user }) {
      if (user) {
        token["id"] = user.id;
        // Fetch additional user data from DB to enrich token
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id as string },
          select: { isAdmin: true, isActive: true, locale: true },
        });
        if (dbUser) {
          token["isAdmin"] = dbUser.isAdmin;
          token["isActive"] = dbUser.isActive;
          token["locale"] = dbUser.locale;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token["id"] as string;
        (session.user as typeof session.user & { isAdmin: boolean }).isAdmin =
          token["isAdmin"] as boolean;
      }
      return session;
    },
  },
});

export { getActiveProviders } from './providers';
export type { Provider } from "next-auth/providers";
