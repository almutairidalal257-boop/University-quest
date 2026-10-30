import { useState } from 'react';
import { useStore, bus } from '../game/store';
import { game, ui, settings, defaultState, hasSave, loadSave, setFlag, checkAchievements, teamColors, clearSave, toast } from '../game/state';
import { rooms } from '../phaser/maps';
import { AVATARS, LOOKS } from '../game/looks';
import { AvatarImg, Modal, Portrait } from './common';
import { sfx, unlockAudio, setVolumes } from '../game/audio';
import { refreshWorld } from '../game/logic';
import { UNIVERSITY } from '../game/content';

export function enterWorld() {
  const s = game.get();
  ui.set({ screen: 'play', modal: null });
  bus.emit('attract', false);
  const spawn: [number, number] = s.pos ? [s.pos.x, s.pos.y] : rooms()[s.room || 'campus'].spawn;
  bus.emit('goto', { room: s.room || 'campus', spawn });
  window.setTimeout(refreshWorld, 500);
}

export function MainMenu() {
  const [confirmNew, setConfirmNew] = useState<null | 'solo' | 'team'>(null);
  const saved = hasSave();
  const start = (mode: 'solo' | 'team') => {
    unlockAudio();
    sfx('select');
    if (saved && !confirmNew) { setConfirmNew(mode); return; }
    clearSave();
    game.replace({ ...defaultState(), mode, startedAt: Date.now() });
    ui.set({ screen: mode === 'team' ? 'teamsetup' : 'create' });
  };
  const cont = () => {
    unlockAudio();
    const s = loadSave();
    if (!s) return;
    game.replace(s);
    sfx('select');
    enterWorld();
  };
  return (
    <div className="menu-screen">
      <div className="menu-sky" />
      <div className="title-block">
        <div className="title-small">THE UNIVERSITY QUEST</div>
        <h1 className="title-main">MISSION<br />ADMISSION <span className="cap">🎓</span></h1>
        <p className="title-sub">A story-driven English adventure at {UNIVERSITY}</p>
      </div>
      <div className="menu-buttons">
        <button className="menu-btn primary" onClick={() => start('solo')}>▶ Start Adventure</button>
        <button className="menu-btn" disabled={!saved} onClick={cont}>⏯ Continue Game</button>
        <button className="menu-btn" onClick={() => start('team')}>👥 Team Challenge</button>
        <button className="menu-btn" onClick={() => { unlockAudio(); ui.set({ modal: 'howto' }); }}>❓ How to Play</button>
        <button className="menu-btn" onClick={() => { unlockAudio(); ui.set({ modal: 'settings' }); }}>🔊 Sound Settings</button>
      </div>
      <p className="menu-foot">Grade 11 EFL · Unit: Communication & Formal Letters · Imaginary university · Progress saves automatically</p>
      {confirmNew && (
        <Modal title="Start a new game?" icon="⚠️" onClose={() => setConfirmNew(null)}>
          <p>You already have a saved game. Starting a new game will delete it.</p>
          <div className="row center">
            <button className="btn" onClick={() => setConfirmNew(null)}>Cancel</button>
            <button className="btn primary" onClick={() => { clearSave(); const m = confirmNew; setConfirmNew(null); game.replace({ ...defaultState(), mode: m, startedAt: Date.now() }); ui.set({ screen: m === 'team' ? 'teamsetup' : 'create' }); }}>Yes, start new</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function TeamSetup() {
  const g = useStore(game);
  const [names, setNames] = useState<string[]>(['Team Falcon', 'Team Pearl']);
  const [timer, setTimer] = useState(true);
  const [secs, setSecs] = useState(180);
  const ok = names.every((n) => n.trim());
  return (
    <div className="setup-screen">
      <div className="setup-card pop-in">
        <h2>👥 Team Challenge – Teacher setup</h2>
        <p>Enter team names. Teams take turns. The active team earns the XP and stars for each challenge.</p>
        <div className="team-list">
          {names.map((n, i) => (
            <div key={i} className="team-input">
              <span className="dot" style={{ background: teamColors[i] }} />
              <input value={n} maxLength={20} onChange={(e) => setNames(names.map((x, j) => (j === i ? e.target.value : x)))} />
              {names.length > 2 && <button className="btn icon" onClick={() => setNames(names.filter((_, j) => j !== i))}>✕</button>}
            </div>
          ))}
          {names.length < 6 && <button className="btn small" onClick={() => setNames([...names, `Team ${names.length + 1}`])}>➕ Add team</button>}
        </div>
        <div className="row">
          <label className="check"><input type="checkbox" checked={timer} onChange={(e) => setTimer(e.target.checked)} /> Classroom timer for each challenge</label>
          {timer && <select value={secs} onChange={(e) => setSecs(Number(e.target.value))}>{[60, 120, 180, 240, 300].map((s) => <option key={s} value={s}>{s / 60} min</option>)}</select>}
        </div>
        <p className="muted small">The timer never blocks the game. When time is up, the teacher can pass the turn to the next team.</p>
        <div className="row center">
          <button className="btn" onClick={() => ui.set({ screen: 'menu' })}>◀ Back</button>
          <button className="btn primary big" disabled={!ok} onClick={() => {
            game.set({ teams: names.map((n, i) => ({ name: n.trim(), xp: 0, stars: 0, color: teamColors[i] })), activeTeam: 0, timer: { enabled: timer, seconds: secs }, playerName: g.playerName || 'Class Explorer' });
            ui.set({ screen: 'create' }); sfx('select');
          }}>Next ▶</button>
        </div>
      </div>
    </div>
  );
}

export function CreateCharacter() {
  const g = useStore(game);
  const st = useStore(settings);
  const [name, setName] = useState(g.playerName === 'Class Explorer' ? '' : g.playerName);
  const [avatar, setAvatar] = useState(g.avatar);
  const team = g.mode === 'team';
  const valid = name.trim().length >= 2;
  return (
    <div className="setup-screen">
      <div className="setup-card wide pop-in">
        <h2>🧑‍🎓 Create your {team ? 'class explorer' : 'student'}</h2>
        <div className="create-grid">
          <div>
            <label className="f-field"><span className="f-label">{team ? 'Class or group name' : 'Your name'}</span>
              <input autoFocus value={name} maxLength={24} placeholder={team ? 'e.g. Class 11-B' : 'e.g. Sara'} onChange={(e) => setName(e.target.value)} />
            </label>
            <p className="f-label">Choose your avatar</p>
            <div className="avatar-grid">
              {AVATARS.map((a) => (
                <button key={a.id} className={`avatar-opt ${avatar === a.id ? 'on' : ''}`} onClick={() => { setAvatar(a.id); sfx('select'); }}>
                  <AvatarImg look={a.id} scale={4} className={avatar === a.id ? 'bob' : ''} />
                  <small>{a.label}</small>
                </button>
              ))}
            </div>
            <label className="check"><input type="checkbox" checked={st.arabic} onChange={(e) => settings.set({ arabic: e.target.checked })} /> Show Arabic vocabulary hints (عربي)</label>
          </div>
          <div className="create-preview">
            <Portrait look={avatar} expr="happy" size={180} />
            <b>{name || '…'}</b>
            <small>Grade 12 applicant</small>
          </div>
        </div>
        <div className="row center">
          <button className="btn" onClick={() => ui.set({ screen: team ? 'teamsetup' : 'menu' })}>◀ Back</button>
          <button className="btn primary big" disabled={!valid} onClick={() => {
            game.set({ playerName: name.trim(), avatar, started: true, letter: { ...game.get().letter, name: team ? '' : name.trim() } });
            sfx('select');
            ui.set({ screen: 'intro' });
          }}>Begin ▶</button>
        </div>
        {!valid && <p className="muted small center">Type a name (at least 2 letters) to begin.</p>}
      </div>
    </div>
  );
}

export function Intro() {
  const [open, setOpen] = useState(false);
  return (
    <div className="intro-screen">
      <div className="stars-bg" />
      {!open ? (
        <button className="envelope pop-in" onClick={() => { setOpen(true); sfx('pickup'); }}>
          <div className="env-body"><div className="env-flap" /><div className="seal">🎓</div></div>
          <p>A mysterious invitation has arrived...<br /><b>Click to open</b></p>
        </button>
      ) : (
        <div className="invitation unfold">
          <div className="inv-crest">🎓</div>
          <small>{UNIVERSITY.toUpperCase()} · OFFICE OF ADMISSIONS</small>
          <h2>Congratulations!</h2>
          <p>You have been selected for the <b>University Admission Challenge</b>.</p>
          <p>Complete <b>five missions</b> to unlock your future.</p>
          <ol className="inv-list"><li>🏛️ The Communication Gate</li><li>📚 The Lost Vocabulary Archive</li><li>🏥 Dr Faisal's Missing Letter</li><li>📝 The Application Workshop</li><li>✉️ The Final Letter Challenge</li></ol>
          <p className="ready">Are you ready?</p>
          <div className="controls-tip">⌨️ Move: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrow keys · Talk: <kbd>E</kbd> · Or use the on-screen buttons</div>
          <button className="btn primary big glow" onClick={() => { setFlag('intro'); checkAchievements(); sfx('fanfare'); enterWorld(); }}>I'm ready! ▶</button>
        </div>
      )}
    </div>
  );
}

export function HowTo({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="How to Play" icon="❓" onClose={onClose} className="howto">
      <div className="howto-grid">
        <div><h4>🚶 Move</h4><p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrow keys. Hold <kbd>Shift</kbd> to run. On a tablet, use the arrow pad.</p></div>
        <div><h4>💬 Talk & interact</h4><p>Walk near a person or object. When you see <b>E</b>, press <kbd>E</kbd>, <kbd>Space</kbd>, or click it.</p></div>
        <div><h4>⬇️ Follow the arrow</h4><p>The yellow arrow shows your next goal. The banner at the top tells you what to do.</p></div>
        <div><h4>🎒 Backpack</h4><p>See your badges, documents and word cards. Press <kbd>B</kbd>.</p></div>
        <div><h4>📖 Quest journal</h4><p>See your missions, stars and replay challenges. Press <kbd>J</kbd>.</p></div>
        <div><h4>💡 Hints</h4><p>Stuck? Click Hint. In a challenge, a hint costs a little bonus XP.</p></div>
        <div><h4>⭐ Stars & XP</h4><p>Finish challenges to earn XP, coins and up to 3 stars. Wrong answers are OK: read the explanation and try again!</p></div>
        <div><h4>🖐️ Drag & drop</h4><p>Drag cards with the mouse or your finger. Or tap a card, then tap where it goes.</p></div>
        <div><h4>💾 Saving</h4><p>The game saves automatically in this browser. Choose “Continue Game” next time.</p></div>
      </div>
      <p className="muted small">Levels: Beginner Applicant → Skilled Communicator → Application Expert → University Champion. {UNIVERSITY} is imaginary.</p>
    </Modal>
  );
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const st = useStore(settings);
  const upd = (p: Partial<typeof st>) => { settings.set(p); const n = settings.get(); setVolumes({ musicOn: n.musicOn, sfxOn: n.sfxOn, music: n.music, sfx: n.sfx }); };
  return (
    <Modal title="Settings" icon="🔊" onClose={onClose}>
      <div className="settings">
        <label className="set-row"><span>🎵 Music</span><input type="checkbox" checked={st.musicOn} onChange={(e) => upd({ musicOn: e.target.checked })} /><input type="range" min={0} max={1} step={0.05} value={st.music} onChange={(e) => upd({ music: Number(e.target.value) })} /></label>
        <label className="set-row"><span>🔔 Sound effects</span><input type="checkbox" checked={st.sfxOn} onChange={(e) => upd({ sfxOn: e.target.checked })} /><input type="range" min={0} max={1} step={0.05} value={st.sfx} onChange={(e) => { upd({ sfx: Number(e.target.value) }); sfx('coin'); }} /></label>
        <label className="set-row"><span>عربي Arabic vocabulary hints</span><input type="checkbox" checked={st.arabic} onChange={(e) => upd({ arabic: e.target.checked })} /></label>
        <label className="set-row"><span>🕹️ Always show on-screen controls</span><input type="checkbox" checked={st.showTouch} onChange={(e) => upd({ showTouch: e.target.checked })} /></label>
        <button className="btn" onClick={toggleFullscreen}>⛶ Toggle full screen</button>
        <p className="muted small">Shortcut: press <kbd>M</kbd> to mute or unmute music.</p>
      </div>
    </Modal>
  );
}

export function toggleFullscreen() {
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
  const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
  if (doc.fullscreenElement || doc.webkitFullscreenElement) { (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.()); return; }
  if (el.requestFullscreen) el.requestFullscreen().catch(() => iosTip());
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  else iosTip();
}

function iosTip() {
  toast('On iPhone/iPad: tap Share ⬆️ then "Add to Home Screen" to play in full screen.', 'info', '📱');
}

export { LOOKS };
