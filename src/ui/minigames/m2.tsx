import { useCallback, useLayoutEffect, useRef, useState, useEffect } from 'react';
import { Shell, useRun, useDnd, shuffle, VocabIcon } from '../common';
import { VOCAB, VOCAB_SENTENCES, vocabById } from '../../game/content';
import { sfx } from '../../game/audio';

export function MatchGame() {
  return (
    <Shell id="m2-match" icon="🔗" title="Repair the Vocabulary Records" wide
      instructions={<>Connect each <b>word</b> to its <b>meaning</b>. Drag from the ● dot to a meaning, or tap a word and then tap a meaning.</>}
      intro={<div className="worked-match">
        <p><b>Worked example:</b></p>
        <div className="example-line"><span className="word-pill">cardiac</span><span className="line-demo" /><span className="meaning-pill">relating to the heart</span></div>
        <p>"Cardiac" is connected to the heart. A <i>cardiac surgeon</i> operates on the heart. ❤️</p>
      </div>}
      hints={['Start with the words you know best. Look at the pictures to help you.', '"Doctorate" is a university degree. "Enclose" is something you do with an envelope.', '"Extensive" = large in amount. "In advance" = before.']}>
      <MatchInner />
    </Shell>
  );
}

function MatchInner() {
  const run = useRun();
  const [meanings] = useState(() => shuffle(VOCAB.map((v) => v.id)));
  const [done, setDone] = useState<string[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [bad, setBad] = useState<[string, string] | null>(null);
  const [drag, setDrag] = useState<{ from: string; x: number; y: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<Record<string, HTMLElement | null>>({});
  const meanRefs = useRef<Record<string, HTMLElement | null>>({});
  const [pos, setPos] = useState<{ w: Record<string, [number, number]>; m: Record<string, [number, number]> }>({ w: {}, m: {} });

  const measure = useCallback(() => {
    const b = box.current?.getBoundingClientRect();
    if (!b) return;
    const w: Record<string, [number, number]> = {}, m: Record<string, [number, number]> = {};
    Object.entries(wordRefs.current).forEach(([k, el]) => { if (el) { const r = el.getBoundingClientRect(); w[k] = [r.right - b.left, r.top + r.height / 2 - b.top]; } });
    Object.entries(meanRefs.current).forEach(([k, el]) => { if (el) { const r = el.getBoundingClientRect(); m[k] = [r.left - b.left, r.top + r.height / 2 - b.top]; } });
    setPos({ w, m });
  }, []);
  useLayoutEffect(() => { measure(); }, [measure, done]);
  useEffect(() => { window.addEventListener('resize', measure); const t = window.setTimeout(measure, 400); return () => { window.removeEventListener('resize', measure); window.clearTimeout(t); }; }, [measure]);

  const connect = (word: string, meaning: string) => {
    if (done.includes(word) || done.includes(meaning)) return;
    if (word === meaning) {
      const next = [...done, word];
      setDone(next);
      const v = vocabById(word);
      run.feedback(`${v.word} = ${v.meaning}. Example: "${v.example}"`, true);
      if (next.length === VOCAB.length) run.finish();
    } else {
      run.mistake();
      setBad([word, meaning]);
      window.setTimeout(() => setBad(null), 900);
      run.feedback(`"${vocabById(word).word}" does not mean "${vocabById(meaning).meaning}". Try again!`, false);
    }
    setSel(null);
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const b = box.current!.getBoundingClientRect();
      setDrag((d) => (d ? { ...d, x: e.clientX - b.left, y: e.clientY - b.top } : d));
    };
    const up = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-meaning]') as HTMLElement | null;
      if (el) connect(drag.from, el.dataset.meaning!);
      setDrag(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  });

  const startDrag = (e: React.PointerEvent, id: string) => {
    if (done.includes(id)) return;
    e.preventDefault();
    const b = box.current!.getBoundingClientRect();
    setDrag({ from: id, x: e.clientX - b.left, y: e.clientY - b.top });
    setSel(id);
  };

  const curve = (a: [number, number], b: [number, number]) => `M${a[0]},${a[1]} C${a[0] + 60},${a[1]} ${b[0] - 60},${b[1]} ${b[0]},${b[1]}`;

  return (
    <div className="match" ref={box}>
      <svg className="match-lines">
        {done.map((id) => pos.w[id] && pos.m[id] && <path key={id} d={curve(pos.w[id], pos.m[id])} className="line ok" />)}
        {bad && pos.w[bad[0]] && pos.m[bad[1]] && <path d={curve(pos.w[bad[0]], pos.m[bad[1]])} className="line bad" />}
        {drag && pos.w[drag.from] && <path d={curve(pos.w[drag.from], [drag.x, drag.y])} className="line live" />}
      </svg>
      <div className="match-col words">
        {VOCAB.map((v) => (
          <div key={v.id} className={`word-item ${done.includes(v.id) ? 'done' : ''} ${sel === v.id ? 'selected' : ''} ${bad?.[0] === v.id ? 'shake' : ''}`}
            onClick={() => { if (!done.includes(v.id)) { setSel(sel === v.id ? null : v.id); sfx('select'); } }}>
            <VocabIcon id={v.id} size={38} />
            <span className="w">{v.word}</span><small>{v.pos}</small>
            <span className="dot" ref={(el) => { wordRefs.current[v.id] = el; }} onPointerDown={(e) => startDrag(e, v.id)} />
          </div>
        ))}
      </div>
      <div className="match-col meanings">
        {meanings.map((id) => (
          <div key={id} data-meaning={id} ref={(el) => { meanRefs.current[id] = el; }}
            className={`meaning-item ${done.includes(id) ? 'done' : ''} ${bad?.[1] === id ? 'shake' : ''} ${sel ? 'armed' : ''}`}
            onClick={() => { if (sel) connect(sel, id); }}>
            {vocabById(id).meaning}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SentenceGame() {
  return (
    <Shell id="m2-sentences" icon="🧩" title="Complete the Sentences"
      instructions="Drag the correct word card into the gap. (Or tap a card, then tap the gap.)"
      intro={<div className="example-box">
        <b>Worked example:</b><br />"I hope to get a <span className="gap filled">doctorate</span> one day, like Dr Faisal."<br />
        ✔ <i>doctorate</i> = the highest university degree. The sentence needs a <b>noun</b> after "a".
      </div>}
      hints={['Read the words before and after the gap. Do you need a verb, a noun, an adjective or a phrase?', 'Look at the word card pictures to help you remember the meaning.']}>
      <SentenceInner />
    </Shell>
  );
}

function SentenceInner() {
  const run = useRun();
  const [order] = useState(() => VOCAB_SENTENCES);
  const [idx, setIdx] = useState(0);
  const [used, setUsed] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string | null>(null);
  const [bank] = useState(() => shuffle(VOCAB.map((v) => v.id)));
  const cur = order[idx];
  const dnd = useDnd((id, zone) => {
    if (zone !== 'gap' || !cur) return;
    if (id === cur.answer) {
      const next = [...used, id];
      setUsed(next);
      run.feedback(`Yes! "${vocabById(id).word}" is correct.`, true);
      window.setTimeout(() => {
        if (idx + 1 >= order.length) run.finish(); else setIdx(idx + 1);
      }, 1100);
    } else {
      run.mistake();
      setWrong(id);
      window.setTimeout(() => setWrong(null), 600);
      run.feedback(`Not quite. ${cur.tip}`, false);
    }
  }, (id) => <div className="word-card">{vocabById(id).word}</div>);

  return (
    <div className="sentences">
      <div className="progress-dots">{order.map((s, i) => <span key={s.id} className={i < idx || used.includes(s.answer) && i === idx ? 'done' : i === idx ? 'cur' : ''} />)}</div>
      <div className="past">
        {order.slice(0, idx).map((s) => <p key={s.id} className="done-sent">✔ {s.before} <b>{vocabById(s.answer).word}</b> {s.after}</p>)}
      </div>
      {cur && (
        <div className="sentence-card pop-in" key={cur.id}>
          <span>{cur.before} </span>
          <span {...dnd.target('gap')} className={`gap ${used.includes(cur.answer) ? 'filled' : ''} ${dnd.selected ? 'armed' : ''}`}>
            {used.includes(cur.answer) ? vocabById(cur.answer).word : '______'}
          </span>
          <span> {cur.after}</span>
        </div>
      )}
      <div className="word-bank">
        {bank.map((id) => {
          const isUsed = used.includes(id);
          const src = dnd.source(id, isUsed);
          return (
            <div key={id} {...src} className={`${src.className} word-card ${isUsed ? 'used' : ''} ${wrong === id ? 'shake' : ''}`}>
              <VocabIcon id={id} size={30} /> {vocabById(id).word}
            </div>
          );
        })}
      </div>
      {dnd.ghost}
    </div>
  );
}
