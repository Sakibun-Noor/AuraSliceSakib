# Aura Slice

A premium, fully-playable Next.js fruit-slicing game.
Slice. Glow. Ascend.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** with a custom glassmorphism/aura design system
- **HTML5 Canvas** + custom physics (no heavy deps)
- **Web Audio API** for procedurally-synthesized SFX
- **localStorage** for player name, per-mode personal bests, run history

## Getting started

```bash
cd aura-slice
npm install
npm run dev
```

Open http://localhost:3000.

## Routes

- `/` — Home. Enter your blade name, pick a mode.
- `/play?mode=classic|zen|blitz` — The game. 3-second countdown, HUD, pause, game over.
- `/leaderboard` — Your personal bests + local history mixed with seeded legends.

## Modes

| Mode    | Lives | Time | Bombs | Feel |
|---------|-------|------|-------|------|
| Classic | 3     | —    | yes   | Pure skill. Miss 3 or hit a bomb → game over. |
| Zen     | ∞     | 90s  | no    | No pressure, relaxing flow state. |
| Blitz   | 1     | 30s  | yes   | Each slice adds time. Fast & dangerous. |

## Controls

- **Mouse**: click-drag to slice.
- **Touch**: drag finger.
- **Esc / ⏸ button**: pause.
- **🔊 button**: toggle audio.

## File map

```
aura-slice/
├── app/
│   ├── layout.tsx         # fonts, metadata, ambient background
│   ├── page.tsx           # home / mode picker
│   ├── play/page.tsx      # game page (reads ?mode=)
│   ├── leaderboard/page.tsx
│   └── globals.css        # tailwind + glass/aura utilities
├── components/
│   ├── GameCanvas.tsx     # the full game: canvas, loop, physics, HUD, overlays
│   ├── HomeHero.tsx       # home hero + mode cards + name input
│   ├── LeaderboardView.tsx
│   └── TopNav.tsx
├── lib/
│   ├── audio.ts           # Web Audio SFX synthesis
│   ├── storage.ts         # localStorage helpers
│   └── game/types.ts      # mode configs + shared types
├── tailwind.config.ts
├── next.config.mjs
├── tsconfig.json
└── package.json
```

## What's next (roadmap phases 3–5)

Phase 2 (core conversion loop) and the playable game itself are done. When you're ready:

- **Phase 3** — next/image for screenshots, JSON-LD `VideoGame` schema, OG image.
- **Phase 4** — `/api/subscribe` route, analytics (Vercel Analytics or Plausible), bug-intake form.
- **Phase 5** — push to GitHub, connect Vercel, verify Web Vitals.
