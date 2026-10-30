import { useEffect, useRef, useState } from 'react';
import { useStore, bus, touchInput } from '../game/store';
import { game, ui, settings, levelOf, totalStars, MISSIONS, LEVELS, toast } from '../game/state';
import { objective, closeReward } from '../game/logic';
import { vocabById } from '../game/content';
import { ROOM_NAMES } from '../phaser/maps';
import { Portrait, VocabIcon } from './common';
import { sfx, speak } from '../game/audio';

export function HUD() {
  const g = useStore(game);
  const u = useStore(ui);
  const lv = levelOf(g.xp);
  const obj = objective(g);
  const mission = MISSIONS[Math.min(obj.mission, 5) - 1];
  const [pulse, setPulse] = useState(false);
  const prevXp = useRef(g.xp);
  useEffect(() => { if (g.xp !== prevXp.current) { setPulse(true); prevXp.current = g.xp; const t = window.setTimeout(() => setPulse(false), 900); return () => window.clearTimeout(t); } }, [g.xp]);

  const hint = () => {
    sfx('hint');
    toast(`Next step: ${obj.text} Follow the yellow arrow ⬇️`, 'info', '💡');
  };
  useEffect(() => bus.on('hud-hint', hint));
  const team = g.mode === 'team' ? g.teams[g.activeTeam] : null;
  return (
    <div className="hud">
      <div className="hud-left">
        <div className="player-card">
          <Portrait look={g.avatar} size={64} expr="happy" />
          <div className="pc-info">
            <b className="pc-name">{g.playerName}</b>
            <span className="pc-level">Lv {lv.index + 1} · {lv.title}</span>
            <div className={`xp-bar ${pulse ? 'pulse' : ''}`}><div style={{ width: `${lv.progress * 100}%` }} /><span>{g.xp} XP{lv.next ? ` / ${lv.next.xp}` : ''}</span></div>
          </div>
        </div>
        <div className="loc-chip">📍 {ROOM_NAMES[g.room] || 'Campus'}</div>
      </div>
      <div className="hud-center">
        <div className="quest-banner">
          <span className="qb-icon">{obj.mission <= 5 ? mission.icon : '🎓'}</span>
          <div><small>{obj.mission <= 5 ? `Mission ${obj.mission}: ${mission.title}` : 'Final Scene'}</small><span>{obj.text}</span></div>
        </div>
      </div>
      <div className="hud-right">
        <div className="counters"><span title="Stars">⭐ {totalStars(g)}</span><span title="Coins">🪙 {g.coins}</span></div>
        <div className="hud-buttons">
          <button className="hud-btn" onClick={() => { ui.set({ modal: 'backpack' }); sfx('open'); }} title="Backpack (B)">🎒<small>Backpack</small></button>
          <button className="hud-btn" onClick={() => { ui.set({ modal: 'journal' }); sfx('open'); }} title="Quest journal (J)">📖<small>Journal</small></button>
          <button className="hud-btn" onClick={hint} title="Hint (H)">💡<small>Hint</small></button>
          <button className="hud-btn" onClick={() => { ui.set({ modal: 'pause' }); sfx('open'); }} title="Pause (Esc)">⏸<small>Pause</small></button>
        </div>
        {team && (
          <div className="team-panel">
            {g.teams.map((t, i) => <div key={i} className={`tp-row ${i === g.activeTeam ? 'active' : ''}`} style={{ borderColor: t.color }}><span className="dot" style={{ background: t.color }} />{t.name}<b>{t.xp} XP · ⭐{t.stars}</b></div>)}
            <button className="btn small" onClick={() => { game.set((s) => ({ activeTeam: (s.activeTeam + 1) % s.teams.length })); sfx('select'); toast(`Now playing: ${g.teams[(g.activeTeam + 1) % g.teams.length].name}`, 'info', '👥'); }}>Next team ▶</button>
          </div>
        )}
      </div>
      {u.activeScenario && <div className="decide-banner pop-in">👣 Walk onto the <b className="g">GOOD LISTENER</b> pad or the <b className="p">POOR LISTENER</b> pad!</div>}
    </div>
  );
}

export function LevelLadder({ xp }: { xp: number }) {
  return <div className="ladder">{LEVELS.map((l, i) => <div key={l.title} className={`rung ${xp >= l.xp ? 'on' : ''}`}><span>{i + 1}</span>{l.title}<small>{l.xp} XP</small></div>)}</div>;
}

