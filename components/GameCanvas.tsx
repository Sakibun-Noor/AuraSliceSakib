"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MODES, type GameMode, type ModeConfig } from "@/lib/game/types";
import {
  appendHistory,
  getMuted,
  getPlayerName,
  setBestIfHigher,
  setMuted,
} from "@/lib/storage";
import {
  playBomb,
  playCombo,
  playGameOver,
  playMiss,
  playSlice,
  playTick,
  setAudioMuted,
  unlockAudio,
} from "@/lib/audio";

// ---------- types ----------
type FruitKind = {
  name: string;
  color: string;
  core: string;
  glow: string;
  juice: string;
  radius: number;
};

const FRUITS: FruitKind[] = [
  {
    name: "Watermelon",
    color: "#33d17a",
    core: "#ff3b6b",
    glow: "rgba(255,59,107,0.6)",
    juice: "#ff4a7a",
    radius: 54,
  },
  {
    name: "Dragon Fruit",
    color: "#ff4a8d",
    core: "#ffeef4",
    glow: "rgba(255,74,141,0.6)",
    juice: "#ffd0e2",
    radius: 48,
  },
  {
    name: "Kiwi",
    color: "#8ed36b",
    core: "#dff7b5",
    glow: "rgba(142,211,107,0.6)",
    juice: "#b5e387",
    radius: 42,
  },
  {
    name: "Citrus",
    color: "#ffb347",
    core: "#fff1c2",
    glow: "rgba(255,179,71,0.55)",
    juice: "#ffd477",
    radius: 44,
  },
  {
    name: "Aurora",
    color: "#7a5dff",
    core: "#e7dcff",
    glow: "rgba(122,93,255,0.6)",
    juice: "#c0aaff",
    radius: 46,
  },
  {
    name: "Lychee",
    color: "#ff7a9c",
    core: "#fff2f6",
    glow: "rgba(255,122,156,0.55)",
    juice: "#ffc4d3",
    radius: 40,
  },
];

interface Vec {
  x: number;
  y: number;
}

interface Fruit {
  id: number;
  kind: FruitKind;
  pos: Vec;
  vel: Vec;
  rot: number;
  spin: number;
  sliced: boolean;
  alive: boolean;
  isBomb: boolean;
  // for sliced halves:
  sliceDir?: Vec;
  halfOffset?: number;
  sliceAge?: number;
  scored?: boolean;
}

interface Particle {
  pos: Vec;
  vel: Vec;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
  gravity: number;
}

interface Popup {
  pos: Vec;
  text: string;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface BladePoint {
  x: number;
  y: number;
  t: number;
}

interface GameStats {
  mode: GameMode;
  score: number;
  bestCombo: number;
  slices: number;
  missed: number;
}

// ---------- helpers ----------
function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// distance from point p to segment a-b
function distSeg(p: Vec, a: Vec, b: Vec): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const wx = p.x - a.x;
  const wy = p.y - a.y;
  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(p.x - b.x, p.y - b.y);
  const t = c1 / c2;
  const px = a.x + t * vx;
  const py = a.y + t * vy;
  return Math.hypot(p.x - px, p.y - py);
}

// ---------- component ----------
interface Props {
  mode: GameMode;
}

