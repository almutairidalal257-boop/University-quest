import { createStore } from './store';
import { sfx } from './audio';

export type Expr = 'normal' | 'happy' | 'sad' | 'worried' | 'surprised' | 'proud';

export interface Team { name: string; xp: number; stars: number; color: string }

export interface AppForm {
  firstName: string; surname: string; email: string; phone: string;
  course: string; mode: '' | 'full-time' | 'part-time';
  school: string; qualification: string; subjects: string; grade: string;
  other: string; declaration: boolean;
}

export interface Letter {
  course: string;
  greeting: string;
  paragraphs: string[];
  closing: string;
  name: string;
  savedAt: number | null;
  guided: Record<string, string>;
}

export interface GameState {
  started: boolean;
  mode: 'solo' | 'team';
  playerName: string;
  avatar: string;
  xp: number;
  coins: number;
  flags: Record<string, boolean>;
  listenDone: string[];
  vocab: string[];
  docsFound: string[];
  items: string[];
  best: Record<string, { xp: number; stars: number; mistakes: number; hints: number }>;
  achievements: string[];
  hintsTotal: number;
  room: string;
  pos: { x: number; y: number } | null;
  visited: string[];
  form: AppForm;
  letter: Letter;
  teams: Team[];
  activeTeam: number;
  timer: { enabled: boolean; seconds: number };
  startedAt: number;
}

export const emptyForm = (): AppForm => ({
  firstName: '', surname: '', email: '', phone: '', course: '', mode: '',
  school: '', qualification: '', subjects: '', grade: '', other: '', declaration: false,
});

export const defaultState = (): GameState => ({
  started: false,
  mode: 'solo',
  playerName: '',
  avatar: 'hijab-lavender',
  xp: 0,
  coins: 0,
  flags: {},
  listenDone: [],
  vocab: [],
  docsFound: [],
  items: [],
  best: {},
  achievements: [],
  hintsTotal: 0,
  room: 'campus',
  pos: null,
  visited: ['campus'],
  form: emptyForm(),
  letter: { course: '', greeting: 'Dear Sir or Madam,', paragraphs: ['', '', '', '', ''], closing: 'Yours faithfully,', name: '', savedAt: null, guided: {} },
  teams: [],
  activeTeam: 0,
  timer: { enabled: true, seconds: 180 },
  startedAt: Date.now(),
});

const SAVE_KEY = 'uq-mission-admission-save-v1';
const SETTINGS_KEY = 'uq-mission-admission-settings-v1';

function safeGet(key: string): any {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function safeSet(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage unavailable */ }
}

export function hasSave(): boolean {
  const s = safeGet(SAVE_KEY);
  return !!(s && s.started);
}

export function loadSave(): GameState | null {
  const s = safeGet(SAVE_KEY);
  if (!s || !s.started) return null;
  const d = defaultState();
  return { ...d, ...s, form: { ...d.form, ...s.form }, letter: { ...d.letter, ...s.letter }, timer: { ...d.timer, ...s.timer } };
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}

export const game = createStore<GameState>(defaultState());

let saveTimer: number | undefined;
game.subscribe(() => {
  if (!game.get().started) return;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => safeSet(SAVE_KEY, game.get()), 300);
});

// ---------------------------------------------------------------- settings
export interface Settings { musicOn: boolean; sfxOn: boolean; music: number; sfx: number; arabic: boolean; showTouch: boolean }
export const settings = createStore<Settings>({ musicOn: true, sfxOn: true, music: 0.5, sfx: 0.7, arabic: false, showTouch: false, ...(safeGet(SETTINGS_KEY) || {}) });
settings.subscribe(() => safeSet(SETTINGS_KEY, settings.get()));

// ---------------------------------------------------------------- UI state (not saved)
export interface DChoice { text: string; action?: () => void }
export interface DLine { speaker: string; look?: string; expr?: Expr; text: string; choices?: DChoice[] }
export interface Toast { id: number; text: string; kind: 'xp' | 'item' | 'info' | 'achievement' | 'level' | 'warn'; icon?: string }
export interface RewardPopup { title: string; items: { icon: string; name: string }[]; text?: string }

