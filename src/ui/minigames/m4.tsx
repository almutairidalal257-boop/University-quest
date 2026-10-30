import { useState } from 'react';
import { Shell, useRun, useDnd, shuffle, Ar } from '../common';
import { COURSES, DOCS, CHECKLIST_ITEMS, UNIVERSITY } from '../../game/content';
import { useStore } from '../../game/store';
import { game, ui, type AppForm } from '../../game/state';
import { sfx } from '../../game/audio';

export function FormGame() {
  return (
    <Shell id="m4-form" icon="📝" title="Complete the Application Form" wide
      instructions={<>Fill in the form. You can use <b>imaginary</b> information. Fields with * are required. Choose a <b><Ar term="course">course</Ar></b> from the catalogue.</>}
      hints={['Names start with a CAPITAL letter, for example: Sara, Al-Ahmad.', 'An email address needs @ and a dot, for example: sara.ali@mail.kw. A Kuwaiti phone number has 8 digits.']}>
      <FormInner />
    </Shell>
  );
}

const validators: Partial<Record<keyof AppForm, (v: any, f: AppForm) => string | null>> = {
  firstName: (v) => (!v.trim() ? 'Please write your first name.' : !/^[A-Z]/.test(v.trim()) ? 'A name starts with a capital letter.' : /[0-9]/.test(v) ? 'A name cannot contain numbers.' : null),
  surname: (v) => (!v.trim() ? 'Please write your surname (family name).' : !/^[A-Z]/.test(v.trim()) ? 'A surname starts with a capital letter.' : null),
  email: (v) => (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? 'Write a valid email, e.g. name@mail.kw' : null),
  phone: (v) => (!/^\d{8}$/.test(v.replace(/\s/g, '')) ? 'A Kuwaiti phone number has 8 digits.' : null),
  course: (v) => (!v ? 'Choose a course from the catalogue.' : null),
  mode: (v) => (!v ? 'Choose full-time or part-time.' : null),
  qualification: (v) => (!v ? 'Choose your qualification.' : null),
  school: (v) => (!v.trim() ? 'Write the name of your school (it can be imaginary).' : null),
  subjects: (v) => (!v.trim() ? 'Write your main subjects, e.g. Mathematics, English.' : null),
  declaration: (v) => (!v ? 'Please tick the declaration box.' : null),
};

