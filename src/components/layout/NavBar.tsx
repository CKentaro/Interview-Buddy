"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";

const NAV_LINKS = [
  { href: "/home", label: "ホーム" },
  { href: "/history", label: "面接履歴" },
  { href: "/profile", label: "プロフィール" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-black/10 bg-white/80 px-6 py-3 backdrop-blur">
      <div className="flex items-center gap-8">
        <Link href="/home" className="text-sm font-bold tracking-tight">
          Interview Buddy
        </Link>
        <nav className="flex items-center gap-5">
          {NAV_LINKS.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm transition ${
                  active
                    ? "font-semibold text-black"
                    : "text-black/50 hover:text-black"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <SignOutButton />
    </header>
  );
}
