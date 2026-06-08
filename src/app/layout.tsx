import type { Metadata } from "next";
import { Manrope, Noto_Sans_JP, JetBrains_Mono } from "next/font/google";
import { SessionProviderWrapper } from "@/components/SessionProviderWrapper";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-jp",
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
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
      className={`${manrope.variable} ${notoSansJP.variable} ${jetBrainsMono.variable}`}
    >
      <body>
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}