function FormInner() {
  const run = useRun();
  const g = useStore(game);
  const [f, setF] = useState<AppForm>({ ...g.form });
  const [errors, setErrors] = useState<Partial<Record<keyof AppForm, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const set = <K extends keyof AppForm>(k: K, v: AppForm[K]) => { setF((p) => ({ ...p, [k]: v })); if (submitted) setErrors((e) => ({ ...e, [k]: validators[k]?.(v, f) || undefined })); };
  const submit = () => {
    setSubmitted(true);
    const errs: Partial<Record<keyof AppForm, string>> = {};
    (Object.keys(validators) as (keyof AppForm)[]).forEach((k) => { const e = validators[k]!(f[k], f); if (e) errs[k] = e; });
    setErrors(errs);
    const n = Object.keys(errs).length;
    if (n) { run.mistake(); run.feedback(`${n} field${n > 1 ? 's need' : ' needs'} attention. Look for the red messages.`, false); return; }
    const course = COURSES.find((c) => c.id === f.course)!;
    game.set((s) => ({ form: f, letter: { ...s.letter, course: course.name, name: s.letter.name || `${f.firstName} ${f.surname}` } }));
    run.feedback('Your application form is complete!', true);
    run.finish();
  };
  const field = (k: keyof AppForm, label: React.ReactNode, el: React.ReactNode, ex?: string) => (
    <label className={`f-field ${errors[k] ? 'err' : ''}`}>
      <span className="f-label">{label}</span>{el}
      {ex && !errors[k] && <small className="f-ex">e.g. {ex}</small>}
      {errors[k] && <small className="f-err">⚠ {errors[k]}</small>}
    </label>
  );
  return (
    <div className="form-layout">
      <div className="app-form">
        <div className="form-head"><span className="crest">🎓</span><div><b>{UNIVERSITY.toUpperCase()}</b><small>Undergraduate Application Form · 2026/2027</small></div></div>
        <fieldset><legend>Section A – Personal details</legend>
          <div className="f-row">
            {field('firstName', 'First name *', <input value={f.firstName} onChange={(e) => set('firstName', e.target.value)} />, 'Sara')}
            {field('surname', <><Ar term="surname">Surname</Ar> *</>, <input value={f.surname} onChange={(e) => set('surname', e.target.value)} />, 'Al-Ahmad')}
          </div>
          <div className="f-row">
            {field('email', 'Email *', <input value={f.email} onChange={(e) => set('email', e.target.value)} inputMode="email" />, 'sara@mail.kw')}
            {field('phone', 'Phone *', <input value={f.phone} onChange={(e) => set('phone', e.target.value)} inputMode="numeric" maxLength={9} />, '55512345')}
          </div>
        </fieldset>
        <fieldset><legend>Section B – Course</legend>
          {field('course', 'Course title *', <select value={f.course} onChange={(e) => set('course', e.target.value)}><option value="">– choose –</option>{COURSES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>)}
          <div className={`f-field ${errors.mode ? 'err' : ''}`}>
            <span className="f-label">Mode of study *</span>
            <div className="radio-row">
              {(['full-time', 'part-time'] as const).map((m) => <label key={m} className={`radio ${f.mode === m ? 'on' : ''}`}><input type="radio" checked={f.mode === m} onChange={() => set('mode', m)} /> <Ar term={m}>{m === 'full-time' ? 'Full-time' : 'Part-time'}</Ar></label>)}
            </div>
            {errors.mode && <small className="f-err">⚠ {errors.mode}</small>}
          </div>
        </fieldset>
        <fieldset><legend>Section C – Academic <Ar term="qualifications">qualifications</Ar></legend>
          <div className="f-row">
            {field('qualification', 'Qualification *', <select value={f.qualification} onChange={(e) => set('qualification', e.target.value)}><option value="">– choose –</option><option>Secondary School Certificate (Grade 12, expected)</option><option>Grade 11 report (in progress)</option><option>IGCSE / International certificate</option></select>)}
            {field('grade', 'Expected grade', <select value={f.grade} onChange={(e) => set('grade', e.target.value)}><option value="">– choose –</option><option>Excellent (90%+)</option><option>Very good (80–89%)</option><option>Good (70–79%)</option></select>)}
          </div>
          <div className="f-row">
            {field('school', 'School name *', <input value={f.school} onChange={(e) => set('school', e.target.value)} />, 'Al-Noor Secondary School')}
            {field('subjects', 'Main subjects *', <input value={f.subjects} onChange={(e) => set('subjects', e.target.value)} />, 'Mathematics, English, Physics')}
          </div>
        </fieldset>
        <fieldset><legend>Section D – Other relevant information</legend>
          {field('other', 'Hobbies, volunteering, awards (optional)', <textarea rows={2} value={f.other} onChange={(e) => set('other', e.target.value)} />, 'I volunteer at a charity. I won a reading competition.')}
          <label className={`check ${errors.declaration ? 'err' : ''}`}><input type="checkbox" checked={f.declaration} onChange={(e) => set('declaration', e.target.checked)} /> I confirm that the information in this form is correct. *</label>
          {errors.declaration && <small className="f-err">⚠ {errors.declaration}</small>}
        </fieldset>
        <button className="btn primary big" onClick={submit}>Submit form ✔</button>
      </div>
      <div className="catalogue">
        <h4>📘 Course catalogue</h4>
        {COURSES.map((c) => (
          <div key={c.id} className={`course-card ${f.course === c.id ? 'chosen' : ''}`}>
            <div className="c-top"><span className="c-icon">{c.icon}</span><b>{c.name}</b><small>{c.years} years</small></div>
            <p>{c.desc}</p><p className="needs">Needs: {c.needs}</p>
            <button className="btn small" onClick={() => { set('course', c.id); sfx('select'); }}>{f.course === c.id ? '✔ Chosen' : 'Choose'}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FolderGame() {
  return (
    <Shell id="m4-folder" icon="📁" title="Collect the Required Documents"
      instructions="Put the 5 application documents into the folder. Put anything that is not needed into the tray."
      hints={['An application needs: certificate, attestation, reference letter, application form and personal statement.', 'Comics and receipts are not part of an application!']}>
      <FolderInner />
    </Shell>
  );
}

function FolderInner() {
  const run = useRun();
  const u = useStore(ui);
  const g = useStore(game);
  const [docs] = useState(() => shuffle(u.minigame?.replay ? DOCS : DOCS.filter((d) => g.docsFound.includes(d.id) || d.correct)));
  const [inFolder, setInFolder] = useState<string[]>([]);
  const [inTray, setInTray] = useState<string[]>([]);
  const [shake, setShake] = useState<string | null>(null);
  const dnd = useDnd((id, zone) => {
    const d = DOCS.find((x) => x.id === id)!;
    if ((zone === 'folder') === d.correct) {
      const f = zone === 'folder' ? [...inFolder, id] : inFolder;
      const t = zone === 'tray' ? [...inTray, id] : inTray;
      setInFolder(f); setInTray(t);
      run.feedback(d.correct ? `${d.name}: ${d.desc}` : `Right – ${d.desc}`, true);
      if (f.length + t.length === docs.length) run.finish();
    } else {
      run.mistake();
      setShake(id); window.setTimeout(() => setShake(null), 500);
      run.feedback(d.correct ? `${d.name} IS important: ${d.desc}` : `${d.name}? ${d.desc}`, false);
    }
  }, (id) => { const d = DOCS.find((x) => x.id === id)!; return <div className="doc-card">{d.icon} {d.name}</div>; });
  const left = docs.filter((d) => !inFolder.includes(d.id) && !inTray.includes(d.id));
  return (
    <div className="folder-layout">
      <div className="desk-docs">
        {left.map((d) => { const src = dnd.source(d.id); return <div key={d.id} {...src} className={`${src.className} doc-card ${shake === d.id ? 'shake' : ''}`}><span className="doc-icon">{d.icon}</span>{d.name}</div>; })}
        {left.length === 0 && <div className="all-done">🎉 Desk is clear!</div>}
      </div>
      <div className="folder-zones">
        <div {...dnd.target('folder')} className={`app-folder ${dnd.selected ? 'armed' : ''}`}>
          <div className="folder-tab">APPLICATION</div>
          <b>📁 Application folder ({inFolder.length}/5)</b>
          <ul>{inFolder.map((id) => { const d = DOCS.find((x) => x.id === id)!; return <li key={id} className="pop-in">{d.icon} {d.name}</li>; })}</ul>
        </div>
        <div {...dnd.target('tray')} className={`tray ${dnd.selected ? 'armed' : ''}`}>
          <b>🗃️ Not needed</b>
          <ul>{inTray.map((id) => { const d = DOCS.find((x) => x.id === id)!; return <li key={id}>{d.icon} {d.name}</li>; })}</ul>
        </div>
      </div>
      {dnd.ghost}
    </div>
  );
}

export function CheckGame() {
  return (
    <Shell id="m4-check" icon="🕵️" title="The Application Checklist" wide
      instructions="Khaled's application has 7 problems. Click each problem: missing information, informal expressions and missing documents."
      intro={<div className="example-box"><b>Worked example:</b> If a form says <i>Email: (empty)</i>, that is <b>missing information</b>. If a letter says <i>"Yo!"</i>, that is an <b>informal expression</b>. If the folder has no certificate, that is a <b>missing document</b>.</div>}
      hints={['Look for empty boxes in the form: there are 2.', 'In the letter, 3 sentences are too casual. In the documents list, look for ✖.']}>
      <CheckInner />
    </Shell>
  );
}

function CheckInner() {
  const run = useRun();
  const [found, setFound] = useState<string[]>([]);
  const [ok, setOk] = useState<string[]>([]);
  const total = CHECKLIST_ITEMS.filter((x) => x.problem).length;
  const click = (id: string) => {
    const it = CHECKLIST_ITEMS.find((x) => x.id === id)!;
    if (found.includes(id) || ok.includes(id)) return;
    if (it.problem) {
      const n = [...found, id];
      setFound(n);
      run.feedback(it.fix, true);
      if (n.length === total) run.finish();
    } else {
      setOk([...ok, id]);
      run.mistake();
      run.feedback(`${it.fix} Look for a real problem.`, false);
    }
  };
  const kinds = ['Missing information', 'Informal expression', 'Missing document'];
  const item = (x: typeof CHECKLIST_ITEMS[number]) => (
    <button key={x.id} className={`chk-item ${found.includes(x.id) ? 'problem' : ''} ${ok.includes(x.id) ? 'fine' : ''}`} onClick={() => click(x.id)}>
      {x.label && <span className="lbl">{x.label}:</span>} <span>{x.text}</span>
      {found.includes(x.id) && <span className="fix pop-in">🔴 {x.fix}</span>}
    </button>
  );
  return (
    <div className="check-layout">
      <div className="chk-panel"><h4>📝 Form</h4>{CHECKLIST_ITEMS.filter((x) => x.zone === 'form').map(item)}</div>
      <div className="chk-panel letter"><h4>✉️ Letter</h4>{CHECKLIST_ITEMS.filter((x) => x.zone === 'letter').map(item)}</div>
      <div className="chk-panel"><h4>📁 Documents</h4>{CHECKLIST_ITEMS.filter((x) => x.zone === 'docs').map(item)}
        <div className="tally">
          {kinds.map((k) => { const all = CHECKLIST_ITEMS.filter((x) => x.kind === k); const f = all.filter((x) => found.includes(x.id)).length; return <div key={k} className={f === all.length ? 'complete' : ''}>{f === all.length ? '✅' : '⬜'} {k}: {f}/{all.length}</div>; })}
        </div>
      </div>
    </div>
  );
}
