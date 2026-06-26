"use client";

import { SessionProvider } from "next-auth/react";

/**
 * クライアントコンポーネントから useSession() を使うための Provider ラッパー。
 * root layout (Server Component) で children をこれで囲む。
 */
export function SessionProviderWrapper({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <SessionProvider>{children}</SessionProvider>;
}
