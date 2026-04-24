import type { GameMode } from "./game/types";

const KEY_NAME = "aura-slice:player-name";
const KEY_BEST = "aura-slice:best";
const KEY_HISTORY = "aura-slice:history";
const KEY_MUTED = "aura-slice:muted";

export interface HighScore {
  name: string;
  score: number;
  mode: GameMode;
  at: number;
}

export type BestByMode = Partial<Record<GameMode, number>>;

function safeLocal(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getPlayerName(): string {
  const ls = safeLocal();
  if (!ls) return "";
  return ls.getItem(KEY_NAME) ?? "";
}

export function setPlayerName(name: string) {
  const ls = safeLocal();
  if (!ls) return;
  ls.setItem(KEY_NAME, name.slice(0, 16));
}

export function getBests(): BestByMode {
  const ls = safeLocal();
  if (!ls) return {};
  try {
    return JSON.parse(ls.getItem(KEY_BEST) ?? "{}");
  } catch {
    return {};
  }
}

export function setBestIfHigher(mode: GameMode, score: number): boolean {
  const ls = safeLocal();
  if (!ls) return false;
  const current = getBests();
  if (score > (current[mode] ?? 0)) {
    current[mode] = score;
    ls.setItem(KEY_BEST, JSON.stringify(current));
    return true;
  }
  return false;
}

export function getHistory(): HighScore[] {
  const ls = safeLocal();
  if (!ls) return [];
  try {
    const raw = JSON.parse(ls.getItem(KEY_HISTORY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw as HighScore[];
  } catch {
    return [];
  }
}

export function appendHistory(entry: HighScore) {
  const ls = safeLocal();
  if (!ls) return;
  const list = getHistory();
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  const trimmed = list.slice(0, 25);
  ls.setItem(KEY_HISTORY, JSON.stringify(trimmed));
}

export function getMuted(): boolean {
  const ls = safeLocal();
  if (!ls) return false;
  return ls.getItem(KEY_MUTED) === "1";
}

export function setMuted(v: boolean) {
  const ls = safeLocal();
  if (!ls) return;
  ls.setItem(KEY_MUTED, v ? "1" : "0");
}