export function Dialogue() {
  const u = useStore(ui);
  const d = u.dialogue;
  const [chars, setChars] = useState(0);
  const line = d ? d.lines[d.index] : null;
  useEffect(() => { setChars(0); }, [d?.index, d?.lines]);
  useEffect(() => {
    if (!line) return;
    if (chars >= line.text.length) return;
    const t = window.setTimeout(() => { setChars((c) => Math.min(line.text.length, c + 2)); if (chars % 6 === 0) sfx('blip'); }, 22);
    return () => window.clearTimeout(t);
  }, [chars, line]);

  const advance = () => {
    if (!d || !line) return;
    if (chars < line.text.length) { setChars(line.text.length); return; }
    if (line.choices) return;
    if (d.index + 1 < d.lines.length) ui.set({ dialogue: { ...d, index: d.index + 1 } });
    else { ui.set({ dialogue: null }); d.onDone?.(); }
  };
  useEffect(() => {
    if (!d) return;
    const k = (e: KeyboardEvent) => { if (['Space', 'Enter', 'KeyE'].includes(e.code)) { e.preventDefault(); advance(); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });
  if (!d || !line) return null;
  const isPlayer = line.look === game.get().avatar && line.speaker === game.get().playerName;
  return (
    <div className="dialogue-wrap" onClick={advance}>
      <div className={`dialogue slide-up ${isPlayer ? 'player' : ''}`} key={d.index}>
        <div className="dl-portrait"><Portrait look={line.look} expr={line.expr} size={128} className="talking" /></div>
        <div className="dl-body">
          <div className="dl-name">{line.speaker}</div>
          <p className="dl-text">{line.text.slice(0, chars)}<span className="caret" /></p>
          {line.choices && chars >= line.text.length && (
            <div className="dl-choices">{line.choices.map((c, i) => <button key={i} className="btn" onClick={(e) => { e.stopPropagation(); ui.set({ dialogue: null }); c.action?.(); }}>{c.text}</button>)}</div>
          )}
          <div className="dl-next">{chars >= line.text.length && !line.choices ? '▼ Click / E / Space' : ''} <button className="btn tiny" onClick={(e) => { e.stopPropagation(); speak(line.text); }} title="Read aloud">🔊</button></div>
        </div>
      </div>
    </div>
  );
}

export function Toasts() {
  const u = useStore(ui);
  return <div className="toasts">{u.toasts.map((t) => <div key={t.id} className={`toast ${t.kind}`}><span className="t-icon">{t.icon}</span>{t.text}</div>)}</div>;
}

export function LocationBanner() {
  const [room, setRoom] = useState<string | null>(null);
  useEffect(() => bus.on('room-entered', (r: string) => { setRoom(r); window.setTimeout(() => setRoom(null), 2200); }), []);
  if (!room || ui.get().screen !== 'play') return null;
  return <div className="location-banner" key={room}><small>Pearl Bay University</small>{ROOM_NAMES[room]}</div>;
}

export function RewardPopup() {
  const u = useStore(ui);
  const r = u.reward;
  if (!r) return null;
  return (
    <div className="modal-backdrop reward-bg">
      <div className="confetti">{Array.from({ length: 40 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 10) * 0.12}s`, background: ['#ff9a85', '#ffd36e', '#a8d5a2', '#c9a7ff', '#8fb8ff'][i % 5] }} />)}</div>
      <div className="reward pop-in">
        <div className="rays" />
        <h2>{r.title}</h2>
        <div className="reward-items">{r.items.map((it, i) => <div key={it.name} className="reward-item" style={{ animationDelay: `${0.3 + i * 0.25}s` }}><span>{it.icon}</span>{it.name}</div>)}</div>
        {r.text && <p>{r.text}</p>}
        <button className="btn primary big" onClick={() => { sfx('select'); closeReward(); }}>Collect! ✨</button>
      </div>
    </div>
  );
}

export function VocabCardModal() {
  const u = useStore(ui);
  const st = useStore(settings);
  const [flipped, setFlipped] = useState(false);
  const [showAr, setShowAr] = useState(false);
  useEffect(() => { setFlipped(false); setShowAr(false); if (u.vocabCard) { const t = window.setTimeout(() => setFlipped(true), 350); return () => window.clearTimeout(t); } }, [u.vocabCard]);
  if (!u.vocabCard) return null;
  const v = vocabById(u.vocabCard);
  const n = game.get().vocab.length;
  return (
    <div className="modal-backdrop">
      <div className={`vocab-card ${flipped ? 'flipped' : ''}`}>
        <div className="vc-inner">
          <div className="vc-front">💎</div>
          <div className="vc-back">
            <small className="vc-count">Word card {Math.max(1, game.get().vocab.indexOf(v.id) + 1)} / 7</small>
            <VocabIcon id={v.id} size={110} />
            <h2>{v.word} <span className="pos">({v.pos})</span></h2>
            <p className="meaning">{v.meaning}</p>
            <p className="example">“{v.example}”</p>
            {(st.arabic || showAr) ? <p className="arabic" lang="ar">{v.arabic}</p> : <button className="btn tiny" onClick={() => setShowAr(true)}>عربي – Show Arabic hint</button>}
            <div className="row center">
              <button className="btn" onClick={() => speak(`${v.word}. ${v.example}`)}>🔊 Listen</button>
              <button className="btn primary" onClick={() => { ui.set({ vocabCard: null }); sfx('select'); if (n >= 7 && !game.get().flags.m2_match) toast('All 7 words found! Return to Mrs Amal.', 'info', '📚'); }}>Got it! ✔</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TouchControls() {
  const st = useStore(settings);
  const [coarse] = useState(() => typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window));
  if (!coarse && !st.showTouch) return null;
  const bind = (k: 'up' | 'down' | 'left' | 'right') => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); touchInput[k] = true; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); },
    onPointerUp: () => { touchInput[k] = false; },
    onPointerCancel: () => { touchInput[k] = false; },
    onPointerLeave: () => { touchInput[k] = false; },
  });
  return (
    <div className="touch-controls">
      <div className="dpad">
        <button className="up" {...bind('up')}>▲</button>
        <button className="left" {...bind('left')}>◀</button>
        <button className="right" {...bind('right')}>▶</button>
        <button className="down" {...bind('down')}>▼</button>
      </div>
      <button className="action-btn" onPointerDown={(e) => { e.preventDefault(); touchInput.action = true; }}>E<small>Talk</small></button>
    </div>
  );
}
