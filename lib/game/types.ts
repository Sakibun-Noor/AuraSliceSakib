export type GameMode = "classic" | "zen" | "blitz";

export interface ModeConfig {
  id: GameMode;
  title: string;
  blurb: string;
  icon: string;
  accent: "primary" | "secondary" | "tertiary";
  maxLives: number;
  durationSeconds: number | null;
  bombsEnabled: boolean;
  spawnBase: number;
  spawnMin: number;
  spawnRamp: number;
  gravity: number;
  missPenalty: boolean;
  scoreMultiplierAtStart: number;
  blitzTimeBonusPerSlice: number;
}

export const MODES: Record<GameMode, ModeConfig> = {
  classic: {
    id: "classic",
    title: "Classic",
    blurb:
      "Miss three fruits or hit a bomb and it's game over. Pure skill, pure slicing.",
    icon: "swords",
    accent: "primary",
    maxLives: 3,
    durationSeconds: null,
    bombsEnabled: true,
    spawnBase: 1.1,
    spawnMin: 0.45,
    spawnRamp: 0.985,
    gravity: 900,
    missPenalty: true,
    scoreMultiplierAtStart: 1,
    blitzTimeBonusPerSlice: 0,
  },
  zen: {
    id: "zen",
    title: "Zen",
    blurb:
      "No bombs, no lives — just 90 seconds of uninterrupted, relaxing slicing.",
    icon: "spa",
    accent: "secondary",
    maxLives: Infinity,
    durationSeconds: 90,
    bombsEnabled: false,
    spawnBase: 1.2,
    spawnMin: 0.55,
    spawnRamp: 0.995,
    gravity: 820,
    missPenalty: false,
    scoreMultiplierAtStart: 1,
    blitzTimeBonusPerSlice: 0,
  },
  blitz: {
    id: "blitz",
    title: "Blitz",
    blurb:
      "Rapid-fire mode. Slice fast to keep the timer alive. Bombs end your run instantly.",
    icon: "bolt",
    accent: "tertiary",
    maxLives: 1,
    durationSeconds: 30,
    bombsEnabled: true,
    spawnBase: 0.8,
    spawnMin: 0.25,
    spawnRamp: 0.98,
    gravity: 950,
    missPenalty: false,
    scoreMultiplierAtStart: 1,
    blitzTimeBonusPerSlice: 0.4,
  },
};

export const MODE_LIST: ModeConfig[] = [MODES.classic, MODES.zen, MODES.blitz];

export function isGameMode(v: string | null | undefined): v is GameMode {
  return v === "classic" || v === "zen" || v === "blitz";
}
