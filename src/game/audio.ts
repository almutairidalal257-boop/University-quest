// Procedural music and sound effects with the Web Audio API (no audio files needed, works offline).

let ctx: AudioContext | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let musicTimer: number | undefined;
let nextBeat = 0;
let beat = 0;

// Volumes are pushed in from settings by App to avoid an import cycle.
const vol = { musicOn: true, sfxOn: true, music: 0.5, sfx: 0.7 };

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  musicGain = ctx.createGain();
  sfxGain = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  musicGain.connect(comp);
  sfxGain.connect(comp);
  comp.connect(ctx.destination);
  applyVolumes();
  return ctx;
}

export function setVolumes(v: Partial<typeof vol>) {
  Object.assign(vol, v);
  applyVolumes();
  if (vol.musicOn) startMusic(); else stopMusic();
}

function applyVolumes() {
  if (!ctx || !musicGain || !sfxGain) return;
  musicGain.gain.setTargetAtTime(vol.musicOn ? vol.music * 0.22 : 0, ctx.currentTime, 0.1);
  sfxGain.gain.setTargetAtTime(vol.sfxOn ? vol.sfx * 0.5 : 0, ctx.currentTime, 0.02);
}

/** Must be called from a user gesture at least once. */
export function unlockAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
  if (vol.musicOn) startMusic();
}

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

function tone(dest: AudioNode, freq: number, start: number, dur: number, type: OscillatorType, gain: number, attack = 0.01, filter?: number) {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  let node: AudioNode = o;
  if (filter) {
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filter;
    o.connect(f);
    node = f;
  }
  node.connect(g);
  g.connect(dest);
  o.start(start);
  o.stop(start + dur + 0.05);
  return o;
}

// Cozy progression: Fmaj7 – Em7 – Dm7 – Cmaj7 / Am7 – Dm7 – G6 – Cmaj7
const CHORDS = [
  [53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59],
  [45, 48, 52, 55], [50, 53, 57, 60], [43, 47, 50, 52], [48, 52, 55, 59],
];
const MELODY = [
  76, -1, 74, 72, 74, -1, 72, 69, 72, -1, 69, 67, 67, -1, -1, -1,
  69, -1, 72, 74, 76, -1, 74, 72, 74, -1, 79, 76, 76, -1, -1, -1,
];
const TEMPO = 84;

function schedule() {
  if (!ctx || !musicGain) return;
  const spb = 60 / TEMPO / 2; // eighth notes
  while (nextBeat < ctx.currentTime + 0.25) {
    const bar = Math.floor(beat / 8) % CHORDS.length;
    const step = beat % 8;
    const chord = CHORDS[bar];
    if (step === 0) {
      chord.forEach((n) => tone(musicGain!, midi(n), nextBeat, spb * 8.2, 'triangle', 0.05, 0.4, 1200));
      tone(musicGain!, midi(chord[0] - 12), nextBeat, spb * 3, 'sine', 0.18, 0.02);
    }
    if (step === 4) tone(musicGain!, midi(chord[0] - 12), nextBeat, spb * 2.5, 'sine', 0.12, 0.02);
    // arpeggio
    const arp = chord[[0, 2, 1, 3, 2, 1, 3, 2][step]] + 12;
    tone(musicGain!, midi(arp), nextBeat, spb * 1.6, 'sine', 0.035, 0.005, 3000);
    // melody (every other loop to keep it gentle)
    const loop = Math.floor(beat / (8 * CHORDS.length));
    if (loop % 2 === 1) {
      const m = MELODY[(beat / 2) % MELODY.length | 0];
      if (step % 2 === 0 && m > 0) tone(musicGain!, midi(m), nextBeat, spb * 2.2, 'square', 0.025, 0.01, 1800);
    }
    nextBeat += spb;
    beat++;
  }
}

export function startMusic() {
  const c = ensure();
  if (!c || musicTimer) return;
  nextBeat = c.currentTime + 0.1;
  musicTimer = window.setInterval(schedule, 100);
}

export function stopMusic() {
  window.clearInterval(musicTimer);
  musicTimer = undefined;
}

export type Sfx = 'blip' | 'select' | 'correct' | 'wrong' | 'coin' | 'pickup' | 'door' | 'fanfare' | 'unlock' | 'drop' | 'hint' | 'achievement' | 'open' | 'tick' | 'alarm';

export function sfx(name: Sfx) {
  const c = ensure();
  if (!c || !sfxGain || !vol.sfxOn) return;
  const t = c.currentTime + 0.01;
  const d = sfxGain;
  switch (name) {
    case 'blip': tone(d, 880 + Math.random() * 120, t, 0.05, 'square', 0.04); break;
    case 'select': tone(d, 660, t, 0.08, 'triangle', 0.25); tone(d, 990, t + 0.05, 0.1, 'triangle', 0.2); break;
    case 'drop': tone(d, 330, t, 0.1, 'triangle', 0.3); break;
    case 'tick': tone(d, 1200, t, 0.03, 'square', 0.05); break;
    case 'correct': [72, 76, 79, 84].forEach((n, i) => tone(d, midi(n), t + i * 0.07, 0.25, 'triangle', 0.25)); break;
    case 'wrong': tone(d, 220, t, 0.18, 'sawtooth', 0.12, 0.01, 900); tone(d, 196, t + 0.12, 0.25, 'sawtooth', 0.12, 0.01, 900); break;
    case 'coin': tone(d, midi(83), t, 0.08, 'square', 0.12); tone(d, midi(88), t + 0.07, 0.3, 'square', 0.12); break;
    case 'pickup': [79, 83, 86, 91].forEach((n, i) => tone(d, midi(n), t + i * 0.05, 0.18, 'sine', 0.22)); break;
    case 'door': tone(d, 140, t, 0.25, 'triangle', 0.3, 0.01, 600); tone(d, 90, t + 0.1, 0.3, 'triangle', 0.25, 0.01, 500); break;
    case 'unlock': [60, 67, 72].forEach((n, i) => tone(d, midi(n), t + i * 0.09, 0.3, 'triangle', 0.25)); break;
    case 'hint': tone(d, midi(81), t, 0.3, 'sine', 0.2); tone(d, midi(88), t + 0.1, 0.4, 'sine', 0.15); break;
    case 'open': tone(d, 500, t, 0.06, 'triangle', 0.15); tone(d, 750, t + 0.04, 0.08, 'triangle', 0.12); break;
    case 'alarm': [0, 0.2, 0.4].forEach((o) => tone(d, 880, t + o, 0.12, 'square', 0.1)); break;
    case 'achievement': [76, 79, 84, 88].forEach((n, i) => tone(d, midi(n), t + i * 0.08, 0.4, 'triangle', 0.2)); break;
    case 'fanfare':
      [[60, 0], [64, 0.12], [67, 0.24], [72, 0.36], [67, 0.6], [72, 0.72]].forEach(([n, o]) => tone(d, midi(n), t + o, 0.35, 'square', 0.1, 0.01, 2500));
      [48, 55, 60].forEach((n) => tone(d, midi(n), t + 0.72, 1.2, 'triangle', 0.15));
      break;
  }
}

export function speak(text: string) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-GB';
    u.rate = 0.85;
    synth.speak(u);
  } catch { /* speech not available */ }
}
