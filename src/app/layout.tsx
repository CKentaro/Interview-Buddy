import type { Metadata } from "next";
import { Archivo, Noto_Sans_JP, JetBrains_Mono, Roboto } from "next/font/google";
import "./globals.css";
import { SessionProviderWrapper } from "@/components/providers/SessionProviderWrapper";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-jp",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  preload: false,
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

/**
 * Google サインインボタン専用（.btn-google）。
 * ブランディング ガイドラインがボタン文言に Roboto Medium を指定しているため、
 * 他の用途には使わない。日本語部分は Noto Sans JP へフォールバックする。
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
    <html
      lang="ja"
      className={`${archivo.variable} ${notoSansJP.variable} ${jetBrainsMono.variable} ${roboto.variable}`}
    >
      <body>
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}
