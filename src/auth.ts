import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

/**
 * Auth.js (next-auth v5) 設定。
 * - Prisma Adapter で User/Account/Session を DB に永続化
 * - Google OAuth プロバイダ（AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET を自動参照）
 * - セッションは DB 戦略（Session テーブルに保存）
 *
 * NOTE: DB セッションは Edge 非対応の pg アダプタを使うため middleware では
 * 参照できない。認証ガードは (app)/layout.tsx の auth()（Node ランタイム）で行う。
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  session: { strategy: "database" },
  callbacks: {
    /**
     * DB セッションでは session.user に id が含まれないため明示的に露出する。
     * requireUser() などサーバ側の認可で userId として利用する。
     */
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
