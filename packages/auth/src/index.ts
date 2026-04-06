import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@court-wiki/db";
import { getActiveProviders } from './providers';

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
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
    authorized({ auth: session, request: { nextUrl } }) {
      const isLoggedIn = !!session?.user
      const isAdminRoute = nextUrl.pathname.startsWith('/admin')
      const publicPaths = ['/', '/login', '/register']
      const publicPrefixes = ['/api/trpc', '/api/health', '/api/auth', '/_next', '/favicon']
      const isPublic =
        publicPaths.includes(nextUrl.pathname) ||
        publicPrefixes.some((p) => nextUrl.pathname.startsWith(p))

      if (isAdminRoute && !isLoggedIn) return false
      if (!isPublic && !isLoggedIn) return false
      return true
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
