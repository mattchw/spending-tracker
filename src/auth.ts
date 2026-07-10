import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Auth.js (NextAuth v5) configuration. Kept free of any DB imports so it stays
 * edge-safe for use in middleware. Uses a stateless JWT session; the user's
 * stable id (Google `sub`) is threaded onto the session as `user.id`.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  trustHost: true,
  callbacks: {
    jwt({ token, profile }) {
      // `profile` is only present at sign-in; persist the stable provider id.
      if (profile?.sub) token.uid = profile.sub;
      return token;
    },
    session({ session, token }) {
      if (token.uid && session.user) {
        (session.user as { id?: string }).id = token.uid as string;
      }
      return session;
    },
  },
});
