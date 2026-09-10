import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { resolveModeratorSignIn } from "@/lib/moderator-access";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [GitHub],
  callbacks: {
    async signIn({ user, profile }) {
      if (!user.id) return false;
      return resolveModeratorSignIn(user.email ?? profile?.email, user.id);
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/moderate/sign-in",
  },
});