export default function GameCanvas({ mode }: Props) {
  const router = useRouter();
  const cfg: ModeConfig = useMemo(() => MODES[mode], [mode]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // HUD state (React-rendered)
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(
    cfg.maxLives === Infinity ? 3 : cfg.maxLives
  );
  const [timeLeft, setTimeLeft] = useState(cfg.durationSeconds ?? 0);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [gameOverStats, setGameOverStats] = useState<GameStats | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [muted, setMutedState] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [running, setRunning] = useState(false);

  // mutable game state in refs
  const fruitsRef = useRef<Fruit[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const popupsRef = useRef<Popup[]>([]);
  const bladeRef = useRef<BladePoint[]>([]);
  const pointerDownRef = useRef(false);
  const stateRef = useRef({
    score: 0,
    combo: 0,
    bestCombo: 0,
    lives: cfg.maxLives === Infinity ? Infinity : cfg.maxLives,
    timeLeft: cfg.durationSeconds ?? Infinity,
    spawnCooldown: 0.6,
    spawnInterval: cfg.spawnBase,
    elapsed: 0,
    slices: 0,
    missed: 0,
    multiplier: cfg.scoreMultiplierAtStart,
    strokeSlices: 0,
    lastSliceAt: 0,
    gameOver: false,
    paused: false,
    running: false,
    nextId: 1,
    screenShake: 0,
  });

  const sizeRef = useRef({ w: 800, h: 600, dpr: 1 });
  const rafRef = useRef<number | null>(null);
  const lastTRef = useRef<number>(0);
  const tickerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);

  const startCountdown = useCallback(() => {
    if (countdownRef.current) window.clearInterval(countdownRef.current);
    setCountdown(3);
    setRunning(false);
    stateRef.current.running = false;
    let n = 3;
    countdownRef.current = window.setInterval(() => {
      n -= 1;
      setCountdown(n);
      playTick();
      if (n <= 0) {
        if (countdownRef.current) {
          window.clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
        setRunning(true);
        stateRef.current.running = true;
      }
    }, 700);
  }, []);

  // ---------- init muted state ----------
  useEffect(() => {
    const m = getMuted();
    setMutedState(m);
    setAudioMuted(m);
  }, []);

  // ---------- spawn a fruit ----------
  const spawn = useCallback(
    (now: number) => {
      const size = sizeRef.current;
      const isBomb =
        cfg.bombsEnabled && now > 4 && Math.random() < 0.12;
      const kind = isBomb
        ? {
            name: "Bomb",
            color: "#1a1d2a",
            core: "#ff4a4a",
            glow: "rgba(255,80,80,0.7)",
            juice: "#ff4a4a",
            radius: 42,
          }
        : pick(FRUITS);
      const w = size.w;
      const fromLeft = Math.random() < 0.5;
      const x = fromLeft ? rand(60, w * 0.4) : rand(w * 0.6, w - 60);
      const y = size.h + kind.radius + 20;
      const targetX = rand(w * 0.25, w * 0.75);
      // parabolic arc: compute initial velocity to peak near upper third
      const peakY = rand(size.h * 0.12, size.h * 0.35);
      const g = cfg.gravity;
      const dy = y - peakY;
      const vy0 = -Math.sqrt(2 * g * dy);
      // time to reach peak = -vy0/g, use 2x for airtime
      const airtime = (-2 * vy0) / g;
      const vx = (targetX - x) / airtime;
      const fruit: Fruit = {
        id: stateRef.current.nextId++,
        kind,
        pos: { x, y },
        vel: { x: vx, y: vy0 },
        rot: rand(0, Math.PI * 2),
        spin: rand(-3, 3),
        sliced: false,
        alive: true,
        isBomb,
      };
      fruitsRef.current.push(fruit);
    },
    [cfg]
  );

  // ---------- score a slice ----------
  const onSlice = useCallback(
    (f: Fruit, sliceDir: Vec, now: number) => {
      const s = stateRef.current;
      if (f.isBomb) {
        // BOOM
        playBomb();
        s.screenShake = 28;
        // big flash particles
        for (let i = 0; i < 50; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = rand(220, 560);
          particlesRef.current.push({
            pos: { ...f.pos },
            vel: { x: Math.cos(a) * sp, y: Math.sin(a) * sp },
            life: rand(0.7, 1.4),
            maxLife: 1.4,
            radius: rand(3, 7),
            color: Math.random() < 0.5 ? "#ff4a4a" : "#ffe7a8",
            gravity: 600,
          });
        }
        if (cfg.missPenalty || cfg.maxLives < Infinity) {
          // classic/blitz: bomb ends the run
          endGame("bomb");
        }
        return;
      }
      // normal fruit
      playSlice(rand(-0.3, 0.4));
      // halves
      f.sliced = true;
      f.sliceDir = { ...sliceDir };
      f.sliceAge = 0;
      // juice splatter
      for (let i = 0; i < 22; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = rand(140, 380);
        particlesRef.current.push({
          pos: { ...f.pos },
          vel: { x: Math.cos(a) * sp, y: Math.sin(a) * sp },
          life: rand(0.45, 0.9),
          maxLife: 0.9,
          radius: rand(2, 5),
          color: f.kind.juice,
          gravity: 700,
        });
      }
      // combo tracking
      s.slices++;
      const dt = now - s.lastSliceAt;
      if (dt < 0.35) {
        s.strokeSlices++;
      } else {
        s.strokeSlices = 1;
      }
      s.lastSliceAt = now;
      if (s.strokeSlices >= 2) {
        s.combo = s.strokeSlices;
        s.bestCombo = Math.max(s.bestCombo, s.combo);
        setCombo(s.combo);
        playCombo(s.combo);
      } else {
        s.combo = 1;
        setCombo(1);
      }
      // score
      const base = 100;
      const mult = s.strokeSlices >= 2 ? s.strokeSlices : 1;
      const add = base * mult;
      s.score += add;
      setScore(s.score);
      popupsRef.current.push({
        pos: { x: f.pos.x, y: f.pos.y - 20 },
        text: s.strokeSlices >= 2 ? `${add}  x${mult}` : `+${add}`,
        life: 0.9,
        maxLife: 0.9,
        color: mult > 1 ? "#ffd477" : "#ffffff",
        size: mult > 1 ? 26 + mult * 2 : 20,
      });
      // blitz time bonus
      if (cfg.blitzTimeBonusPerSlice && isFinite(s.timeLeft)) {
        s.timeLeft = Math.min(
          (cfg.durationSeconds ?? 30) + 5,
          s.timeLeft + cfg.blitzTimeBonusPerSlice
        );
        setTimeLeft(s.timeLeft);
      }
    },
    [cfg]
  );

  // ---------- end game ----------
  const endGame = useCallback(
    (reason: "bomb" | "lives" | "time") => {
      const s = stateRef.current;
      if (s.gameOver) return;
      s.gameOver = true;
      s.running = false;
      setRunning(false);
      setGameOver(true);
      playGameOver();
      const stats: GameStats = {
        mode,
        score: s.score,
        bestCombo: s.bestCombo,
        slices: s.slices,
        missed: s.missed,
      };
      setGameOverStats(stats);
      // persist
      const name = getPlayerName() || "Anonymous";
      const isBest = setBestIfHigher(mode, s.score);
      setIsNewBest(isBest);
      appendHistory({
        name,
        mode,
        score: s.score,
        at: Date.now(),
      });
      void reason;
    },
    [mode]
  );

  // ---------- resize ----------
  const handleResize = useCallback(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    sizeRef.current = { w: rect.width, h: rect.height, dpr };
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  // ---------- pointer ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getPoint = (e: PointerEvent): Vec => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture?.(e.pointerId);
      pointerDownRef.current = true;
      stateRef.current.strokeSlices = 0;
      unlockAudio();
      const p = getPoint(e);
      bladeRef.current = [{ x: p.x, y: p.y, t: performance.now() }];
    };

    const onMove = (e: PointerEvent) => {
      // allow blade trail even without button pressed for desktop users,
      // but only *slice* when pressed OR on touch.
      const p = getPoint(e);
      const blade = bladeRef.current;
      blade.push({ x: p.x, y: p.y, t: performance.now() });
      if (blade.length > 18) blade.shift();
      if (
        (pointerDownRef.current || e.pointerType === "touch") &&
        blade.length >= 2
      ) {
        const a = blade[blade.length - 2];
        const b = blade[blade.length - 1];
        // ignore micro-movements
        const segLen = Math.hypot(b.x - a.x, b.y - a.y);
        if (segLen < 6) return;
        const now = performance.now() / 1000;
        const fs = fruitsRef.current;
        for (const f of fs) {
          if (!f.alive || f.sliced) continue;
          const d = distSeg(f.pos, a, b);
          if (d < f.kind.radius * 0.9) {
            const dir = { x: b.x - a.x, y: b.y - a.y };
            const m = Math.hypot(dir.x, dir.y) || 1;
            dir.x /= m;
            dir.y /= m;
            onSlice(f, dir, now);
          }
        }
      }
    };

    const onUp = (e: PointerEvent) => {
      pointerDownRef.current = false;
      stateRef.current.strokeSlices = 0;
      canvas.releasePointerCapture?.(e.pointerId);
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("pointerleave", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onUp);
    };
  }, [onSlice]);

  // ---------- countdown start ----------
  useEffect(() => {
    startCountdown();
    return () => {
      if (countdownRef.current) {
        window.clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [mode, startCountdown]);

  // ---------- blitz/zen timer tick ----------
  useEffect(() => {
    if (!running || paused || gameOver) return;
    if (cfg.durationSeconds == null) return;
    tickerRef.current = window.setInterval(() => {
      const s = stateRef.current;
      if (s.paused || s.gameOver || !s.running) return;
      s.timeLeft -= 1;
      setTimeLeft(Math.max(0, Math.ceil(s.timeLeft)));
      if (s.timeLeft <= 0) {
        endGame("time");
      } else if (s.timeLeft <= 5) {
        playTick();
      }
    }, 1000);
    return () => {
      if (tickerRef.current) window.clearInterval(tickerRef.current);
    };
  }, [running, paused, gameOver, cfg.durationSeconds, endGame]);

  // keep paused flag in state ref
  useEffect(() => {
    stateRef.current.paused = paused;
  }, [paused]);

  // ---------- main loop ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    lastTRef.current = performance.now();

    const tick = (tNow: number) => {
      rafId = requestAnimationFrame(tick);
      const s = stateRef.current;
      const dt = Math.min(0.033, (tNow - lastTRef.current) / 1000);
      lastTRef.current = tNow;

      const size = sizeRef.current;
      // ---- simulate ----
      if (s.running && !s.paused && !s.gameOver) {
        s.elapsed += dt;
        // ramp spawn interval
        s.spawnInterval = Math.max(
          cfg.spawnMin,
          s.spawnInterval * Math.pow(cfg.spawnRamp, dt * 60)
        );
        s.spawnCooldown -= dt;
        if (s.spawnCooldown <= 0) {
          const burst =
            Math.random() < 0.18 ? (Math.random() < 0.4 ? 3 : 2) : 1;
          for (let i = 0; i < burst; i++) {
            spawn(s.elapsed);
          }
          s.spawnCooldown = rand(
            s.spawnInterval * 0.7,
            s.spawnInterval * 1.25
          );
        }

        // fruits
        for (const f of fruitsRef.current) {
          if (!f.alive) continue;
          f.vel.y += cfg.gravity * dt;
          f.pos.x += f.vel.x * dt;
          f.pos.y += f.vel.y * dt;
          f.rot += f.spin * dt;
          if (f.sliced) {
            f.sliceAge = (f.sliceAge ?? 0) + dt;
            if (f.sliceAge > 1.2) f.alive = false;
          }
          // off bottom
          if (f.pos.y - f.kind.radius > size.h + 40) {
            f.alive = false;
            if (!f.sliced && !f.isBomb) {
              // missed a fruit
              s.missed++;
              if (cfg.missPenalty && s.lives !== Infinity) {
                s.lives = Math.max(0, s.lives - 1);
                setLives(s.lives);
                playMiss();
                if (s.lives <= 0) endGame("lives");
              } else if (!cfg.missPenalty) {
                // zen: no penalty
              }
            }
          }
        }
        fruitsRef.current = fruitsRef.current.filter((f) => f.alive);

        // particles
        for (const p of particlesRef.current) {
          p.vel.y += p.gravity * dt;
          p.pos.x += p.vel.x * dt;
          p.pos.y += p.vel.y * dt;
          p.life -= dt;
        }
        particlesRef.current = particlesRef.current.filter((p) => p.life > 0);

        // popups
        for (const p of popupsRef.current) {
          p.life -= dt;
          p.pos.y -= 40 * dt;
        }
        popupsRef.current = popupsRef.current.filter((p) => p.life > 0);

        // combo decay
        if (s.combo > 0 && tNow / 1000 - s.lastSliceAt > 0.6) {
          s.combo = 0;
          setCombo(0);
        }

        // screen shake decay
        s.screenShake = Math.max(0, s.screenShake - dt * 60);
      }

      // ---- render ----
      ctx.clearRect(0, 0, size.w, size.h);

      // shake
      let sx = 0;
      let sy = 0;
      if (s.screenShake > 0) {
        sx = rand(-s.screenShake, s.screenShake);
        sy = rand(-s.screenShake, s.screenShake);
      }
      ctx.save();
      ctx.translate(sx, sy);

      // subtle vignette glow
      const grad = ctx.createRadialGradient(
        size.w / 2,
        size.h / 2,
        size.h * 0.1,
        size.w / 2,
        size.h / 2,
        size.h * 0.85
      );
      grad.addColorStop(0, "rgba(255,81,104,0.05)");
      grad.addColorStop(1, "rgba(11,19,38,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size.w, size.h);

      // fruits
      for (const f of fruitsRef.current) {
        drawFruit(ctx, f);
      }

      // particles
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const p of particlesRef.current) {
        const a = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, p.radius * a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // blade trail
      drawBlade(ctx, bladeRef.current);

      // score popups
      for (const p of popupsRef.current) {
        const a = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.font = `700 ${p.size}px "Epilogue", system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 14;
        ctx.fillText(p.text, p.pos.x, p.pos.y);
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

      ctx.restore();
    };

    rafId = requestAnimationFrame(tick);
    rafRef.current = rafId;
    return () => cancelAnimationFrame(rafId);
  }, [cfg, spawn, endGame]);

  // ---------- render draw helpers ----------
  function drawFruit(ctx: CanvasRenderingContext2D, f: Fruit) {
    const { pos, kind, rot, isBomb } = f;
    const r = kind.radius;

    // soft glow
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(pos.x, pos.y, r * 0.2, pos.x, pos.y, r * 2.2);
    g.addColorStop(0, kind.glow);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (f.sliced && f.sliceDir) {
      const t = f.sliceAge ?? 0;
      const push = 24 + t * 120;
      const nx = -f.sliceDir.y;
      const ny = f.sliceDir.x;
      drawHalf(ctx, f, nx * push, ny * push, 1);
      drawHalf(ctx, f, -nx * push, -ny * push, -1);
      return;
    }

    // intact fruit
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(rot);
    // base
    const bg = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.15, 0, 0, r);
    bg.addColorStop(0, "#ffffff");
    bg.addColorStop(0.25, kind.color);
    bg.addColorStop(1, "#0b0f1e");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    if (isBomb) {
      // fuse
      ctx.strokeStyle = "#ffb347";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(r * 0.4, -r * 1.4, r * 0.7, -r * 1.6);
      ctx.stroke();
      // spark
      const sparkR = 3 + Math.sin(performance.now() / 60) * 1.5;
      ctx.fillStyle = "#fff1c2";
      ctx.shadowColor = "#ff4a4a";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(r * 0.7, -r * 1.6, sparkR, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      // highlight
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.ellipse(-r * 0.35, -r * 0.4, r * 0.3, r * 0.18, -0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    // rim
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawHalf(
    ctx: CanvasRenderingContext2D,
    f: Fruit,
    ox: number,
    oy: number,
    side: number
  ) {
    const { pos, kind, sliceDir } = f;
    const r = kind.radius;
    if (!sliceDir) return;
    const angle = Math.atan2(sliceDir.y, sliceDir.x);
    ctx.save();
    ctx.translate(pos.x + ox, pos.y + oy);
    ctx.rotate(angle);
    // clipped half
    ctx.beginPath();
    if (side > 0) {
      ctx.arc(0, 0, r, Math.PI, 0);
    } else {
      ctx.arc(0, 0, r, 0, Math.PI);
    }
    ctx.closePath();
    const bg = ctx.createLinearGradient(0, -r, 0, r);
    bg.addColorStop(0, kind.color);
    bg.addColorStop(1, "#0b0f1e");
    ctx.fillStyle = bg;
    ctx.fill();
    // inner flesh
    ctx.beginPath();
    if (side > 0) {
      ctx.arc(0, 0, r * 0.72, Math.PI, 0);
    } else {
      ctx.arc(0, 0, r * 0.72, 0, Math.PI);
    }
    ctx.closePath();
    ctx.fillStyle = kind.juice;
    ctx.fill();
    // core dot
    ctx.fillStyle = kind.core;
    ctx.beginPath();
    ctx.arc(0, side > 0 ? -r * 0.3 : r * 0.3, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    // cut line
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.lineTo(r, 0);
    ctx.stroke();
    ctx.restore();
  }

  function drawBlade(ctx: CanvasRenderingContext2D, pts: BladePoint[]) {
    if (pts.length < 2) return;
    const now = performance.now();
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const age = (now - b.t) / 260;
      const alpha = Math.max(0, 1 - age);
      if (alpha <= 0) continue;
      const width = 12 * alpha;
      // outer glow
      ctx.strokeStyle = `rgba(255,81,104,${0.25 * alpha})`;
      ctx.lineWidth = width * 2.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      // core
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = width * 0.6;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------- actions ----------
  const togglePause = () => setPaused((p) => !p);
  const toggleMute = () => {
    setMutedState((v) => {
      const next = !v;
      setMuted(next);
      setAudioMuted(next);
      return next;
    });
  };
  const restart = () => {
    // clear state
    const s = stateRef.current;
    s.score = 0;
    s.combo = 0;
    s.bestCombo = 0;
    s.lives = cfg.maxLives === Infinity ? Infinity : cfg.maxLives;
    s.timeLeft = cfg.durationSeconds ?? Infinity;
    s.spawnInterval = cfg.spawnBase;
    s.spawnCooldown = 0.6;
    s.elapsed = 0;
    s.slices = 0;
    s.missed = 0;
    s.strokeSlices = 0;
    s.lastSliceAt = 0;
    s.gameOver = false;
    s.paused = false;
    s.running = false;
    s.nextId = 1;
    s.screenShake = 0;
    fruitsRef.current = [];
    particlesRef.current = [];
    popupsRef.current = [];
    bladeRef.current = [];
    setScore(0);
    setCombo(0);
    setLives(cfg.maxLives === Infinity ? 3 : cfg.maxLives);
    setTimeLeft(cfg.durationSeconds ?? 0);
    setGameOver(false);
    setGameOverStats(null);
    setIsNewBest(false);
    setPaused(false);
    startCountdown();
  };

  // ---------- HUD helpers ----------
  const accentClass =
    cfg.accent === "primary"
      ? "text-aura-primary"
      : cfg.accent === "secondary"
        ? "text-aura-secondary-soft"
        : "text-aura-tertiary-soft";

  return (
    <div
      ref={wrapRef}
      className="fixed inset-0 z-0 game-surface select-none"
      aria-label="Aura Slice game area"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* HUD */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top bar */}
        <div className="pointer-events-auto absolute top-0 inset-x-0 px-4 md:px-8 py-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="glass rounded-full px-4 py-2 font-caps text-xs uppercase tracking-widest text-white/80 hover:text-white transition-colors"
            >
              ← Menu
            </Link>
            <div className="glass rounded-full px-4 py-2 font-caps text-xs uppercase tracking-widest text-white/70">
              <span className={accentClass}>{cfg.title}</span> Mode
            </div>
          </div>
          <div className="glass rounded-2xl px-5 py-3 flex flex-col items-end min-w-[160px]">
            <span className="font-caps text-[10px] uppercase tracking-widest text-white/50">
              Score
            </span>
            <span className="font-display font-black text-3xl text-white tabular-nums leading-none mt-1">
              {score.toLocaleString()}
            </span>
            {combo >= 2 && (
              <span className="mt-1 font-caps text-[11px] uppercase tracking-widest text-aura-primary-soft animate-pulse-glow">
                ×{combo} Combo
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {cfg.durationSeconds != null && (
              <div className="glass rounded-2xl px-4 py-3 flex flex-col items-center min-w-[80px]">
                <span className="font-caps text-[10px] uppercase tracking-widest text-white/50">
                  Time
                </span>
                <span
                  className={`font-display font-black text-2xl tabular-nums leading-none mt-1 ${
                    timeLeft <= 5 ? "text-aura-primary" : "text-white"
                  }`}
                >
                  {Math.max(0, Math.ceil(timeLeft))}
                </span>
              </div>
            )}
            {cfg.maxLives !== Infinity && (
              <div className="glass rounded-2xl px-4 py-3 flex flex-col items-center">
                <span className="font-caps text-[10px] uppercase tracking-widest text-white/50">
                  Lives
                </span>
                <div className="flex gap-1 mt-1.5">
                  {Array.from({ length: cfg.maxLives }).map((_, i) => (
                    <span
                      key={i}
                      className={`block w-2.5 h-2.5 rounded-full ${
                        i < lives
                          ? "bg-aura-primary shadow-[0_0_8px_rgba(255,81,104,0.8)]"
                          : "bg-white/10"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              className="glass rounded-full w-10 h-10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
            >
              {muted ? "🔇" : "🔊"}
            </button>
            <button
              onClick={togglePause}
              aria-label="Pause"
              className="glass rounded-full w-10 h-10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
            >
              {paused ? "▶" : "⏸"}
            </button>
          </div>
        </div>

        {/* Countdown overlay */}
        {!running && !gameOver && countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="font-display font-black text-[180px] logo-sweep italic animate-pulse-glow">
              {countdown}
            </div>
          </div>
        )}
        {!running && !gameOver && countdown === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="font-display font-black text-7xl logo-sweep italic animate-fade-in">
              SLICE!
            </div>
          </div>
        )}

        {/* Pause overlay */}
        {paused && !gameOver && (
          <div className="absolute inset-0 pointer-events-auto flex items-center justify-center backdrop-blur-sm bg-black/50 animate-fade-in">
            <div className="glass-strong rounded-2xl p-10 min-w-[340px] text-center space-y-6">
              <h2 className="font-display font-black text-4xl logo-sweep italic">
                Paused
              </h2>
              <p className="font-body text-aura-text-dim">Take a breath.</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={togglePause}
                  className="btn-neon py-3 rounded-xl font-caps uppercase tracking-widest text-sm font-bold"
                >
                  Resume
                </button>
                <button
                  onClick={toggleMute}
                  className="btn-ghost py-3 rounded-xl font-caps uppercase tracking-widest text-sm font-bold"
                >
                  Sound: {muted ? "Off" : "On"}
                </button>
                <button
                  onClick={restart}
                  className="btn-ghost py-3 rounded-xl font-caps uppercase tracking-widest text-sm font-bold"
                >
                  Restart
                </button>
                <Link
                  href="/"
                  className="btn-ghost py-3 rounded-xl font-caps uppercase tracking-widest text-sm font-bold"
                >
                  Quit to Menu
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Game Over overlay */}
        {gameOver && gameOverStats && (
          <div className="absolute inset-0 pointer-events-auto flex items-center justify-center backdrop-blur-sm bg-black/60 animate-fade-in">
            <div className="glass-strong rounded-2xl p-10 min-w-[360px] max-w-md w-[92vw] text-center space-y-6">
              <div className="space-y-2">
                <p className="font-caps text-xs uppercase tracking-widest text-aura-primary-soft">
                  {cfg.title} Run Complete
                </p>
                <h2 className="font-display font-black text-5xl logo-sweep italic">
                  {isNewBest ? "New Aura!" : "Run Over"}
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3 text-left">
                <Stat label="Score" value={gameOverStats.score.toLocaleString()} big />
                <Stat label="Best Combo" value={`×${gameOverStats.bestCombo || 1}`} />
                <Stat label="Slices" value={gameOverStats.slices.toString()} />
                <Stat label="Missed" value={gameOverStats.missed.toString()} />
              </div>
              {isNewBest && (
                <div className="font-caps text-xs uppercase tracking-widest text-aura-primary animate-pulse-glow">
                  ★ Personal Best Saved
                </div>
              )}
              <div className="flex flex-col gap-3">
                <button
                  onClick={restart}
                  className="btn-neon py-3 rounded-xl font-caps uppercase tracking-widest text-sm font-bold"
                >
                  Slice Again
                </button>
                <Link
                  href="/leaderboard"
                  className="btn-ghost py-3 rounded-xl font-caps uppercase tracking-widest text-sm font-bold"
                >
                  View Leaderboard
                </Link>
                <button
                  onClick={() => router.push("/")}
                  className="btn-ghost py-3 rounded-xl font-caps uppercase tracking-widest text-sm font-bold"
                >
                  Back to Menu
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  big,
}: {
  label: string;
  value: string;
  big?: boolean;
}) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="font-caps text-[10px] uppercase tracking-widest text-white/50">
        {label}
      </div>
      <div
        className={`font-display font-bold text-white tabular-nums mt-1 ${
          big ? "text-3xl" : "text-xl"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