export type Modal = null | 'backpack' | 'journal' | 'pause' | 'howto' | 'settings' | 'leaderboard' | 'teacher';

export interface UIState {
  screen: 'menu' | 'create' | 'teamsetup' | 'intro' | 'play' | 'final';
  dialogue: { lines: DLine[]; index: number; onDone?: () => void } | null;
  minigame: { id: string; replay: boolean } | null;
  modal: Modal;
  vocabCard: string | null;
  toasts: Toast[];
  activeScenario: string | null;
  hint: string | null;
  run: { mistakes: number; hints: number };
  reward: RewardPopup | null;
  fade: boolean;
}

export const ui = createStore<UIState>({
  screen: 'menu', dialogue: null, minigame: null, modal: null, vocabCard: null, toasts: [],
  activeScenario: null, hint: null, run: { mistakes: 0, hints: 0 }, reward: null, fade: false,
});

export const isBlocking = () => {
  const u = ui.get();
  return u.screen !== 'play' || !!u.dialogue || !!u.minigame || !!u.modal || !!u.vocabCard || !!u.reward;
};

let toastId = 1;
export function toast(text: string, kind: Toast['kind'] = 'info', icon?: string) {
  const t: Toast = { id: toastId++, text, kind, icon };
  ui.set((s) => ({ toasts: [...s.toasts, t] }));
  window.setTimeout(() => ui.set((s) => ({ toasts: s.toasts.filter((x) => x.id !== t.id) })), kind === 'achievement' || kind === 'level' ? 4200 : 3000);
}

export function say(lines: DLine[], onDone?: () => void) {
  ui.set({ dialogue: { lines, index: 0, onDone } });
}

export const setFlag = (k: string, v = true) => game.set((s) => ({ flags: { ...s.flags, [k]: v } }));
export const flag = (k: string) => !!game.get().flags[k];

export function addItem(id: string) {
  if (game.get().items.includes(id)) return;
  game.set((s) => ({ items: [...s.items, id] }));
}

// ---------------------------------------------------------------- challenges & scoring
export interface ChallengeDef { id: string; mission: number; title: string; xp: number; replay: boolean }
export const CHALLENGES: ChallengeDef[] = [
  { id: 'm1-listen', mission: 1, title: 'Good Listener or Poor Listener?', xp: 120, replay: true },
  { id: 'm1-lines', mission: 1, title: 'Listen Between the Lines', xp: 100, replay: true },
  { id: 'm1-proverb', mission: 1, title: 'Communication Wisdom', xp: 100, replay: true },
  { id: 'm2-collect', mission: 2, title: 'Find the Missing Words', xp: 100, replay: false },
  { id: 'm2-match', mission: 2, title: 'Repair the Vocabulary Records', xp: 120, replay: true },
  { id: 'm2-sentences', mission: 2, title: 'Complete the Sentences', xp: 120, replay: true },
  { id: 'm3-order', mission: 3, title: 'Rebuild the Letter', xp: 120, replay: true },
  { id: 'm3-formal', mission: 3, title: 'Formal or Informal?', xp: 100, replay: true },
  { id: 'm3-detective', mission: 3, title: 'Reading Detective', xp: 120, replay: true },
  { id: 'm4-form', mission: 4, title: 'Complete the Application Form', xp: 100, replay: true },
  { id: 'm4-folder', mission: 4, title: 'Collect the Required Documents', xp: 100, replay: true },
  { id: 'm4-check', mission: 4, title: 'The Application Checklist', xp: 120, replay: true },
  { id: 'm5-build', mission: 5, title: 'Build the Letter', xp: 120, replay: true },
  { id: 'm5-choose', mission: 5, title: 'Choose the Best Sentences', xp: 100, replay: true },
  { id: 'm5-write', mission: 5, title: 'Write Your Own Application', xp: 150, replay: true },
  { id: 'm5-submit', mission: 5, title: 'Submit the Letter', xp: 100, replay: true },
];
export const challengeById = (id: string) => CHALLENGES.find((c) => c.id === id)!;

