import { useEffect, useRef, useState } from 'react';
import { Shell, useRun, useDnd, shuffle, Ar } from '../common';
import { BUILD_SENTENCES, CHOOSE_BANK, LETTER_PARTS, FORMAL_PHRASES, LETTER_WORD_BANK, EXAMPLE_LETTER, GUIDED_FRAMES, COURSES, UNIVERSITY } from '../../game/content';
import { useStore } from '../../game/store';
import { game, countWords, toast, checkAchievements, type Letter } from '../../game/state';
import { LETTER_CHECKS, informalScan, letterWords } from '../../game/letterCheck';
import { sfx } from '../../game/audio';

// ------------------------------------------------------------------ Stage 1
export function BuildGame() {
  return (
    <Shell id="m5-build" icon="🧱" title="Stage 1 · Build the Letter" wide
      instructions="Drag each sentence card into the correct paragraph. Each paragraph needs 2 sentences."
      intro={<div className="order-intro"><div>
        <p>Your letter has <b>five paragraphs</b>. Each paragraph has one job:</p>
        <ol className="plan-list">{LETTER_PARTS.map((p) => <li key={p.id}>{p.icon} {p.purpose}</li>)}</ol>
        <div className="example-box"><b>Example:</b> "I am writing to apply for a place on the Computer Science course." ➜ Paragraph 1 (purpose).</div>
      </div></div>}
      hints={['"I am writing to apply..." = Paragraph 1. "I am enclosing..." = Paragraph 4.', 'Sentences about school and subjects go in Paragraph 2. Reasons go in Paragraph 3.']}>
      <BuildInner />
    </Shell>
  );
}

function BuildInner() {
  const run = useRun();
  const [cards] = useState(() => shuffle(BUILD_SENTENCES.map((s, i) => ({ ...s, id: `b${i}` }))));
  const [placed, setPlaced] = useState<Record<string, number>>({});
  const [shake, setShake] = useState<string | null>(null);
  const dnd = useDnd((id, zone) => {
    const c = cards.find((x) => x.id === id)!;
    const p = Number(zone.replace('para', ''));
    if (c.para === p) {
      const n = { ...placed, [id]: p };
      setPlaced(n);
      run.feedback(`Yes! This sentence is about: ${LETTER_PARTS[p].purpose.toLowerCase()}.`, true);
      if (Object.keys(n).length === cards.length) run.finish();
    } else {
      run.mistake();
      setShake(id); window.setTimeout(() => setShake(null), 500);
      run.feedback(`Paragraph ${p + 1} is for: ${LETTER_PARTS[p].purpose.toLowerCase()}. Where does this sentence belong?`, false);
    }
  }, (id) => <div className="sent-card">{cards.find((c) => c.id === id)!.text}</div>);
  return (
    <div className="build-layout">
      <div className="sent-pile">
        {cards.filter((c) => placed[c.id] === undefined).map((c) => { const src = dnd.source(c.id); return <div key={c.id} {...src} className={`${src.className} sent-card ${shake === c.id ? 'shake' : ''}`}>{c.text}</div>; })}
      </div>
      <div className="letter-paper compact">
        <p>Dear Sir or Madam,</p>
        {LETTER_PARTS.map((p) => (
          <div key={p.id} {...dnd.target(`para${p.id}`)} className={`para-slot multi ${dnd.selected ? 'armed' : ''}`}>
            <span className="slot-label">{p.icon} {p.title}: {p.purpose}</span>
            {cards.filter((c) => placed[c.id] === p.id).map((c) => <span key={c.id} className="pop-in">{c.text} </span>)}
          </div>
        ))}
        <p>Yours faithfully,</p>
      </div>
      {dnd.ghost}
    </div>
  );
}

