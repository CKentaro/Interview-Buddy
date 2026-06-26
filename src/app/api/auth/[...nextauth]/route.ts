import { handlers } from "@/auth";

// Auth.js のすべての認証エンドポイント（signin/callback/signout 等）を処理する。
export const { GET, POST } = handlers;
