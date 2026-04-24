"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getBests, getHistory, type HighScore } from "@/lib/storage";
import { MODE_LIST, type GameMode } from "@/lib/game/types";

const SEED: HighScore[] = [
  { name: "NinjaBlade99", mode: "classic", score: 9_420_110, at: 0 },
  { name: "SliceMaster", mode: "blitz", score: 8_912_400, at: 0 },
  { name: "KiwiKutter", mode: "zen", score: 8_150_000, at: 0 },
  { name: "AuraWolf", mode: "classic", score: 7_245_000, at: 0 },
  { name: "PrismCut", mode: "blitz", score: 6_880_200, at: 0 },
  { name: "CitrusZen", mode: "zen", score: 6_114_500, at: 0 },
];

const MODE_LABEL: Record<GameMode, string> = {
  classic: "Classic",
  zen: "Zen",
  blitz: "Blitz",
};

const MODE_ACCENT: Record<GameMode, string> = {
  classic: "text-aura-primary",
  zen: "text-aura-secondary-soft",
  blitz: "text-aura-tertiary-soft",
};

export default function LeaderboardView() {
  const [filter, setFilter] = useState<GameMode | "all">("all");
  const [history, setHistory] = useState<HighScore[]>([]);
  const [bests, setBests] = useState<Partial<Record<GameMode, number>>>({});

  useEffect(() => {
    setHistory(getHistory());
    setBests(getBests());
  }, []);

  const mixed = useMemo(() => {
    const combined = [...SEED, ...history].sort((a, b) => b.score - a.score);
    const filtered =
      filter === "all" ? combined : combined.filter((e) => e.mode === filter);
    return filtered.slice(0, 20);
  }, [history, filter]);

  return (
    <main className="relative z-10 pt-28 pb-20 px-4 md:px-8 max-w-4xl mx-auto">
      <section className="space-y-2 mb-8">
        <p className="font-caps text-xs uppercase tracking-widest text-aura-primary-soft">
          Global Standings
        </p>
        <h1 className="font-display font-black text-4xl md:text-6xl italic logo-sweep">
          Top Slicers
        </h1>
        <p className="font-body text-aura-text-dim max-w-xl">
          Your runs are saved locally and mixed with the current aura of
          legends.
        </p>
      </section>

      {/* Personal bests */}
      <section className="grid grid-cols-3 gap-3 mb-8">
        {MODE_LIST.map((m) => (
          <div key={m.id} className="glass rounded-xl p-4 text-center">
            <div className={`font-caps text-[10px] uppercase tracking-widest ${MODE_ACCENT[m.id]}`}>
              {m.title} Best
            </div>
            <div className="font-display font-black text-2xl text-white tabular-nums mt-2">
              {(bests[m.id] ?? 0).toLocaleString()}
            </div>
          </div>
        ))}
      </section>

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {(["all", "classic", "zen", "blitz"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setFilter(m)}
            className={`font-caps text-xs uppercase tracking-widest px-4 py-2 rounded-full transition-colors ${
              filter === m
                ? "bg-aura-primary/20 text-aura-primary-soft border border-aura-primary/40"
                : "glass text-white/70 hover:text-white"
            }`}
          >
            {m === "all" ? "All" : MODE_LABEL[m]}
          </button>
        ))}
      </div>

      <div className="glass-strong rounded-2xl overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-white/5 text-white/50 font-caps text-[11px] uppercase tracking-widest">
          <div className="col-span-2 md:col-span-1">#</div>
          <div className="col-span-6 md:col-span-5">Player</div>
          <div className="col-span-4 md:col-span-3 text-right">Score</div>
          <div className="hidden md:block md:col-span-3 text-right">Mode</div>
        </div>
        {mixed.length === 0 && (
          <div className="px-5 py-8 text-center text-white/50 font-body">
            No runs yet — go slice something.
          </div>
        )}
        {mixed.map((row, i) => (
          <div
            key={`${row.name}-${row.score}-${i}`}
            className={`grid grid-cols-12 gap-3 items-center px-5 py-4 border-b border-white/5 last:border-0 transition-colors hover:bg-white/5 ${
              row.at > 0 ? "bg-white/[0.03]" : ""
            }`}
          >
            <div
              className={`col-span-2 md:col-span-1 font-caps font-bold ${
                i === 0
                  ? "text-aura-primary"
                  : i < 3
                    ? "text-white"
                    : "text-white/50"
              }`}
            >
              #{i + 1}
            </div>
            <div className="col-span-6 md:col-span-5 flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full p-[1px] ${
                  i === 0
                    ? "bg-gradient-to-br from-aura-primary to-aura-secondary"
                    : "bg-aura-surface-4 border border-white/10"
                }`}
              >
                <div className="w-full h-full bg-aura-bg rounded-full flex items-center justify-center text-[11px] font-bold text-white">
                  {row.name.charAt(0).toUpperCase()}
                </div>
              </div>
              <span className="font-display text-base text-white truncate">
                {row.name}
                {row.at > 0 && (
                  <span className="ml-2 font-caps text-[9px] uppercase tracking-widest text-aura-primary-soft">
                    YOU
                  </span>
                )}
              </span>
            </div>
            <div className="col-span-4 md:col-span-3 text-right font-caps text-white tabular-nums">
              {row.score.toLocaleString()}
            </div>
            <div className="hidden md:flex md:col-span-3 justify-end">
              <span
                className={`px-3 py-1 rounded-full font-caps text-[11px] uppercase tracking-widest border ${
                  row.mode === "classic"
                    ? "border-aura-primary/30 text-aura-primary-soft"
                    : row.mode === "zen"
                      ? "border-aura-secondary/40 text-aura-secondary-soft"
                      : "border-aura-tertiary/40 text-aura-tertiary-soft"
                }`}
              >
                {MODE_LABEL[row.mode]}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex justify-center">
        <Link
          href="/play?mode=classic"
          className="btn-neon px-10 py-4 rounded-xl font-caps uppercase tracking-widest text-sm font-bold"
        >
          Play Now
        </Link>
      </div>
    </main>
  );
}
