import { useState } from 'react';
import { useStore, bus } from '../game/store';
import { game, ui, CHALLENGES, MISSIONS, ACHIEVEMENTS, totalStars, levelOf, setFlag, addItem, toast, defaultState, type GameState } from '../game/state';
import { objective, openGame, refreshWorld } from '../game/logic';
import { VOCAB, DOCS, LISTEN_SCENARIOS, COURSES } from '../game/content';
import { rooms } from '../phaser/maps';
import { Modal, VocabIcon } from './common';
import { LevelLadder } from './hud';
import { sfx } from '../game/audio';
import { toggleFullscreen } from './menus';

export const ITEMS: Record<string, { icon: string; name: string; desc: string; badge?: boolean }> = {
  'badge-communication': { icon: '🗣️', name: 'Communication Badge', desc: 'You listen carefully and understand hidden messages.', badge: true },
  'entrance-pass': { icon: '🎫', name: 'University Entrance Pass', desc: 'Opens the university gates.' },
  'badge-vocab': { icon: '📘', name: 'Vocabulary Master Badge', desc: 'You know all seven application words.', badge: true },
  'word-crystals': { icon: '💎', name: 'Seven Word Crystals', desc: 'attestation · cardiac · doctorate · enclose · extensive · in advance · reference' },
  'badge-formal': { icon: '🖋️', name: 'Formal Writing Badge', desc: 'You can organise a formal letter and use formal language.', badge: true },
  'faisal-reference': { icon: '✉️', name: "Dr Faisal's Reference Letter", desc: '"This student is careful, helpful and an excellent reader." – Dr Faisal' },
  'doc-form-filled': { icon: '📝', name: 'Completed Application Form', desc: 'Your personal details and chosen course.' },
  'application-folder': { icon: '📁', name: 'Application Folder', desc: 'Certificate, attestation, reference, form and personal statement.' },
  'eligibility-cert': { icon: '📃', name: 'Admission Eligibility Certificate', desc: 'You are eligible to apply to Pearl Bay University.' },
  'final-letter': { icon: '📨', name: 'Your Application Letter', desc: 'Your own formal application letter.' },
  'admission-cert': { icon: '🎓', name: 'University Admission Certificate', desc: 'Your (imaginary) acceptance to Pearl Bay University!', badge: true },
};

export function Backpack({ onClose }: { onClose: () => void }) {
  const g = useStore(game);
  const [tab, setTab] = useState<'items' | 'words' | 'docs'>('items');
  return (
    <Modal title="Backpack" icon="🎒" onClose={onClose} className="backpack">
      <div className="tabs">
        <button className={tab === 'items' ? 'on' : ''} onClick={() => setTab('items')}>🏅 Badges & items ({g.items.filter((i) => ITEMS[i]).length})</button>
        <button className={tab === 'words' ? 'on' : ''} onClick={() => setTab('words')}>💎 Word cards ({g.vocab.length}/7)</button>
        <button className={tab === 'docs' ? 'on' : ''} onClick={() => setTab('docs')}>📄 Documents ({g.docsFound.length})</button>
      </div>
      {tab === 'items' && (
        <div className="inv-grid">
          {g.items.filter((i) => ITEMS[i]).map((i) => <div key={i} className={`inv-item ${ITEMS[i].badge ? 'badge' : ''}`}><span className="inv-icon">{ITEMS[i].icon}</span><b>{ITEMS[i].name}</b><small>{ITEMS[i].desc}</small></div>)}
          {g.items.length === 0 && <p className="muted">Your backpack is empty. Complete missions to earn badges and items!</p>}
        </div>
      )}
      {tab === 'words' && (
        <div className="inv-grid words">
          {VOCAB.map((v) => g.vocab.includes(v.id) ? (
            <button key={v.id} className="inv-item word" onClick={() => { ui.set({ modal: null, vocabCard: v.id }); sfx('open'); }}><VocabIcon id={v.id} size={54} /><b>{v.word}</b><small>{v.pos}</small></button>
          ) : <div key={v.id} className="inv-item locked"><span className="inv-icon">❔</span><b>???</b><small>Find it in the library</small></div>)}
        </div>
      )}
      {tab === 'docs' && (
        <div className="inv-grid">
          {DOCS.filter((d) => g.docsFound.includes(d.id)).map((d) => <div key={d.id} className="inv-item"><span className="inv-icon">{d.icon}</span><b>{d.name}</b><small>{d.desc}</small></div>)}
          {g.form.firstName && <div className="inv-item"><span className="inv-icon">📝</span><b>My application form</b><small>{g.form.firstName} {g.form.surname} · {COURSES.find((c) => c.id === g.form.course)?.name} · {g.form.mode}</small></div>}
          {g.docsFound.length === 0 && !g.form.firstName && <p className="muted">No documents yet. You will collect them in Mission 4.</p>}
        </div>
      )}
    </Modal>
  );
}

