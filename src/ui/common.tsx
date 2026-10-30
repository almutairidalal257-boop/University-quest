import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LOOKS } from '../game/looks';
import { portraitURL, avatarURL } from '../game/art';
import {
  game, ui, settings, challengeById, mistake as recordMistake, useHint, completeChallenge, scoreFor, type Expr,
} from '../game/state';
import { useStore } from '../game/store';
import { finishGame } from '../game/logic';
import { sfx } from '../game/audio';
import { ARABIC_HINTS } from '../game/content';

export function Portrait({ look, expr = 'normal', size = 120, className = '' }: { look?: string; expr?: Expr; size?: number; className?: string }) {
  const l = look ? LOOKS[look] : undefined;
  if (!l) return <div className={`portrait narrator ${className}`} style={{ width: size, height: size }}>📜</div>;
  return <img className={`portrait ${className}`} src={portraitURL(l, expr)} width={size} height={size} alt="" draggable={false} />;
}

export function AvatarImg({ look, scale = 4, className = '' }: { look: string; scale?: number; className?: string }) {
  const src = useMemo(() => avatarURL(LOOKS[look], scale), [look, scale]);
  return <img className={`avatar-img ${className}`} src={src} alt="" draggable={false} />;
}

export function shuffle<T>(arr: T[], seed = Math.random()): T[] {
  const a = [...arr];
  let s = Math.floor(seed * 1e9) || 1;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Shows an Arabic hint next to an English key term when Arabic hints are on. */
export function Ar({ term, children }: { term: string; children?: React.ReactNode }) {
  const st = useStore(settings);
  const ar = ARABIC_HINTS[term.toLowerCase()];
  return <>{children ?? term}{st.arabic && ar ? <span className="ar" lang="ar"> ({ar})</span> : null}</>;
}

// ------------------------------------------------------------------ drag & drop (mouse + touch + tap-to-place)
export interface Dnd {
  source: (id: string, disabled?: boolean) => { onPointerDown: (e: React.PointerEvent) => void; 'data-selected'?: boolean; className: string };
  target: (zone: string) => { 'data-drop': string; onClick: () => void; 'data-armed': boolean };
  selected: string | null;
  ghost: React.ReactNode;
  clear: () => void;
}

export function useDnd(onDrop: (id: string, zone: string) => void, renderGhost: (id: string) => React.ReactNode): Dnd {
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const start = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null);
  const dropRef = useRef(onDrop);
  dropRef.current = onDrop;

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const s = start.current;
      if (!s) return;
      if (!s.moved && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 6) s.moved = true;
      if (s.moved) setDrag({ id: s.id, x: e.clientX, y: e.clientY });
    };
    const up = (e: PointerEvent) => {
      const s = start.current;
      start.current = null;
      if (!s) return;
      if (s.moved) {
        setDrag(null);
        const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-drop]') as HTMLElement | null;
        if (el) { dropRef.current(s.id, el.dataset.drop!); setSelected(null); }
      } else {
        setSelected((cur) => (cur === s.id ? null : s.id));
        sfx('select');
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, []);

  const source = useCallback((id: string, disabled = false) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (disabled || e.button > 0) return;
      e.preventDefault();
      start.current = { id, x: e.clientX, y: e.clientY, moved: false };
    },
    'data-selected': selected === id,
    className: `dnd-src${selected === id ? ' selected' : ''}${drag?.id === id ? ' dragging' : ''}${disabled ? ' disabled' : ''}`,
  }), [selected, drag]);

  const target = useCallback((zone: string) => ({
    'data-drop': zone,
    'data-armed': !!(selected || drag),
    onClick: () => { if (selected) { dropRef.current(selected, zone); setSelected(null); } },
  }), [selected, drag]);

  const ghost = drag ? <div className="dnd-ghost" style={{ left: drag.x, top: drag.y }}>{renderGhost(drag.id)}</div> : null;
  return { source, target, selected, ghost, clear: () => setSelected(null) };
}

