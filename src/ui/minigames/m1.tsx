import { useState } from 'react';
import { Shell, useRun, Portrait, Choice, useDnd, shuffle, Ar } from '../common';
import { LISTEN_SCENARIOS, LINES_QUESTION, PROVERB } from '../../game/content';
import { sfx } from '../../game/audio';

// Replay version of the in-world listening sort (drag cards into two zones)
export function ListenSort() {
  return (
    <Shell id="m1-listen" icon="👂" title="Good Listener or Poor Listener?" instructions={<>Drag each student into the <b><Ar term="good listener">GOOD LISTENER</Ar></b> zone or the <b><Ar term="poor listener">POOR LISTENER</Ar></b> zone. (You can also tap a card, then tap a zone.)</>}
      hints={['A good listener pays attention, lets others finish, asks questions and shows empathy.', 'Interrupting, talking non-stop and judging too fast are signs of a POOR listener.']}>
      <ListenSortInner />
    </Shell>
  );
}
function ListenSortInner() {
  const run = useRun();
  const [order] = useState(() => shuffle(LISTEN_SCENARIOS));
  const [placed, setPlaced] = useState<Record<string, 'good' | 'poor'>>({});
  const [shake, setShake] = useState<string | null>(null);
  const dnd = useDnd((id, zone) => {
    const sc = LISTEN_SCENARIOS.find((x) => x.id === id)!;
    const good = zone === 'good';
    if (good === sc.good) {
      const next = { ...placed, [id]: zone as 'good' | 'poor' };
      setPlaced(next);
      run.feedback(sc.explain, true);
      if (Object.keys(next).length === LISTEN_SCENARIOS.length) run.finish();
    } else {
      run.mistake();
      setShake(id);
      window.setTimeout(() => setShake(null), 500);
      run.feedback(`Think again about ${sc.name}. Read what she did carefully.`, false);
    }
  }, (id) => <div className="card mini">{LISTEN_SCENARIOS.find((x) => x.id === id)!.name}</div>);
  const summary = (id: string) => {
    const sc = LISTEN_SCENARIOS.find((x) => x.id === id)!;
    return sc.lines.map((l) => l.text).join(' ');
  };
  return (
    <div className="sort-layout">
      <div className="card-pile">
        {order.filter((s) => !placed[s.id]).map((s) => (
          <div key={s.id} {...dnd.source(s.id)} className={`${dnd.source(s.id).className} card scenario ${shake === s.id ? 'shake' : ''}`}>
            <Portrait look={s.id} size={56} /><div><b>{s.name}</b><p>{summary(s.id)}</p></div>
          </div>
        ))}
      </div>
      <div className="zones two">
        {(['good', 'poor'] as const).map((z) => (
          <div key={z} {...dnd.target(z)} className={`zone ${z}`}>
            <h3>{z === 'good' ? '👂 GOOD LISTENER' : '🙉 POOR LISTENER'}</h3>
            {Object.entries(placed).filter(([, v]) => v === z).map(([id]) => <div key={id} className="chip pop-in">{LISTEN_SCENARIOS.find((x) => x.id === id)!.name}</div>)}
          </div>
        ))}
      </div>
      {dnd.ghost}
    </div>
  );
}