// ------------------------------------------------------------------ Stage 2
export function ChooseGame() {
  return (
    <Shell id="m5-choose" icon="✅" title="Stage 2 · Choose the Best Sentences"
      instructions={<>Click only the <b><Ar term="formal">formal</Ar></b> sentences to add them to your letter. There are 7. Informal sentences cost a star!</>}
      hints={['Look for slang (wanna, uni, lol), "!!!" and contractions (Here\'s). Those are informal.', 'Formal sentences are complete, polite and use full words.']}>
      <ChooseInner />
    </Shell>
  );
}
function ChooseInner() {
  const run = useRun();
  const [bank] = useState(() => shuffle(CHOOSE_BANK.map((s, i) => ({ ...s, id: `c${i}` }))));
  const [chosen, setChosen] = useState<string[]>([]);
  const [binned, setBinned] = useState<string[]>([]);
  const total = CHOOSE_BANK.filter((s) => s.formal).length;
  const pick = (id: string) => {
    const s = bank.find((x) => x.id === id)!;
    if (chosen.includes(id) || binned.includes(id)) return;
    if (s.formal) {
      const n = [...chosen, id];
      setChosen(n);
      run.feedback(s.why, true);
      if (n.length === total) run.finish();
    } else {
      run.mistake();
      setBinned([...binned, id]);
      run.feedback(`Informal! ${s.why}`, false);
    }
  };
  const ordered = CHOOSE_BANK.map((s, i) => `c${i}`).filter((id) => chosen.includes(id));
  return (
    <div className="choose-layout">
      <div className="bank">
        {bank.map((s) => (
          <button key={s.id} className={`bank-sent ${chosen.includes(s.id) ? 'chosen' : ''} ${binned.includes(s.id) ? 'binned' : ''}`} onClick={() => pick(s.id)} disabled={chosen.includes(s.id) || binned.includes(s.id)}>
            {binned.includes(s.id) ? '🗑️ ' : chosen.includes(s.id) ? '✔ ' : ''}{s.text}
          </button>
        ))}
      </div>
      <div className="letter-paper compact">
        <p>Dear Sir or Madam,</p>
        {ordered.map((id) => <p key={id} className="pop-in">{bank.find((b) => b.id === id)!.text}</p>)}
        {chosen.length < total && <p className="placeholder">{total - chosen.length} more formal sentences to find…</p>}
        <p>Yours faithfully,</p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Stage 3
export function WriteGame() {
  return (
    <Shell id="m5-write" icon="✍️" title="Stage 3 · Write Your Own Application" wide
      instructions={<>Write your letter to {UNIVERSITY}. Use <b>Guided mode</b> to build sentences, or <b>Free writing</b> to type. Each paragraph needs at least one sentence.</>}
      hints={['Click "Insert starter" to begin a paragraph. Then finish the sentence with your own ideas.', 'Use the Formal phrases tab: click a phrase to add it to the paragraph you are writing.', 'Open the example letter to see a complete model.']}>
      <WriteInner />
    </Shell>
  );
}

const MIN_WORDS = 5;

function WriteInner() {
  const run = useRun();
  const g = useStore(game);
  const L = g.letter;
  const [mode, setMode] = useState<'guided' | 'free'>(() => (L.paragraphs.some((p) => p.trim()) ? 'free' : 'guided'));
  const [focus, setFocus] = useState(0);
  const [tab, setTab] = useState<'words' | 'phrases' | 'tips'>('phrases');
  const [showExample, setShowExample] = useState(false);
  const refs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const course = L.course || COURSES.find((c) => c.id === g.form.course)?.name || '';

  const update = (patch: Partial<Letter>) => game.set((s) => ({ letter: { ...s.letter, ...patch } }));
  const setPara = (i: number, v: string) => { const p = [...game.get().letter.paragraphs]; p[i] = v; update({ paragraphs: p }); };

  useEffect(() => { if (!L.course && course) update({ course }); if (!L.name && g.form.firstName) update({ name: `${g.form.firstName} ${g.form.surname}`.trim() }); }, []);

  const insert = (text: string) => {
    const i = focus;
    const ta = refs.current[i];
    const cur = game.get().letter.paragraphs[i] || '';
    let pos = ta ? ta.selectionStart ?? cur.length : cur.length;
    const clean = text.replace(/\.\.\.$/, ' ');
    const before = cur.slice(0, pos), after = cur.slice(pos);
    const sep = before && !/\s$/.test(before) ? ' ' : '';
    const next = before + sep + clean + after;
    setPara(i, next);
    pos = (before + sep + clean).length;
    sfx('drop');
    if (mode === 'guided') setMode('free');
    window.setTimeout(() => { const t = refs.current[i]; if (t) { t.focus(); t.setSelectionRange(pos, pos); } }, 30);
  };

  const guidedText = (i: number, vals: Record<string, string>) => GUIDED_FRAMES[i].parts.map((p) => (typeof p === 'string' ? p : (p.key === 'course' ? course || '…' : vals[`${i}.${p.key}`] || '…'))).join('');

  const words = letterWords(L);
  const short = L.paragraphs.map((p) => countWords(p) < MIN_WORDS);
  const ready = !short.some(Boolean) && L.name.trim().length > 1;

  const save = () => { update({ savedAt: Date.now() }); toast('Letter saved! You can come back and edit it any time.', 'info', '💾'); sfx('coin'); };
  const finish = () => {
    if (!ready) { run.feedback('Each paragraph needs at least 5 words, and you need to write your name.', false); return; }
    update({ savedAt: Date.now() });
    if (words >= 170 && words <= 200) toast('Challenge complete: 170–200 words!', 'achievement', '📏');
    checkAchievements();
    run.feedback('Great work! Your letter is saved.', true);
    run.finish();
  };

  return (
    <div className="write-layout">
      <div className="write-main">
        <div className="write-toolbar">
          <div className="seg">
            <button className={mode === 'guided' ? 'on' : ''} onClick={() => setMode('guided')}>🧭 Guided mode</button>
            <button className={mode === 'free' ? 'on' : ''} onClick={() => setMode('free')}>✏️ Free writing</button>
          </div>
          <label className="course-pick">Course: <select value={course} onChange={(e) => update({ course: e.target.value })}>{COURSES.map((c) => <option key={c.id}>{c.name}</option>)}</select></label>
          <div className={`wc ${words >= 170 && words <= 200 ? 'target' : ''}`} title="Optional challenge: 170–200 words">
            <span>{words} words</span>
            <div className="wc-bar"><div style={{ width: `${Math.min(100, (words / 200) * 100)}%` }} /><i style={{ left: '85%' }} /></div>
            <small>{words >= 170 && words <= 200 ? '🏆 Target reached!' : words > 200 ? 'A little long (target 170–200)' : 'Optional target: 170–200'}</small>
          </div>
        </div>
        <div className="letter-editor">
          <div className="le-row">
            <select className="greet" value={L.greeting} onChange={(e) => update({ greeting: e.target.value })}>
              <option>Dear Sir or Madam,</option><option>Dear Admissions Officer,</option><option value="Hi there,">Hi there,</option>
            </select>
            {!/^dear/i.test(L.greeting) && <span className="warn-inline">⚠ This greeting is informal.</span>}
          </div>
          {LETTER_PARTS.map((p, i) => (
            <div key={p.id} className={`le-para ${focus === i ? 'focus' : ''} ${short[i] ? '' : 'ok'}`} onClick={() => setFocus(i)}>
              <div className="le-head">
                <span>{p.icon} <b>{p.title}</b> – {p.purpose}</span>
                <span className="le-wc">{countWords(L.paragraphs[i])} words {short[i] ? '' : '✔'}</span>
              </div>
              {mode === 'guided' ? (
                <div className="guided">
                  <p className="frame">
                    {GUIDED_FRAMES[i].parts.map((part, k) => typeof part === 'string' ? <span key={k}>{part}</span> : part.key === 'course' ? <b key={k}>{course || '(choose a course above)'}</b> : (
                      <select key={k} value={L.guided[`${i}.${part.key}`] || ''} onChange={(e) => update({ guided: { ...game.get().letter.guided, [`${i}.${part.key}`]: e.target.value } })}>
                        <option value="">– choose –</option>{part.options.map((o) => <option key={o}>{o}</option>)}
                      </select>
                    ))}
                  </p>
                  <button className="btn small" onClick={() => {
                    const vals = game.get().letter.guided;
                    const missing = GUIDED_FRAMES[i].parts.some((pt) => typeof pt !== 'string' && pt.key !== 'course' && !vals[`${i}.${pt.key}`]);
                    if (missing) { run.feedback('Choose an option in every box first.', false); return; }
                    setPara(i, guidedText(i, vals)); sfx('correct');
                  }}>⬇ Use this paragraph</button>
                  {L.paragraphs[i] && <p className="guided-out">{L.paragraphs[i]}</p>}
                </div>
              ) : (
                <>
                  <textarea ref={(el) => { refs.current[i] = el; }} rows={3} value={L.paragraphs[i]} placeholder={`Start with: "${p.starter}..."`} onFocus={() => setFocus(i)} onChange={(e) => setPara(i, e.target.value)} spellCheck />
                  <div className="le-actions">
                    <button className="btn small" onClick={() => { setFocus(i); window.setTimeout(() => insert(p.starter + (p.starter.endsWith('.') ? ' ' : ' ')), 0); }}>➕ Insert starter</button>
                    {informalScan(L.paragraphs[i]).slice(0, 2).map((w) => <span key={w.word} className="warn-inline">⚠ "{w.word}": {w.tip}</span>)}
                  </div>
                </>
              )}
            </div>
          ))}
          <div className="le-row">
            <select value={L.closing} onChange={(e) => update({ closing: e.target.value })}><option>Yours faithfully,</option><option>Yours sincerely,</option><option value="Bye!">Bye!</option></select>
            <input className="sig-input" value={L.name} placeholder="Your full name" onChange={(e) => update({ name: e.target.value })} />
            {!/^yours/i.test(L.closing) && <span className="warn-inline">⚠ "Bye!" is informal.</span>}
          </div>
        </div>
        <div className="row">
          <button className="btn" onClick={save}>💾 Save</button>
          <button className="btn" onClick={() => setShowExample(true)}>👀 Example letter</button>
          <span className="spacer" />
          {!ready && <small className="muted">Write at least {MIN_WORDS} words in every paragraph to continue.</small>}
          <button className={`btn primary big ${ready ? '' : 'disabled'}`} onClick={finish}>Finish letter ▶</button>
        </div>
      </div>
      <aside className="write-side">
        <div className="tabs">
          <button className={tab === 'phrases' ? 'on' : ''} onClick={() => setTab('phrases')}>Formal phrases</button>
          <button className={tab === 'words' ? 'on' : ''} onClick={() => setTab('words')}>Word bank</button>
          <button className={tab === 'tips' ? 'on' : ''} onClick={() => setTab('tips')}>Tips</button>
        </div>
        <p className="side-note">Click to add to <b>Paragraph {focus + 1}</b></p>
        {tab === 'phrases' && <div className="chips">{FORMAL_PHRASES.map((f) => <button key={f} className="chip-btn" onClick={() => insert(f)}>{f}</button>)}</div>}
        {tab === 'words' && <div className="chips">{LETTER_WORD_BANK.map((w) => <button key={w} className="chip-btn word" onClick={() => insert(w)}>{w}</button>)}</div>}
        {tab === 'tips' && <ul className="tips">
          <li>Use full forms: <b>I am</b>, not <s>I'm</s>.</li>
          <li>Start each sentence with a <b>capital letter</b> and end with a <b>full stop</b>.</li>
          <li>Unknown reader? <b>Dear Sir or Madam,</b> ➜ <b>Yours faithfully,</b></li>
          <li>Keep sentences short and clear.</li>
          <li>Short version is OK! 1–2 sentences per paragraph is enough to finish.</li>
          <li>Extra challenge: 170–200 words.</li>
        </ul>}
      </aside>
      {showExample && (
        <div className="example-overlay" onClick={() => setShowExample(false)}>
          <div className="letter-paper example pop-in" onClick={(e) => e.stopPropagation()}>
            <button className="btn icon close-x" onClick={() => setShowExample(false)}>✕</button>
            <h4>📄 Example letter ({countWords(EXAMPLE_LETTER.paragraphs.join(' '))} words)</h4>
            <p>{EXAMPLE_LETTER.greeting}</p>
            {EXAMPLE_LETTER.paragraphs.map((p, i) => <p key={i}><span className="para-tag">{LETTER_PARTS[i].icon}</span> {p}</p>)}
            <p>{EXAMPLE_LETTER.closing}<br />{EXAMPLE_LETTER.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Stage 4
export function SubmitGame() {
  return (
    <Shell id="m5-submit" icon="📮" title="Stage 4 · Review and Submit" wide
      instructions="Tick each box on the checklist. A box can only be ticked when your letter really includes that part."
      hints={['If a box will not tick, read the suggestion and fix that paragraph here.', 'Each paragraph has its own job. Check the key words in the suggestion.']}>
      <SubmitInner />
    </Shell>
  );
}
function SubmitInner() {
  const run = useRun();
  const g = useStore(game);
  const L = g.letter;
  const [ticked, setTicked] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const update = (patch: Partial<Letter>) => game.set((s) => ({ letter: { ...s.letter, ...patch } }));
  const setPara = (i: number, v: string) => { const p = [...game.get().letter.paragraphs]; p[i] = v; update({ paragraphs: p }); };
  const tick = (id: string) => {
    const c = LETTER_CHECKS.find((x) => x.id === id)!;
    if (ticked.includes(id)) return;
    if (c.pass(game.get().letter)) { setTicked([...ticked, id]); sfx('correct'); setOpen(null); }
    else { setOpen(id); sfx('wrong'); run.feedback(`Not yet: ${c.tip}`, false); }
  };
  const warnings = informalScan([L.greeting, ...L.paragraphs, L.closing].join(' \n '));
  const all = ticked.length === LETTER_CHECKS.length;
  return (
    <div className="submit-layout">
      <div className="letter-paper preview">
        <p>{L.greeting}</p>
        {L.paragraphs.map((p, i) => <p key={i} className={open && LETTER_CHECKS.find((c) => c.id === open)?.para === i ? 'hl' : ''}>{p || <i className="muted">(empty paragraph {i + 1})</i>}</p>)}
        <p>{L.closing}<br />{L.name}</p>
        <small className="muted">{letterWords(L)} words</small>
      </div>
      <div className="checklist">
        <h4>📋 Review checklist</h4>
        {LETTER_CHECKS.map((c) => (
          <div key={c.id} className={`chk-row ${ticked.includes(c.id) ? 'on' : ''}`}>
            <button className="tickbox" onClick={() => tick(c.id)} aria-label={c.label}>{ticked.includes(c.id) ? '☑' : '☐'}</button>
            <div className="chk-text">
              <span onClick={() => tick(c.id)}>{c.label}</span>
              {open === c.id && (
                <div className="fix-box slide-in">
                  <p>💡 {c.tip}</p>
                  {c.para >= 0 ? <textarea rows={3} value={L.paragraphs[c.para]} onChange={(e) => setPara(c.para, e.target.value)} /> : (
                    <select value={L.greeting} onChange={(e) => update({ greeting: e.target.value })}><option>Dear Sir or Madam,</option><option>Dear Admissions Officer,</option><option value="Hi there,">Hi there,</option></select>
                  )}
                  {c.id === 'polite' && <div className="row"><select value={L.closing} onChange={(e) => update({ closing: e.target.value })}><option>Yours faithfully,</option><option>Yours sincerely,</option><option value="Bye!">Bye!</option></select><input value={L.name} placeholder="Your name" onChange={(e) => update({ name: e.target.value })} /></div>}
                  <button className="btn small primary" onClick={() => tick(c.id)}>Check again</button>
                </div>
              )}
            </div>
          </div>
        ))}
        {warnings.length > 0 && <div className="warn-box"><b>✏️ Revision suggestions (optional):</b>{warnings.map((w) => <div key={w.word}>"{w.word}" – {w.tip}</div>)}</div>}
        <p className="disclaimer">ℹ️ This checklist checks the <b>structure</b> and <b>key words</b> of your letter. It cannot check grammar or meaning. Ask your teacher for feedback on your English.</p>
        <button className={`btn primary big ${all ? 'glow' : 'disabled'}`} onClick={() => { if (all) run.finish(); else run.feedback('Tick every box first.', false); }}>📮 Submit my application</button>
      </div>
    </div>
  );
}
