import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@court-wiki/db";
import { getActiveProviders } from "./providers.js";

export const { handlers, auth, signIn, signOut } = NextAuth({
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

export { getActiveProviders } from "./providers.js";
export type { Provider } from "next-auth/providers";
