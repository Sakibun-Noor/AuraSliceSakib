"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MODE_LIST, type GameMode } from "@/lib/game/types";
import {
  getBests,
  getPlayerName,
  setPlayerName as persistName,
} from "@/lib/storage";

const ACCENT_RING: Record<string, string> = {
  primary: "hover:shadow-[0_0_40px_rgba(255,81,104,0.3)] hover:border-aura-primary/40",
  secondary:
    "hover:shadow-[0_0_40px_rgba(111,0,190,0.3)] hover:border-aura-secondary-soft/40",
  tertiary:
    "hover:shadow-[0_0_40px_rgba(255,74,141,0.3)] hover:border-aura-tertiary-soft/40",
};

const ACCENT_TEXT: Record<string, string> = {
  primary: "text-aura-primary",
  secondary: "text-aura-secondary-soft",
  tertiary: "text-aura-tertiary-soft",
};

const ICON: Record<string, string> = {
  swords:
    "M14.121 2.879a3 3 0 014.243 4.243L8.318 17.17a4 4 0 01-2.828 1.172H3v-2.49a4 4 0 011.172-2.828L14.121 2.88zM17 7l-2-2M7.757 14.243l2 2M5 21l2-2m10-4l2 2",
  spa: "M12 3a7 7 0 00-6.93 6.23A5 5 0 007 19h10a5 5 0 001.93-9.77A7 7 0 0012 3zm0 4a3 3 0 013 3",
  bolt: "M13 2L3 14h7l-1 8 10-12h-7l1-8z",
};

export default function HomeHero() {
  const [name, setName] = useState("");
  const [bests, setBests] = useState<Partial<Record<GameMode, number>>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setName(getPlayerName());
    setBests(getBests());
    setHydrated(true);
  }, []);

  const onNameChange = (v: string) => {
    const clean = v.slice(0, 16);
    setName(clean);
    persistName(clean);
  };

  return (
    <main className="relative z-10 pt-28 pb-24 px-4 md:px-8 max-w-6xl mx-auto">
      <section className="text-center space-y-6 mb-16">
        <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-aura-primary animate-pulse-glow" />
          <span className="font-caps text-xs uppercase tracking-widest text-aura-primary-soft">
            Season 01 · Live
          </span>
        </div>
        <h1 className="font-display font-black text-5xl md:text-7xl lg:text-8xl leading-[1.05] tracking-tight drop-shadow-[0_0_40px_rgba(255,81,104,0.25)]">
          <span className="block logo-sweep italic">AURA SLICE</span>
          <span className="block text-white/90 text-3xl md:text-5xl mt-3 font-display font-bold">
            Slice. Glow. Ascend.
          </span>
        </h1>
        <p className="font-body text-base md:text-lg text-aura-text-dim max-w-2xl mx-auto">
          Three modes. Satisfying canvas physics. A glassmorphism aura that
          reacts to every clean cut. Pick your mode, name your blade, and begin.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 max-w-md mx-auto">
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Your blade name"
            aria-label="Player name"
            maxLength={16}
            className="w-full sm:w-64 px-5 py-3 rounded-xl glass font-caps tracking-widest text-sm uppercase text-white placeholder:text-white/40 focus:outline-none focus:border-aura-primary/60 focus:ring-2 focus:ring-aura-primary/30"
          />
          <Link
            href="/play?mode=classic"
            className="w-full sm:w-auto btn-neon px-8 py-3 rounded-xl font-caps text-sm font-black uppercase tracking-widest text-center"
          >
            Quick Play
          </Link>
        </div>
      </section>

      <section className="space-y-8">
        <div className="flex items-end justify-between">
          <h2 className="font-display font-bold text-2xl md:text-3xl text-white">
            Choose Your Mode
          </h2>
          <Link
            href="/leaderboard"
            className="hidden sm:inline font-caps text-xs uppercase tracking-widest text-aura-primary-soft hover:text-white transition-colors"
          >
            View Leaderboard →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {MODE_LIST.map((m) => {
            const best = hydrated ? bests[m.id] ?? 0 : 0;
            return (
              <Link
                key={m.id}
                href={`/play?mode=${m.id}`}
                className={`group glass rounded-2xl p-7 flex flex-col gap-4 transition-all duration-500 ${ACCENT_RING[m.accent]}`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-aura-surface-4 flex items-center justify-center border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.4)]">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`w-6 h-6 ${ACCENT_TEXT[m.accent]}`}
                    >
                      <path d={ICON[m.icon]} />
                    </svg>
                  </div>
                  <span className="font-caps text-[10px] uppercase tracking-widest text-white/40">
                    Best
                  </span>
                </div>

                <div>
                  <h3 className="font-display font-bold text-2xl text-white">
                    {m.title}
                  </h3>
                  <p className="font-body text-sm text-aura-text-dim mt-2 leading-relaxed min-h-[64px]">
                    {m.blurb}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <span className={`font-caps text-xs uppercase tracking-widest ${ACCENT_TEXT[m.accent]}`}>
                    {m.durationSeconds
                      ? `${m.durationSeconds}s`
                      : `${m.maxLives === Infinity ? "∞" : m.maxLives} lives`}
                  </span>
                  <span className="font-caps text-base font-bold text-white tabular-nums">
                    {best.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <span className="font-caps text-[10px] uppercase tracking-widest text-white/40 group-hover:text-white/70 transition-colors">
                    Tap to begin
                  </span>
                  <span className="text-white/50 group-hover:translate-x-1 group-hover:text-white transition-all">
                    →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            t: "Tactile Physics",
            d: "Every fruit tossed with real momentum. Every slice a clean, weighted arc.",
          },
          {
            t: "Crystalline Aura",
            d: "Glow, bloom, and particle trails react to your stroke in real time.",
          },
          {
            t: "Combo Ascension",
            d: "String slices together. Three in a stroke sparks a radiant multiplier.",
          },
        ].map((f) => (
          <div
            key={f.t}
            className="glass rounded-xl p-6 hover:bg-aura-surface-2/60 transition-colors"
          >
            <h3 className="font-display font-bold text-lg text-white">{f.t}</h3>
            <p className="font-body text-sm text-aura-text-dim mt-2 leading-relaxed">
              {f.d}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
