import NextAuth from "next-auth";
import HackClub from "@/lib/hackclub-provider";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    HackClub({
      clientId: process.env.HACKCLUB_CLIENT_ID,
      clientSecret: process.env.HACKCLUB_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        token.sub = String(profile.sub ?? token.sub);
        token.slackId = typeof profile.slack_id === "string" ? profile.slack_id : null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.slackId = (token.slackId as string | null) ?? null;
      }
      return session;
    },
  },
});