// ------------------------------------------------------------------ minigame shell
interface RunApi { mistake: () => void; finish: () => void; feedback: (text: string, ok: boolean) => void }
const RunCtx = createContext<RunApi>({ mistake: () => {}, finish: () => {}, feedback: () => {} });
export const useRun = () => useContext(RunCtx);

export function Shell({ id, icon, title, instructions, intro, hints, children, wide }: {
  id: string; icon: string; title: string; instructions: React.ReactNode; intro?: React.ReactNode; hints: string[]; children: React.ReactNode; wide?: boolean;
}) {
  const u = useStore(ui);
  const g = useStore(game);
  const replay = !!u.minigame?.replay;
  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>(intro ? 'intro' : 'play');
  const [result, setResult] = useState<ReturnType<typeof completeChallenge> | null>(null);
  const [hintIdx, setHintIdx] = useState(0);
  const [fb, setFb] = useState<{ text: string; ok: boolean; k: number } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [time, setTime] = useState(g.timer.seconds);
  const timerOn = g.mode === 'team' && g.timer.enabled && phase === 'play';
  const fbTimer = useRef<number>();
  const finished = useRef(false);

  useEffect(() => {
    if (!timerOn) return;
    const t = window.setInterval(() => setTime((v) => {
      if (v === 1) sfx('alarm');
      else if (v <= 10 && v > 1) sfx('tick');
      return Math.max(0, v - 1);
    }), 1000);
    return () => window.clearInterval(t);
  }, [timerOn]);

  const api = useMemo<RunApi>(() => ({
    mistake: () => recordMistake(),
    feedback: (text, ok) => {
      window.clearTimeout(fbTimer.current);
      setFb({ text, ok, k: Date.now() });
      if (ok) sfx('correct');
      fbTimer.current = window.setTimeout(() => setFb(null), ok ? 2600 : 4200);
    },
    finish: () => {
      if (finished.current) return;
      finished.current = true;
      window.setTimeout(() => {
        const r = completeChallenge(id);
        setResult(r);
        setPhase('done');
        sfx('fanfare');
      }, 700);
    },
  }), [id]);

  const askHint = () => {
    const h = hints[Math.min(hintIdx, hints.length - 1)];
    useHint(h);
    setHintIdx((i) => i + 1);
  };

  const preview = scoreFor(id, u.run.mistakes, u.run.hints);

  return (
    <div className="mg-backdrop">
      <div className={`mg-panel pop-in ${wide ? 'wide' : ''}`}>
        <header className="mg-head">
          <div className="mg-title"><span className="mg-icon">{icon}</span><div><small>Mission {challengeById(id).mission}{replay ? ' · Replay' : ''}</small><h2>{title}</h2></div></div>
          <div className="mg-tools">
            {timerOn && <div className={`timer ${time <= 10 ? 'low' : ''}`}>⏱ {Math.floor(time / 60)}:{String(time % 60).padStart(2, '0')}{time === 0 && ' Time!'}</div>}
            {g.mode === 'team' && g.teams[g.activeTeam] && <div className="team-chip" style={{ background: g.teams[g.activeTeam].color }}>👥 {g.teams[g.activeTeam].name}</div>}
            {phase === 'play' && <div className="stars-preview" title="Stars you can still earn">{'⭐'.repeat(preview.stars)}{'☆'.repeat(3 - preview.stars)}</div>}
            {phase === 'play' && <button className="btn hint" onClick={askHint}>💡 Hint</button>}
            <button className="btn icon" aria-label="Close" onClick={() => { ui.set({ minigame: null, hint: null }); sfx('select'); }}>✕</button>
          </div>
        </header>
        {phase === 'intro' && (
          <div className="mg-body intro-body">
            <div className="instructions big">{instructions}</div>
            <div className="worked">{intro}</div>
            <button className="btn primary big" onClick={() => { setPhase('play'); sfx('select'); }}>I'm ready! ▶</button>
          </div>
        )}
        {phase === 'play' && (
          <RunCtx.Provider value={api}>
            <div className="instructions">{instructions}</div>
            {u.hint && <div className="hint-box slide-in">💡 {u.hint}</div>}
            <div className="mg-body" key={attempt}>{children}</div>
            {fb && <div key={fb.k} className={`feedback ${fb.ok ? 'ok' : 'bad'}`}>{fb.ok ? '✅' : '🤔'} {fb.text}</div>}
          </RunCtx.Provider>
        )}
        {phase === 'done' && result && (
          <div className="mg-body result">
            <div className="result-stars">{[0, 1, 2].map((i) => <span key={i} className={i < result.stars ? 'on' : ''} style={{ animationDelay: `${i * 0.25}s` }}>★</span>)}</div>
            <h3>{result.stars === 3 ? 'Perfect!' : result.stars === 2 ? 'Great job!' : 'Well done – you finished!'}</h3>
            <p className="result-line">+{result.gainedXp} XP {result.prev && result.gainedXp === 0 ? '(no improvement this time – your best score is kept)' : ''}</p>
            <p className="result-line small">Mistakes: {result.mistakes} · Hints used: {result.hints}</p>
            <div className="row center">
              {result.stars < 3 && <button className="btn" onClick={() => { ui.set({ run: { mistakes: 0, hints: 0 }, hint: null }); setHintIdx(0); finished.current = false; setAttempt((a) => a + 1); setPhase('play'); }}>↻ Try again for more stars</button>}
              <button className="btn primary big" onClick={() => finishGame(id, replay)}>Continue ▶</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Modal({ title, icon, onClose, children, className = '' }: { title: string; icon?: string; onClose: () => void; children: React.ReactNode; className?: string }) {
  return (
    <div className="modal-backdrop" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal pop-in ${className}`}>
        <header className="modal-head"><h2>{icon} {title}</h2><button className="btn icon" aria-label="Close" onClick={onClose}>✕</button></header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ vocabulary illustrations (SVG)
export function VocabIcon({ id, size = 96 }: { id: string; size?: number }) {
  const s = { width: size, height: size };
  switch (id) {
    case 'cardiac':
      return <svg viewBox="0 0 100 100" style={s}><path d="M50 85 C10 60 8 30 28 22 C40 17 48 26 50 32 C52 26 60 17 72 22 C92 30 90 60 50 85Z" fill="#ff6b7d" stroke="#3d3354" strokeWidth="4" /><polyline points="14,55 34,55 40,42 48,68 56,35 62,55 86,55" fill="none" stroke="#fff" strokeWidth="5" strokeLinejoin="round" /></svg>;
    case 'doctorate':
      return <svg viewBox="0 0 100 100" style={s}><rect x="14" y="40" width="72" height="48" rx="6" fill="#fff6e6" stroke="#3d3354" strokeWidth="4" /><line x1="24" y1="55" x2="70" y2="55" stroke="#c9b8f0" strokeWidth="4" /><line x1="24" y1="66" x2="60" y2="66" stroke="#c9b8f0" strokeWidth="4" /><circle cx="72" cy="76" r="8" fill="#ff6b7d" stroke="#3d3354" strokeWidth="3" /><polygon points="50,8 88,22 50,36 12,22" fill="#2f2a4a" /><line x1="80" y1="25" x2="80" y2="40" stroke="#ffd36e" strokeWidth="4" /></svg>;
    case 'enclose':
      return <svg viewBox="0 0 100 100" style={s}><rect x="28" y="14" width="44" height="40" fill="#fff" stroke="#3d3354" strokeWidth="4" /><line x1="36" y1="26" x2="64" y2="26" stroke="#c9b8f0" strokeWidth="4" /><line x1="36" y1="36" x2="58" y2="36" stroke="#c9b8f0" strokeWidth="4" /><rect x="12" y="44" width="76" height="44" rx="4" fill="#ffe2b8" stroke="#3d3354" strokeWidth="4" /><polyline points="12,46 50,70 88,46" fill="none" stroke="#3d3354" strokeWidth="4" /><path d="M50 22 L50 40 M42 32 L50 40 L58 32" stroke="#ff6b7d" strokeWidth="5" fill="none" /></svg>;
    case 'extensive':
      return <svg viewBox="0 0 100 100" style={s}>{['#ff9a85', '#8fb8ff', '#ffd36e', '#a8d5a2', '#c9a7ff', '#ff9a85'].map((c, i) => <rect key={i} x={18 + (i % 2) * 6} y={78 - i * 12} width={60} height={11} rx={3} fill={c} stroke="#3d3354" strokeWidth="3" />)}<text x="84" y="22" fontSize="22">✨</text></svg>;
    case 'in-advance':
      return <svg viewBox="0 0 100 100" style={s}><rect x="14" y="18" width="72" height="70" rx="8" fill="#fff" stroke="#3d3354" strokeWidth="4" /><rect x="14" y="18" width="72" height="18" rx="8" fill="#ff6b7d" stroke="#3d3354" strokeWidth="4" /><line x1="32" y1="10" x2="32" y2="26" stroke="#3d3354" strokeWidth="5" /><line x1="68" y1="10" x2="68" y2="26" stroke="#3d3354" strokeWidth="5" /><polyline points="34,62 46,74 68,48" fill="none" stroke="#3daa6a" strokeWidth="7" strokeLinecap="round" /></svg>;
    case 'attestation':
      return <svg viewBox="0 0 100 100" style={s}><rect x="18" y="10" width="64" height="80" rx="4" fill="#fff" stroke="#3d3354" strokeWidth="4" /><line x1="28" y1="24" x2="72" y2="24" stroke="#c9b8f0" strokeWidth="4" /><line x1="28" y1="36" x2="72" y2="36" stroke="#c9b8f0" strokeWidth="4" /><line x1="28" y1="48" x2="60" y2="48" stroke="#c9b8f0" strokeWidth="4" /><circle cx="64" cy="70" r="13" fill="none" stroke="#6a5ad8" strokeWidth="4" /><text x="57" y="76" fontSize="15" fill="#6a5ad8">✔</text><path d="M26 72 q6 -8 12 0 t12 0" stroke="#3d3354" strokeWidth="3" fill="none" /></svg>;
    case 'reference':
      return <svg viewBox="0 0 100 100" style={s}><rect x="10" y="20" width="56" height="70" rx="4" fill="#fff6e6" stroke="#3d3354" strokeWidth="4" /><line x1="18" y1="34" x2="58" y2="34" stroke="#c9b8f0" strokeWidth="4" /><line x1="18" y1="46" x2="58" y2="46" stroke="#c9b8f0" strokeWidth="4" /><line x1="18" y1="58" x2="48" y2="58" stroke="#c9b8f0" strokeWidth="4" /><path d="M18 76 q6 -8 12 0 t12 0" stroke="#3d3354" strokeWidth="3" fill="none" /><circle cx="76" cy="34" r="12" fill="#ffd9a8" stroke="#3d3354" strokeWidth="4" /><path d="M58 76 q18 -26 36 0" fill="#8fb8ff" stroke="#3d3354" strokeWidth="4" /><text x="70" y="96" fontSize="16">👍</text></svg>;
    default:
      return <span style={{ fontSize: size * 0.7 }}>📄</span>;
  }
}

export function Choice({ text, state, onClick, letter }: { text: React.ReactNode; state?: 'right' | 'wrong' | 'dim' | ''; onClick: () => void; letter?: string }) {
  return (
    <button className={`choice ${state || ''}`} onClick={onClick} disabled={state === 'dim' || state === 'right'}>
      {letter && <span className="choice-letter">{letter}</span>}<span>{text}</span>
    </button>
  );
}