export function Journal({ onClose }: { onClose: () => void }) {
  const g = useStore(game);
  const obj = objective(g);
  const missionDone = (n: number) => !!g.flags[`m${n}_done`];
  const unlocked = (n: number) => n === 1 || missionDone(n - 1);
  return (
    <Modal title="Quest Journal" icon="📖" onClose={onClose} className="journal">
      <div className="journal-top">
        <div className="current-obj"><small>Current objective</small><b>{obj.text}</b></div>
        <div className="j-stats"><span>⭐ {totalStars(g)} / {CHALLENGES.length * 3}</span><span>✨ {g.xp} XP</span><span>🪙 {g.coins}</span></div>
      </div>
      <LevelLadder xp={g.xp} />
      <div className="missions">
        {MISSIONS.map((m) => (
          <div key={m.n} className={`mission ${missionDone(m.n) ? 'done' : unlocked(m.n) ? 'active' : 'locked'}`}>
            <div className="m-head"><span className="m-icon">{unlocked(m.n) ? m.icon : '🔒'}</span><div><b>Mission {m.n}: {m.title}</b><small>{m.place}</small></div><span className="m-status">{missionDone(m.n) ? '✅ Complete' : unlocked(m.n) ? '▶ In progress' : 'Locked'}</span></div>
            {unlocked(m.n) && (
              <ul className="m-challenges">
                {CHALLENGES.filter((c) => c.mission === m.n).map((c) => {
                  const b = g.best[c.id];
                  return (
                    <li key={c.id} className={b ? 'done' : ''}>
                      <span>{b ? '✔' : '○'} {c.title}</span>
                      <span className="c-stars">{b ? '⭐'.repeat(b.stars) + '☆'.repeat(3 - b.stars) : ''}</span>
                      {b && c.replay && (c.id !== 'm1-listen' || true) && <button className="btn tiny" onClick={() => { ui.set({ modal: null }); openGame(c.id, true); }}>↻ Replay</button>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
      <h4>🏆 Achievements ({g.achievements.length}/{ACHIEVEMENTS.length})</h4>
      <div className="ach-grid">{ACHIEVEMENTS.map((a) => <div key={a.id} className={`ach ${g.achievements.includes(a.id) ? 'on' : ''}`} title={a.desc}><span>{g.achievements.includes(a.id) ? a.icon : '🔒'}</span><b>{a.name}</b><small>{a.desc}</small></div>)}</div>
    </Modal>
  );
}

export function Pause({ onClose }: { onClose: () => void }) {
  const g = useStore(game);
  return (
    <Modal title="Paused" icon="⏸" onClose={onClose} className="pause">
      <div className="pause-menu">
        <button className="menu-btn primary" onClick={onClose}>▶ Resume</button>
        <button className="menu-btn" onClick={() => ui.set({ modal: 'settings' })}>🔊 Sound & settings</button>
        <button className="menu-btn" onClick={() => ui.set({ modal: 'howto' })}>❓ How to play</button>
        <button className="menu-btn" onClick={toggleFullscreen}>⛶ Full screen</button>
        {g.mode === 'team' && <button className="menu-btn" onClick={() => ui.set({ modal: 'leaderboard' })}>🏆 Leaderboard</button>}
        <button className="menu-btn" onClick={() => ui.set({ modal: 'teacher' })}>🧑‍🏫 Teacher tools</button>
        <button className="menu-btn" onClick={() => { ui.set({ modal: null, screen: 'menu' }); bus.emit('attract', true); toast('Progress saved.', 'info', '💾'); }}>💾 Save & main menu</button>
      </div>
    </Modal>
  );
}

export function Leaderboard({ onClose }: { onClose: () => void }) {
  const g = useStore(game);
  const sorted = [...g.teams].sort((a, b) => b.xp - a.xp || b.stars - a.stars);
  return (
    <Modal title="Team Leaderboard" icon="🏆" onClose={onClose}>
      <div className="leaderboard">
        {sorted.map((t, i) => (
          <div key={t.name} className="lb-row" style={{ animationDelay: `${i * 0.12}s`, borderColor: t.color }}>
            <span className="lb-rank">{['🥇', '🥈', '🥉'][i] || i + 1}</span><b>{t.name}</b><span>{t.xp} XP</span><span>⭐ {t.stars}</span>
            <div className="lb-bar"><div style={{ width: `${(t.xp / Math.max(1, sorted[0].xp)) * 100}%`, background: t.color }} /></div>
          </div>
        ))}
        {g.teams.length === 0 && <p className="muted">Team Challenge is not active.</p>}
      </div>
    </Modal>
  );
}

// Mark missions before `n` as complete (no XP) so a class can jump to a mission.
export function jumpToMission(n: number) {
  const f: Record<string, boolean> = { intro: true };
  const s: Partial<GameState> = {};
  const base = game.get();
  if (n > 1) {
    Object.assign(f, { m1_talkGate: true, m1_listenStarted: true, m1_listen: true, m1_lines: true, m1_proverb: true, m1_done: true });
    s.listenDone = LISTEN_SCENARIOS.map((x) => x.id);
  }
  if (n > 2) { Object.assign(f, { m2_started: true, m2_collect: true, m2_match: true, m2_sent: true, m2_done: true }); s.vocab = VOCAB.map((v) => v.id); }
  if (n > 3) Object.assign(f, { m3_started: true, m3_order: true, m3_formal: true, m3_detective: true, m3_done: true });
  if (n > 4) {
    Object.assign(f, { m4_started: true, m4_form: true, m4_docs: true, m4_folder: true, m4_check: true, m4_done: true });
    s.docsFound = DOCS.filter((d) => d.correct).map((d) => d.id);
    if (!base.form.firstName) s.form = { ...defaultState().form, firstName: base.playerName.split(' ')[0] || 'Student', surname: 'Al-Ali', email: 'student@mail.kw', phone: '55512345', course: 'computer-science', mode: 'full-time', qualification: 'Secondary School Certificate (Grade 12, expected)', school: 'Al-Noor Secondary School', subjects: 'Mathematics, English', declaration: true };
  }
  game.set((st) => ({ ...s, flags: { ...st.flags, ...f } }));
  const items = ['badge-communication', 'entrance-pass', 'badge-vocab', 'word-crystals', 'badge-formal', 'faisal-reference', 'doc-form-filled', 'application-folder', 'eligibility-cert'];
  items.slice(0, [0, 0, 2, 4, 6, 9][n]).forEach(addItem);
  if (n > 4 && !game.get().letter.course) game.set((st) => ({ letter: { ...st.letter, course: 'Computer Science' } }));
  const target = ['campus', 'campus', 'library', 'career', 'admissions', 'writing'][n];
  const spawn: [number, number] = n === 1 ? rooms().campus.spawn : rooms()[target].spawn;
  bus.emit('goto', { room: target, spawn });
  window.setTimeout(refreshWorld, 600);
}

export function TeacherTools({ onClose }: { onClose: () => void }) {
  const g = useStore(game);
  const [confirm, setConfirm] = useState(false);
  return (
    <Modal title="Teacher tools" icon="🧑‍🏫" onClose={onClose}>
      <div className="teacher">
        <h4>Jump to a mission</h4>
        <p className="muted small">Marks earlier missions as complete (without XP) and moves the player to the mission location. Useful for lessons focused on one skill.</p>
        <div className="row wrap">{MISSIONS.map((m) => <button key={m.n} className="btn" onClick={() => { jumpToMission(m.n); onClose(); sfx('unlock'); }}>{m.icon} Mission {m.n}</button>)}</div>
        {g.mode === 'team' && (
          <>
            <h4>Team settings</h4>
            <div className="row wrap">
              <label className="check"><input type="checkbox" checked={g.timer.enabled} onChange={(e) => game.set({ timer: { ...g.timer, enabled: e.target.checked } })} /> Timer</label>
              <select value={g.timer.seconds} onChange={(e) => game.set({ timer: { ...g.timer, seconds: Number(e.target.value) } })}>{[60, 120, 180, 240, 300].map((s) => <option key={s} value={s}>{s / 60} min</option>)}</select>
              <span>Active team:</span>
              <select value={g.activeTeam} onChange={(e) => game.set({ activeTeam: Number(e.target.value) })}>{g.teams.map((t, i) => <option key={i} value={i}>{t.name}</option>)}</select>
              <button className="btn" onClick={() => ui.set({ modal: 'leaderboard' })}>🏆 Leaderboard</button>
            </div>
          </>
        )}
        <h4>Progress</h4>
        <p className="small">Level: {levelOf(g.xp).title} · XP {g.xp} · Hints used: {g.hintsTotal}</p>
        {!confirm ? <button className="btn danger" onClick={() => setConfirm(true)}>🗑 Reset all progress</button> : (
          <div className="row"><span>Are you sure? This cannot be undone.</span><button className="btn" onClick={() => setConfirm(false)}>Cancel</button>
            <button className="btn danger" onClick={() => { try { localStorage.clear(); } catch { /* ignore */ } location.reload(); }}>Yes, reset</button></div>
        )}
      </div>
    </Modal>
  );
}

export { setFlag };
