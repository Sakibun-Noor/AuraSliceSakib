let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let muted = false;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.55;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

export function unlockAudio() {
  ensureCtx();
}

export function setAudioMuted(v: boolean) {
  muted = v;
  if (masterGain && ctx) {
    masterGain.gain.setTargetAtTime(v ? 0 : 0.55, ctx.currentTime, 0.02);
  }
}

export function isAudioMuted() {
  return muted;
}

function envGain(
  attack: number,
  decay: number,
  peak: number,
  start: number
): GainNode | null {
  if (!ctx || !masterGain) return null;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(peak, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);
  g.connect(masterGain);
  return g;
}

export function playSlice(pitchBias = 0) {
  const c = ensureCtx();
  if (!c || muted) return;
  const now = c.currentTime;
  // swoosh: filtered noise
  const bufSize = Math.floor(c.sampleRate * 0.25);
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
  }
  const noise = c.createBufferSource();
  noise.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1800 + pitchBias * 400, now);
  filter.frequency.exponentialRampToValueAtTime(
    420 + pitchBias * 200,
    now + 0.18
  );
  filter.Q.value = 2.2;
  const g = envGain(0.005, 0.22, 0.5, now);
  if (!g) return;
  noise.connect(filter).connect(g);
  noise.start(now);
  noise.stop(now + 0.28);

  // pitched thwack
  const osc = c.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(520 + pitchBias * 120, now);
  osc.frequency.exponentialRampToValueAtTime(120, now + 0.09);
  const og = envGain(0.001, 0.09, 0.25, now);
  if (og) {
    osc.connect(og);
    osc.start(now);
    osc.stop(now + 0.12);
  }
}

export function playCombo(level: number) {
  const c = ensureCtx();
  if (!c || muted) return;
  const now = c.currentTime;
  const notes = [523.25, 659.25, 783.99, 987.77, 1318.51];
  const count = Math.min(level, notes.length);
  for (let i = 0; i < count; i++) {
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(notes[i], now + i * 0.06);
    const g = envGain(0.005, 0.25, 0.32, now + i * 0.06);
    if (!g) continue;
    osc.connect(g);
    osc.start(now + i * 0.06);
    osc.stop(now + i * 0.06 + 0.3);
  }
}

export function playBomb() {
  const c = ensureCtx();
  if (!c || muted) return;
  const now = c.currentTime;
  // low boom
  const osc = c.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(140, now);
  osc.frequency.exponentialRampToValueAtTime(28, now + 0.5);
  const g = envGain(0.005, 0.5, 0.7, now);
  if (g) {
    osc.connect(g);
    osc.start(now);
    osc.stop(now + 0.6);
  }
  // noise burst
  const bufSize = Math.floor(c.sampleRate * 0.4);
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) {
    d[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
  }
  const noise = c.createBufferSource();
  noise.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  const ng = envGain(0.001, 0.45, 0.6, now);
  if (ng) {
    noise.connect(filter).connect(ng);
    noise.start(now);
    noise.stop(now + 0.5);
  }
}

export function playMiss() {
  const c = ensureCtx();
  if (!c || muted) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(110, now + 0.2);
  const g = envGain(0.005, 0.22, 0.22, now);
  if (g) {
    osc.connect(g);
    osc.start(now);
    osc.stop(now + 0.3);
  }
}

export function playGameOver() {
  const c = ensureCtx();
  if (!c || muted) return;
  const now = c.currentTime;
  const notes = [523.25, 392, 329.63, 261.63];
  notes.forEach((n, i) => {
    const osc = c.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = n;
    const g = envGain(0.01, 0.4, 0.3, now + i * 0.14);
    if (!g) return;
    osc.connect(g);
    osc.start(now + i * 0.14);
    osc.stop(now + i * 0.14 + 0.5);
  });
}

export function playTick() {
  const c = ensureCtx();
  if (!c || muted) return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  osc.type = "square";
  osc.frequency.value = 880;
  const g = envGain(0.001, 0.05, 0.14, now);
  if (g) {
    osc.connect(g);
    osc.start(now);
    osc.stop(now + 0.08);
  }
}
