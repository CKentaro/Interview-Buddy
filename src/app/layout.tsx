import type { Metadata } from "next";
import { Zen_Kaku_Gothic_New, Roboto } from "next/font/google";
import "./globals.css";
import { SessionProviderWrapper } from "@/components/providers/SessionProviderWrapper";

/**
 * 本文・見出し・UI のすべてを 1 書体で通す。日本語が主な本文なので、
 * ラテン専用フォントを先に置いて日本語をフォールバックさせる構成は取らない。
 * 日本語サブセットは巨大なため preload しない（Noto Sans JP のときと同じ理由）。
 */
const zenKaku = Zen_Kaku_Gothic_New({
  variable: "--font-zen-kaku",
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});

/**
 * Google サインインボタン専用（.btn-google）。
 * ブランディング ガイドラインがボタン文言に Roboto Medium を指定しているため、
 * 他の用途には使わない。日本語部分は Zen Kaku Gothic New へフォールバックする。
 */
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Interview Buddy",
  description: "AI 面接シミュレーション — 4軸の質的フィードバックで面接の語り方を整える",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${zenKaku.variable} ${roboto.variable}`}>
      <body>
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}
