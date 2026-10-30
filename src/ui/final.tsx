import { useEffect, useState } from 'react';
import { useStore, bus } from '../game/store';
import { game, ui, totalStars, levelOf, ACHIEVEMENTS, MISSIONS, CHALLENGES } from '../game/state';
import { UNIVERSITY, COURSES } from '../game/content';
import { letterWords } from '../game/letterCheck';
import { Portrait } from './common';
import { sfx } from '../game/audio';

export function FinalScreen() {
  const g = useStore(game);
  const [stage, setStage] = useState(0);
  useEffect(() => {
    sfx('fanfare');
    const t1 = window.setTimeout(() => setStage(1), 1400);
    const t2 = window.setTimeout(() => { setStage(2); sfx('achievement'); }, 3200);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, []);
  const course = g.letter.course || COURSES.find((c) => c.id === g.form.course)?.name || 'your chosen course';
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const missionsDone = MISSIONS.filter((m) => g.flags[`m${m.n}_done`]).length;
  const sortedTeams = [...g.teams].sort((a, b) => b.xp - a.xp);
  const back = () => { ui.set({ screen: 'play' }); sfx('select'); };

  return (
    <div className="final-screen">
      <div className="confetti big">{Array.from({ length: 70 }, (_, i) => <i key={i} style={{ left: `${(i * 29) % 100}%`, animationDelay: `${(i % 14) * 0.18}s`, background: ['#ff9a85', '#ffd36e', '#a8d5a2', '#c9a7ff', '#8fb8ff'][i % 5] }} />)}</div>
      <div className="final-scroll">
        <div className="final-hero">
          <Portrait look="dean" expr="proud" size={110} />
          <div>
            <h1 className="you-did-it">YOU DID IT! 🎓</h1>
            <h2 className="accomplished">MISSION ACCOMPLISHED</h2>
          </div>
          <Portrait look={g.avatar} expr="happy" size={110} />
        </div>

        <div className={`acceptance ${stage >= 1 ? 'unfolded' : ''}`}>
          <div className="acc-fold top" />
          <div className="acc-content">
            <div className="acc-head"><span>🎓</span><div><b>{UNIVERSITY.toUpperCase()}</b><small>Office of Admissions · Kuwait</small></div><small className="acc-date">{date}</small></div>
            <p>Dear {g.playerName},</p>
            <p>We are delighted to inform you that your application has been <b>successful</b>. You have been offered a place on the <b>{course}</b> course.</p>
            <p>Your communication skills, your understanding of formal language and your excellent application letter impressed the admissions team.</p>
            <p>Yours sincerely,<br /><i className="sig-font">Dr Munira</i><br />Dean of Admissions</p>
            <p className="imaginary">⚠️ This is an imaginary acceptance letter inside a classroom game. {UNIVERSITY} is not a real university.</p>
          </div>
        </div>

        {stage >= 2 && (
          <div className="final-stats slide-in">
            <div className="stat"><span>✨</span><b>{g.xp}</b><small>Total XP</small></div>
            <div className="stat"><span>⭐</span><b>{totalStars(g)}/{CHALLENGES.length * 3}</b><small>Stars</small></div>
            <div className="stat"><span>💎</span><b>{g.vocab.length}/7</b><small>Vocabulary collected</small></div>
            <div className="stat"><span>🏛️</span><b>{missionsDone}/5</b><small>Missions completed</small></div>
            <div className="stat"><span>🏆</span><b>{g.achievements.length}</b><small>Achievements</small></div>
            <div className="stat"><span>🆙</span><b className="small">{levelOf(g.xp).title}</b><small>Final level</small></div>
          </div>
        )}

        {stage >= 2 && g.mode === 'team' && g.teams.length > 0 && (
          <div className="final-section">
            <h3>🏆 Team leaderboard</h3>
            {sortedTeams.map((t, i) => <div key={t.name} className="lb-row" style={{ borderColor: t.color }}><span className="lb-rank">{['🥇', '🥈', '🥉'][i] || i + 1}</span><b>{t.name}</b><span>{t.xp} XP</span><span>⭐ {t.stars}</span></div>)}
          </div>
        )}

        {stage >= 2 && (
          <div className="final-section">
            <h3>🏅 Achievements unlocked</h3>
            <div className="ach-grid">{ACHIEVEMENTS.filter((a) => g.achievements.includes(a.id)).map((a) => <div key={a.id} className="ach on"><span>{a.icon}</span><b>{a.name}</b><small>{a.desc}</small></div>)}</div>
          </div>
        )}

        {stage >= 2 && (
          <div className="final-section">
            <h3>✉️ Your final application letter ({letterWords(g.letter)} words)</h3>
            <div className="letter-paper preview">
              <p>{g.letter.greeting}</p>
              {g.letter.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
              <p>{g.letter.closing}<br />{g.letter.name}</p>
            </div>
          </div>
        )}

        {stage >= 2 && (
          <div className="final-actions">
            <button className="btn primary big" onClick={() => { sfx('select'); window.print(); }}>🖨️ Print certificate & letter</button>
            <button className="btn big" onClick={() => { back(); ui.set({ modal: 'journal' }); }}>↻ Replay missions</button>
            <button className="btn big" onClick={back}>🗺️ Keep exploring</button>
            <button className="btn big" onClick={() => { ui.set({ screen: 'menu' }); bus.emit('attract', true); }}>🏠 Main menu</button>
          </div>
        )}
      </div>
      <PrintCertificate />
    </div>
  );
}

export function PrintCertificate() {
  const g = useStore(game);
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className="print-only">
      <div className="certificate">
        <div className="cert-border">
          <div className="cert-crest">🎓</div>
          <div className="cert-uni">{UNIVERSITY}</div>
          <div className="cert-title">Certificate of Completion</div>
          <div className="cert-sub">The University Quest: Mission Admission</div>
          <p>This certifies that</p>
          <div className="cert-name">{g.playerName}</div>
          {g.mode === 'team' && g.teams.length > 0 && <p>with teams: {g.teams.map((t) => t.name).join(', ')}</p>}
          <p>has successfully completed all five admission missions:<br />Communication · Vocabulary · Formal Letters · Application Workshop · Final Letter</p>
          <div className="cert-stats">⭐ {totalStars(g)} stars · ✨ {g.xp} XP · {levelOf(g.xp).title}</div>
          <div className="cert-foot"><div><i className="sig-font">Dr Munira</i><br />Dean (imaginary)</div><div>{date}</div><div><i className="sig-font">Mr Bader</i><br />Writing Tutor</div></div>
          <small>This is a classroom game certificate. {UNIVERSITY} is an imaginary university.</small>
        </div>
      </div>
      <div className="print-letter">
        <h3>My Application Letter</h3>
        <p>{g.letter.greeting}</p>
        {g.letter.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
        <p>{g.letter.closing}<br />{g.letter.name}</p>
      </div>
    </div>
  );
}