export const MISSIONS = [
  { n: 1, icon: '🏛️', title: 'The Communication Gate', place: 'University entrance & courtyard' },
  { n: 2, icon: '📚', title: 'The Lost Vocabulary Archive', place: 'University library' },
  { n: 3, icon: '🏥', title: "Dr Faisal's Missing Letter", place: 'Career centre' },
  { n: 4, icon: '📝', title: 'The Application Workshop', place: 'Admissions office' },
  { n: 5, icon: '✉️', title: 'The Final Letter Challenge', place: 'Writing hall' },
];

export const LEVELS = [
  { xp: 0, title: 'Beginner Applicant' },
  { xp: 400, title: 'Skilled Communicator' },
  { xp: 1000, title: 'Application Expert' },
  { xp: 1600, title: 'University Champion' },
];
export function levelOf(xp: number) {
  let i = 0;
  LEVELS.forEach((l, idx) => { if (xp >= l.xp) i = idx; });
  const next = LEVELS[i + 1];
  return { index: i, title: LEVELS[i].title, next, progress: next ? (xp - LEVELS[i].xp) / (next.xp - LEVELS[i].xp) : 1 };
}

export const totalStars = (s: GameState) => Object.values(s.best).reduce((a, b) => a + b.stars, 0);

export function beginRun() { ui.set({ run: { mistakes: 0, hints: 0 }, hint: null }); }
export function mistake() { ui.set((s) => ({ run: { ...s.run, mistakes: s.run.mistakes + 1 } })); sfx('wrong'); }
export function useHint(text: string) {
  ui.set((s) => ({ run: { ...s.run, hints: s.run.hints + 1 }, hint: text }));
  game.set((s) => ({ hintsTotal: s.hintsTotal + 1 }));
  sfx('hint');
}

export function scoreFor(id: string, mistakes: number, hints: number) {
  const def = challengeById(id);
  const xp = Math.max(Math.round(def.xp * 0.5), def.xp - mistakes * 10 - hints * 10);
  const stars = mistakes === 0 && hints === 0 ? 3 : mistakes + hints <= 2 ? 2 : 1;
  return { xp, stars };
}

function addXp(amount: number) {
  const before = levelOf(game.get().xp).index;
  game.set((s) => ({ xp: s.xp + amount }));
  const after = levelOf(game.get().xp);
  if (after.index > before) {
    window.setTimeout(() => { toast(`Level up! You are now a ${after.title}!`, 'level', '🆙'); sfx('fanfare'); }, 900);
  }
}

/** Records a completed challenge; returns the awarded score. */
export function completeChallenge(id: string) {
  const { mistakes, hints } = ui.get().run;
  const { xp, stars } = scoreFor(id, mistakes, hints);
  const prev = game.get().best[id];
  let gainedXp = xp;
  let coins = stars * 10;
  if (prev) {
    gainedXp = Math.max(0, xp - prev.xp);
    coins = Math.max(0, (stars - prev.stars) * 10);
  }
  const best = !prev || xp > prev.xp ? { xp, stars: Math.max(stars, prev?.stars ?? 0), mistakes, hints } : { ...prev, stars: Math.max(stars, prev.stars) };
  game.set((s) => {
    const teams = s.mode === 'team' && s.teams.length
      ? s.teams.map((t, i) => (i === s.activeTeam ? { ...t, xp: t.xp + xp, stars: t.stars + stars } : t))
      : s.teams;
    return { best: { ...s.best, [id]: best }, coins: s.coins + coins, teams };
  });
  if (gainedXp) addXp(gainedXp);
  toast(`+${gainedXp} XP  ${'⭐'.repeat(stars)}${coins ? `  +${coins} coins` : ''}`, 'xp', '✨');
  sfx('coin');
  checkAchievements();
  return { xp, stars, gainedXp, mistakes, hints, prev };
}