export function LinesGame() {
  return (
    <Shell id="m1-lines" icon="🫶" title="Listen Between the Lines" instructions="Look at Reem's body language. What is her hidden message?"
      intro={<div className="lines-intro">
        <p><b>Listening between the lines</b> means understanding the hidden message. People do not only speak with words. They also speak with their <b>face</b>, their <b>eyes</b> and their <b>voice</b>.</p>
        <div className="example-box"><b>Example:</b> Your friend says, "The test was easy," but he is frowning and his voice is shaking. <br />➡️ Hidden message: he is probably worried about the test.</div>
      </div>}
      hints={['Her words and her body language do not match. Which feeling matches her face?', 'Upset face + no eye contact usually means sad or worried.']}>
      <LinesInner />
    </Shell>
  );
}
function LinesInner() {
  const run = useRun();
  const [step, setStep] = useState<0 | 1>(0);
  const [picked, setPicked] = useState<Record<number, boolean>>({});
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const q = step === 0 ? LINES_QUESTION : LINES_QUESTION.followUp;
  const pick = (i: number) => {
    const o = q.options[i];
    setPicked((p) => ({ ...p, [i]: true }));
    setMsg({ text: o.feedback, ok: o.correct });
    if (o.correct) {
      sfx('correct');
      if (step === 0) window.setTimeout(() => { setStep(1); setPicked({}); setMsg(null); }, 2600);
      else run.finish();
    } else run.mistake();
  };
  return (
    <div className="lines-game">
      <div className="scene-card">
        <Portrait look="reem" expr="sad" size={150} className="sad-anim" />
        <div className="speech">"I'm fine."</div>
        <div className="cues">{LINES_QUESTION.cues.map((c) => <div key={c.label} className="cue"><span>{c.icon}</span><div><b>{c.label}</b><br />{c.text}</div></div>)}</div>
      </div>
      <div className="question-col">
        <h3 className="q">{step === 0 ? 'Question 1 of 2' : 'Question 2 of 2'}</h3>
        <p className="q-text">{q.prompt}</p>
        {q.options.map((o, i) => <Choice key={i} letter={'ABC'[i]} text={o.text} onClick={() => pick(i)} state={picked[i] ? (o.correct ? 'right' : 'wrong') : ''} />)}
        {msg && <div className={`explain ${msg.ok ? 'ok' : 'bad'} slide-in`}>{msg.text}</div>}
        {step === 1 && <div className="explain info">💡 Non-verbal communication (face, eyes, voice) helps us understand hidden meanings.</div>}
      </div>
    </div>
  );
}

export function ProverbGame() {
  return (
    <Shell id="m1-proverb" icon="📜" title="Communication Wisdom" instructions="Read the proverb. Choose the correct meaning."
      hints={['The proverb says "listen". Which answer is about listening?', 'Being "deaf" here means not learning anything because you only talk.']}>
      <ProverbInner />
    </Shell>
  );
}
function ProverbInner() {
  const run = useRun();
  const [picked, setPicked] = useState<Record<number, boolean>>({});
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [opened, setOpened] = useState<number[]>([]);
  const pick = (i: number) => {
    const o = PROVERB.options[i];
    setPicked((p) => ({ ...p, [i]: true }));
    setMsg({ text: o.feedback, ok: o.correct });
    if (o.correct) { sfx('correct'); setDone(true); } else run.mistake();
  };
  return (
    <div className="proverb">
      <div className="scroll"><span className="quote">“{PROVERB.text}”</span><small>— {PROVERB.origin}</small></div>
      {!done && <div className="choices">{PROVERB.options.map((o, i) => <Choice key={i} letter={o.letter} text={o.text} onClick={() => pick(i)} state={picked[i] ? (o.correct ? 'right' : 'wrong') : ''} />)}</div>}
      {msg && <div className={`explain ${msg.ok ? 'ok' : 'bad'} slide-in`}>{msg.text}</div>}
      {done && (
        <div className="wisdom slide-in">
          <h3>📖 Wisdom scrolls – tap each scroll to open it</h3>
          <div className="scrolls">
            {PROVERB.ideas.map((t, i) => (
              <button key={i} className={`wisdom-card ${opened.includes(i) ? 'open' : ''}`} onClick={() => { if (!opened.includes(i)) { setOpened([...opened, i]); sfx('pickup'); } }}>
                {opened.includes(i) ? t : `Scroll ${i + 1} 🔒`}
              </button>
            ))}
          </div>
          {opened.length === PROVERB.ideas.length && <button className="btn primary big pop-in" onClick={() => run.finish()}>I understand! ✔</button>}
        </div>
      )}
    </div>
  );
}
