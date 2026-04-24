"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/play?mode=classic", label: "Play" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export default function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-white/5 backdrop-blur-2xl border-b border-white/10">
      <div className="flex items-center justify-between px-6 md:px-10 py-4 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-aura-primary animate-pulse-glow" />
          <span className="text-lg md:text-xl font-display font-black italic tracking-tight logo-sweep">
            AURA SLICE
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => {
            const active =
              pathname === l.href ||
              (l.href.startsWith("/play") && pathname === "/play");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`font-display tracking-tight px-4 py-1.5 rounded-full text-sm transition-all ${
                  active
                    ? "text-aura-primary-soft bg-aura-primary-soft/10"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
        <Link
          href="/play?mode=classic"
          className="btn-neon px-5 py-2 rounded-full font-caps text-xs font-bold uppercase tracking-widest"
        >
          Play Now
        </Link>
      </div>
    </nav>
  );
}
