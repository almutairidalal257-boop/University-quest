import { useState } from 'react';
import { Shell, useRun, useDnd, shuffle, Portrait, Ar } from '../common';
import { FAISAL_PARAGRAPHS, FORMAL_PAIRS, DETECTIVE_LETTER, DETECTIVE_QUESTIONS, FAISAL } from '../../game/content';
import { useStore } from '../../game/store';
import { ui } from '../../game/state';
import { sfx } from '../../game/audio';

export function OrderGame() {
  return (
    <Shell id="m3-order" icon="🧾" title="Rebuild the Letter" wide
      instructions="Drag the five paragraphs into the correct order in Dr Faisal's letter."
      intro={<div className="order-intro">
        <Portrait look="faisal" expr="worried" size={90} />
        <div>
          <p>A formal application letter has a clear order:</p>
          <ol className="plan-list"><li>🎯 Purpose for writing</li><li>🏅 Qualifications and experience</li><li>💭 Reasons for applying</li><li>📎 Enclosed documents and references</li><li>🤝 Thanking and conclusion</li></ol>
          <p>Look for <b>key words</b>: "I am writing to..." = purpose. "I am enclosing..." = documents.</p>
        </div>
      </div>}
      hints={['Using a hint shows the job of each paragraph on the cards.', 'Paragraph 1 starts with "I am writing to apply...". The last paragraph says "Thank you".']}>
      <OrderInner />
    </Shell>
  );
}

function OrderInner() {
  const run = useRun();
  const u = useStore(ui);
  const showLabels = u.run.hints > 0;
  const [pile] = useState(() => shuffle(FAISAL_PARAGRAPHS));
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null, null, null]);
  const [shake, setShake] = useState<string | null>(null);
  const dnd = useDnd((id, zone) => {
    const slot = Number(zone.replace('slot', ''));
    if (slots[slot]) return;
    const correct = FAISAL_PARAGRAPHS[slot].id === id;
    if (correct) {
      const next = [...slots]; next[slot] = id; setSlots(next);
      run.feedback(`Correct! Paragraph ${slot + 1}: ${FAISAL_PARAGRAPHS[slot].label}.`, true);
      if (next.every(Boolean)) run.finish();
    } else {
      run.mistake();
      setShake(id); window.setTimeout(() => setShake(null), 500);
      run.feedback(`Not here. Paragraph ${slot + 1} should be about: ${FAISAL_PARAGRAPHS[slot].label.toLowerCase()}.`, false);
    }
  }, (id) => <div className="para-card ghost">{FAISAL_PARAGRAPHS.find((p) => p.id === id)!.text.slice(0, 60)}…</div>);

  return (
    <div className="order-layout">
      <div className="para-pile">
        <h4>📄 Mixed-up paragraphs</h4>
        {pile.filter((p) => !slots.includes(p.id)).map((p) => {
          const src = dnd.source(p.id);
          return <div key={p.id} {...src} className={`${src.className} para-card ${shake === p.id ? 'shake' : ''}`}>{showLabels && <span className="tag">{p.label}</span>}{p.text}</div>;
        })}
      </div>
      <div className="letter-paper">
        <p className="addr">To: The Recruitment Manager, {FAISAL.hospital}</p>
        <p>Dear Sir or Madam,</p>
        {slots.map((id, i) => (
          <div key={i} {...dnd.target(`slot${i}`)} className={`para-slot ${id ? 'filled' : ''} ${dnd.selected && !id ? 'armed' : ''}`}>
            <span className="num">{i + 1}</span>
            {id ? <span className="pop-in">{FAISAL_PARAGRAPHS.find((p) => p.id === id)!.text}</span> : <span className="placeholder">Drop paragraph {i + 1} here</span>}
          </div>
        ))}
        <p>Yours faithfully,</p>
        <p className="sig">{FAISAL.name}</p>
      </div>
      {dnd.ghost}
    </div>
  );
}