export function missionBonus(n: number) {
  addXp(50);
  game.set((s) => ({ coins: s.coins + 20 }));
  toast(`Mission ${n} complete! +50 XP bonus`, 'xp', '🏆');
  checkAchievements();
}

// ---------------------------------------------------------------- achievements
export const ACHIEVEMENTS: { id: string; icon: string; name: string; desc: string; test: (s: GameState) => boolean }[] = [
  { id: 'first-steps', icon: '👣', name: 'First Steps', desc: 'Accept the University Admission Challenge.', test: (s) => !!s.flags.intro },
  { id: 'listener', icon: '👂', name: 'Super Listener', desc: 'Sort all listeners with no mistakes.', test: (s) => s.best['m1-listen']?.mistakes === 0 },
  { id: 'gate', icon: '🏛️', name: 'Gate Opener', desc: 'Open the university gates.', test: (s) => !!s.flags.m1_done },
  { id: 'collector', icon: '💎', name: 'Word Collector', desc: 'Collect all seven vocabulary cards.', test: (s) => s.vocab.length >= 7 },
  { id: 'perfect-match', icon: '🔗', name: 'Perfect Match', desc: 'Repair all vocabulary records with no mistakes.', test: (s) => s.best['m2-match']?.mistakes === 0 },
  { id: 'detective', icon: '🔍', name: 'Reading Detective', desc: "Solve every question on Dr Faisal's evidence board.", test: (s) => !!s.best['m3-detective'] },
  { id: 'formal-writer', icon: '🖋️', name: 'Formal Writer', desc: 'Complete Mission 3.', test: (s) => !!s.flags.m3_done },
  { id: 'form-master', icon: '📋', name: 'Form Master', desc: 'Complete the application form.', test: (s) => !!s.best['m4-form'] },
  { id: 'wordsmith', icon: '📏', name: 'Wordsmith', desc: 'Write a letter of 170–200 words.', test: (s) => { const w = countWords(s.letter.paragraphs.join(' ')); return w >= 170 && w <= 200; } },
  { id: 'explorer', icon: '🗺️', name: 'Campus Explorer', desc: 'Visit every building on campus.', test: (s) => ['library', 'career', 'admissions', 'writing'].every((r) => s.visited.includes(r)) },
  { id: 'stars', icon: '🌟', name: 'Star Student', desc: 'Earn 30 stars.', test: (s) => totalStars(s) >= 30 },
  { id: 'champion', icon: '🏆', name: 'University Champion', desc: 'Reach the highest level.', test: (s) => s.xp >= 1600 },
  { id: 'graduate', icon: '🎓', name: 'Admitted!', desc: 'Receive your (imaginary) acceptance letter.', test: (s) => !!s.flags.final_done },
  { id: 'no-hints', icon: '🧠', name: 'Independent Thinker', desc: 'Finish the game without using any hints.', test: (s) => !!s.flags.final_done && s.hintsTotal === 0 },
];

export function checkAchievements() {
  const s = game.get();
  const fresh = ACHIEVEMENTS.filter((a) => !s.achievements.includes(a.id) && a.test(s));
  if (!fresh.length) return;
  game.set((st) => ({ achievements: [...st.achievements, ...fresh.map((a) => a.id)] }));
  fresh.forEach((a, i) => window.setTimeout(() => { toast(`Achievement: ${a.name}`, 'achievement', a.icon); sfx('achievement'); }, 600 + i * 1200));
}

export function countWords(t: string) {
  return (t.trim().match(/[A-Za-z0-9'’-]+/g) || []).length;
}

export const teamColors = ['#ff8f7a', '#8fb8ff', '#8fd19e', '#c9a7ff', '#ffd36e', '#7fd8d8'];