export function FormalGame() {
  return (
    <Shell id="m3-formal" icon="🗑️" title="Formal or Informal?"
      instructions={<>Drag <b><Ar term="informal">informal</Ar></b> expressions into the recycling bin ♻️. Drag <b><Ar term="formal">formal</Ar></b> expressions into the letter ✉️.</>}
      intro={<div className="example-box">
        <b>Worked example:</b><br />
        "Hey!" ➜ ♻️ bin (too casual for a letter)<br />
        "Dear Sir or Madam," ➜ ✉️ letter (polite and formal)<br /><br />
        Formal language is <b>polite</b>, uses <b>full forms</b> (I am, not I'm) and has <b>no slang</b>.
      </div>}
      hints={['Short, friendly words like "Hey", "Bye" and "Thanks a lot" are informal.', "Contractions like \"Here's\" are informal. Formal language uses full words."]}>
      <FormalInner />
    </Shell>
  );
}

function FormalInner() {
  const run = useRun();
  const [cards] = useState(() => shuffle([
    ...FORMAL_PAIRS.map((p, i) => ({ id: `i${i}`, text: p.informal, formal: false, pair: p.formal })),
    ...FORMAL_PAIRS.map((p, i) => ({ id: `f${i}`, text: p.formal, formal: true, pair: p.informal })),
  ]));
  const [binned, setBinned] = useState<string[]>([]);
  const [lettered, setLettered] = useState<string[]>([]);
  const [shake, setShake] = useState<string | null>(null);
  const [binAnim, setBinAnim] = useState(0);
  const dnd = useDnd((id, zone) => {
    const c = cards.find((x) => x.id === id)!;
    const ok = (zone === 'bin') === !c.formal;
    if (ok) {
      if (zone === 'bin') { setBinned((b) => [...b, id]); setBinAnim(Date.now()); run.feedback(`Yes! "${c.text}" is informal. Formal: "${c.pair}"`, true); }
      else { setLettered((l) => [...l, id]); run.feedback(`Yes! "${c.text}" is formal. (Informal: "${c.pair}")`, true); }
      if (binned.length + lettered.length + 1 === cards.length) run.finish();
    } else {
      run.mistake();
      setShake(id); window.setTimeout(() => setShake(null), 500);
      run.feedback(c.formal ? `"${c.text}" is polite and formal. It belongs in the letter.` : `"${c.text}" is too casual for a formal letter.`, false);
    }
  }, (id) => <div className="expr-card">{cards.find((x) => x.id === id)!.text}</div>);
  const left = cards.filter((c) => !binned.includes(c.id) && !lettered.includes(c.id));
  return (
    <div className="formal-layout">
      <div {...dnd.target('bin')} className={`bin-zone ${dnd.selected ? 'armed' : ''}`}>
        <div key={binAnim} className="bin-icon wobble">♻️</div>
        <b>Recycling bin</b>
        <div className="binned">{binned.map((id) => <span key={id} className="crumpled">{cards.find((c) => c.id === id)!.text}</span>)}</div>
      </div>
      <div className="expr-pile">
        {left.map((c) => {
          const src = dnd.source(c.id);
          return <div key={c.id} {...src} className={`${src.className} expr-card ${shake === c.id ? 'shake' : ''}`}>{c.text}</div>;
        })}
        {left.length === 0 && <div className="all-done">🎉 All sorted!</div>}
      </div>
      <div {...dnd.target('letter')} className={`letter-zone ${dnd.selected ? 'armed' : ''}`}>
        <b>✉️ Formal letter</b>
        <div className="mini-letter">{lettered.map((id) => <p key={id} className="pop-in">{cards.find((c) => c.id === id)!.text}</p>)}</div>
      </div>
      {dnd.ghost}
    </div>
  );
}

export function DetectiveGame() {
  return (
    <Shell id="m3-detective" icon="🔍" title="Reading Detective" wide
      instructions={<>1) Choose a question card. 2) Click the sentence in the letter that gives the <b><Ar term="evidence">evidence</Ar></b>.</>}
      intro={<div className="example-box">
        <b>How detectives read:</b><br />
        Question: "Where does Dr Faisal work now?"<br />
        🔍 Evidence: "...a large teaching hospital in <u>London</u>."<br />
        ✔ Answer: In a teaching hospital in London.<br /><br />Find the sentence that <b>proves</b> the answer.
      </div>}
      hints={['Look for key words from the question in the letter.', 'For "What makes the letter formal?", look at the very first or the very last lines.']}>
      <DetectiveInner />
    </Shell>
  );
}

function DetectiveInner() {
  const run = useRun();
  const [active, setActive] = useState<string>(DETECTIVE_QUESTIONS[0].id);
  const [solved, setSolved] = useState<Record<string, string>>({});
  const [flash, setFlash] = useState<string | null>(null);
  const q = DETECTIVE_QUESTIONS.find((x) => x.id === active);
  const clickSentence = (sid: string) => {
    if (!q || solved[q.id]) return;
    if (q.evidence.includes(sid)) {
      const next = { ...solved, [q.id]: sid };
      setSolved(next);
      sfx('correct');
      run.feedback(`Evidence found! ${q.answer}`, true);
      const nextQ = DETECTIVE_QUESTIONS.find((x) => !next[x.id]);
      if (nextQ) window.setTimeout(() => setActive(nextQ.id), 900); else run.finish();
    } else {
      run.mistake();
      setFlash(sid); window.setTimeout(() => setFlash(null), 600);
      run.feedback(`That sentence does not answer the question. ${q.hint}`, false);
    }
  };
  const qNum = (sid: string) => DETECTIVE_QUESTIONS.findIndex((x) => solved[x.id] === sid);
  return (
    <div className="detective">
      <div className="evidence-letter">
        <div className="paper-head">📄 Dr Faisal's letter</div>
        {DETECTIVE_LETTER.map((s) => {
          const n = qNum(s.id);
          return (
            <span key={s.id} className={`ev-sentence ${n >= 0 ? 'found' : ''} ${flash === s.id ? 'nope' : ''} ${['greet', 'close', 'sign'].includes(s.id) ? 'block' : ''} ${['qual', 'why', 'docs', 'thanks'].includes(s.id) ? 'para-start' : ''}`} onClick={() => clickSentence(s.id)}>
              {n >= 0 && <span className="pin">📌{n + 1}</span>}{s.text}{' '}
            </span>
          );
        })}
      </div>
      <div className="cork-board">
        {DETECTIVE_QUESTIONS.map((x, i) => (
          <button key={x.id} className={`q-card ${active === x.id ? 'active' : ''} ${solved[x.id] ? 'solved' : ''}`} style={{ transform: `rotate(${[-2, 1.5, -1, 2, -1.5, 1][i]}deg)` }} onClick={() => { setActive(x.id); sfx('select'); }}>
            <span className="q-pin" />
            <b>Q{i + 1}. {x.q}</b>
            {solved[x.id] ? <span className="ans">✔ {x.answer}</span> : <span className="ans muted">{active === x.id ? '👉 Click the evidence in the letter' : 'Unsolved'}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
