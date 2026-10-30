// Story & quest controller: reacts to world events and drives missions.
import { bus } from './store';
import {
  game, ui, say, setFlag, flag, addItem, toast, completeChallenge, missionBonus, beginRun, mistake, checkAchievements,
  type DLine, type GameState, type RewardPopup,
} from './state';
import { LISTEN_SCENARIOS, VOCAB, DOCS, UNIVERSITY } from './content';
import { NPC_NAMES } from './looks';
import { sfx } from './audio';

const P = () => ({ speaker: game.get().playerName || 'You', look: game.get().avatar });
const N = (id: string, text: string, expr: DLine['expr'] = 'normal'): DLine => ({ speaker: NPC_NAMES[id] || id, look: id, expr, text });
const ME = (text: string, expr: DLine['expr'] = 'normal'): DLine => ({ ...P(), expr, text });
const NARR = (text: string): DLine => ({ speaker: 'Narrator', text });

export function refreshWorld() {
  bus.emit('refresh');
  bus.emit('objective', objective(game.get()));
}

// ------------------------------------------------------------------ objective
export interface Objective { mission: number; text: string; room: string; ent?: string }

export function objective(s: GameState): Objective {
  const f = s.flags;
  if (!f.m1_talkGate) return { mission: 1, text: 'Talk to Abu Salem, the gatekeeper, at the university gate.', room: 'campus', ent: 'gatekeeper' };
  if (!f.m1_listenStarted) return { mission: 1, text: 'Talk to Ms Hessa, the Listening Coach, in the entrance plaza.', room: 'campus', ent: 'coach' };
  if (!f.m1_listen) {
    if (ui.get().activeScenario) return { mission: 1, text: 'Decide! Walk onto the GOOD LISTENER pad or the POOR LISTENER pad.', room: 'campus' };
    const next = LISTEN_SCENARIOS.find((x) => !s.listenDone.includes(x.id));
    return { mission: 1, text: `Watch the students talk (${s.listenDone.length}/5). Talk to ${next?.name}.`, room: 'campus', ent: next ? `listen-${next.id}` : 'coach' };
  }
  if (!f.m1_lines) return { mission: 1, text: 'Reem looks upset. Talk to her near the bench.', room: 'campus', ent: 'reem' };
  if (!f.m1_proverb) return { mission: 1, text: 'Find Professor Yousef near the palm trees (east side).', room: 'campus', ent: 'professor' };
  if (!f.m1_done) return { mission: 1, text: 'Return to Abu Salem at the gate.', room: 'campus', ent: 'gatekeeper' };
  if (!f.m2_started) return { mission: 2, text: 'Go to the Library (north-west) and talk to Mrs Amal.', room: 'library', ent: 'librarian' };
  if (!f.m2_collect) {
    const next = VOCAB.find((v) => !s.vocab.includes(v.id));
    return { mission: 2, text: `Find the glowing vocabulary records in the library (${s.vocab.length}/7).`, room: 'library', ent: next ? `vocab-${next.id}` : 'librarian' };
  }
  if (!f.m2_done) return { mission: 2, text: 'Take the records to Mrs Amal and repair them.', room: 'library', ent: 'librarian' };
  if (!f.m3_done) return { mission: 3, text: 'Go to the Career Centre (north-east) and help Dr Faisal.', room: 'career', ent: 'faisal' };
  if (!f.m4_form) return { mission: 4, text: 'Go to the Admissions Office (north) and talk to Ms Latifa.', room: 'admissions', ent: 'officer' };
  if (!f.m4_docs) {
    const real = DOCS.filter((d) => d.correct);
    const found = real.filter((d) => s.docsFound.includes(d.id)).length;
    const next = real.find((d) => !s.docsFound.includes(d.id));
    return { mission: 4, text: `Find the 5 application documents in the office (${found}/5).`, room: 'admissions', ent: next ? `find-${next.id}` : 'folder-desk' };
  }
  if (!f.m4_folder) return { mission: 4, text: 'Put your documents into the application folder on the desk.', room: 'admissions', ent: 'folder-desk' };
  if (!f.m4_done) return { mission: 4, text: 'Talk to Ms Latifa about the application checklist.', room: 'admissions', ent: 'officer' };
  if (!f.m5_started) return { mission: 5, text: 'Go to the Writing Hall (west) and talk to Mr Bader.', room: 'writing', ent: 'tutor' };
  if (!f.m5_done) return { mission: 5, text: 'Sit at the writing desk and complete your application letter.', room: 'writing', ent: 'writing-desk' };
  if (!f.final_done) return { mission: 6, text: 'Take your letter to the Admissions Office. The Dean is waiting!', room: 'admissions', ent: 'dean' };
  return { mission: 6, text: 'You did it! Explore freely or replay challenges from your Quest Journal.', room: s.room };
}

// ------------------------------------------------------------------ minigames
let pendingAfterReward: (() => void) | null = null;

export function openGame(id: string, replay = false) {
  beginRun();
  ui.set({ minigame: { id, replay } });
  sfx('open');
}

/** Called by a minigame's reward screen "Continue" button. */
export function finishGame(id: string, replay: boolean) {
  ui.set({ minigame: null, hint: null });
  if (replay) return;
  afterChallenge(id);
}

export function showReward(r: RewardPopup, then?: () => void) {
  pendingAfterReward = then || null;
  ui.set({ reward: r });
  sfx('fanfare');
  bus.emit('celebrate');
}
export function closeReward() {
  ui.set({ reward: null });
  const t = pendingAfterReward;
  pendingAfterReward = null;
  t?.();
  refreshWorld();
}

function afterChallenge(id: string) {
  switch (id) {
    case 'm1-lines':
      setFlag('m1_lines');
      say([
        N('reem', 'Thank you for asking... Actually, I am worried about my exam results. It helps to talk to someone who really listens.', 'happy'),
        ME('You are welcome. I am here if you need me.', 'happy'),
        N('reem', 'Professor Yousef is near the palm trees. He loves sharing wise sayings about communication!'),
      ], refreshWorld);
      break;
    case 'm1-proverb':
      setFlag('m1_proverb');
      say([N('professor', 'Wonderful. You have shown that you listen with your ears, your eyes and your heart. Go back to Abu Salem at the gate.', 'proud')], refreshWorld);
      break;
    case 'm2-match':
      setFlag('m2_match');
      say([N('librarian', 'The records are repaired! Now let us check that you can USE the words. Complete these sentences with the word cards.', 'happy')], () => openGame('m2-sentences'));
      break;
    case 'm2-sentences':
      setFlag('m2_sent');
      setFlag('m2_done');
      addItem('badge-vocab'); addItem('word-crystals');
      missionBonus(2);
      showReward({ title: 'Mission 2 Complete!', text: 'The Career Centre is now open.', items: [{ icon: '📘', name: 'Vocabulary Master Badge' }, { icon: '💎', name: 'Seven Word Crystals' }] }, () => {
        say([N('librarian', 'Thank you! The archive is complete again. Dr Faisal in the Career Centre needs help with a letter. Hurry!', 'happy')]);
      });
      break;
    case 'm3-order':
      setFlag('m3_order');
      say([N('faisal', 'Perfect order! But wait... someone has mixed informal expressions into my notes. Formal letters need formal language!', 'surprised')], () => openGame('m3-formal'));
      break;
    case 'm3-formal':
      setFlag('m3_formal');
      say([N('faisal', 'Excellent. Now be a Reading Detective. Read my letter carefully and find the evidence to answer each question.', 'happy')], () => openGame('m3-detective'));
      break;
    case 'm3-detective':
      setFlag('m3_detective');
      setFlag('m3_done');
      addItem('badge-formal'); addItem('faisal-reference');
      missionBonus(3);
      showReward({ title: 'Mission 3 Complete!', text: 'The Admissions Office is now open.', items: [{ icon: '🖋️', name: 'Formal Writing Badge' }, { icon: '✉️', name: "Dr Faisal's Reference Letter" }] }, () => {
        say([N('faisal', 'You understand formal letters very well. Please take this reference letter. It says you are a careful and helpful student. Good luck at the Admissions Office!', 'happy')]);
      });
      break;
    case 'm4-form':
      setFlag('m4_form');
      addItem('doc-form-filled');
      say([N('officer', 'Your form looks great. Now, an application needs documents. Five important documents are somewhere in this office. Please find them!', 'happy'), N('officer', 'Careful: some papers here are NOT application documents. Then put the correct ones in the folder on my desk.')], refreshWorld);
      break;
    case 'm4-folder':
      setFlag('m4_folder');
      say([N('officer', 'Your folder is ready. One more test: here is Khaled\'s application. It has some problems. Can you find them all?', 'normal')], () => openGame('m4-check'));
      break;
    case 'm4-check':
      setFlag('m4_check');
      setFlag('m4_done');
      addItem('application-folder'); addItem('eligibility-cert');
      missionBonus(4);
      showReward({ title: 'Mission 4 Complete!', text: 'The Writing Hall is now open.', items: [{ icon: '📁', name: 'Application Folder' }, { icon: '📃', name: 'Admission Eligibility Certificate' }] }, () => {
        say([N('officer', 'You are eligible to apply! The last step is the most important: your application letter. Mr Bader in the Writing Hall will help you.', 'happy')]);
      });
      break;
    case 'm5-build':
      setFlag('m5_build');
      say([N('tutor', 'Great structure! Next, choose only the formal sentences. Informal sentences go in the bin.', 'happy')], () => openGame('m5-choose'));
      break;
    case 'm5-choose':
      setFlag('m5_choose');
      say([N('tutor', 'Now it is YOUR turn. Write your own letter. Use the sentence starters and the word bank. You can choose Guided mode if you want more help.', 'happy')], () => openGame('m5-write'));
      break;
    case 'm5-write':
      setFlag('m5_write');
      say([N('tutor', 'Before you submit, check your letter with the review checklist.')], () => openGame('m5-submit'));
      break;
    case 'm5-submit':
      setFlag('m5_submit');
      setFlag('m5_done');
      addItem('final-letter');
      missionBonus(5);
      showReward({ title: 'Mission 5 Complete!', text: 'Your application letter is ready. Take it to the Admissions Office!', items: [{ icon: '✉️', name: 'Your Application Letter' }] }, () => {
        say([N('tutor', 'I am proud of you. Take your letter to the Admissions Office. The Dean wants to see you!', 'proud')]);
      });
      break;
  }
  checkAchievements();
  refreshWorld();
}

// ------------------------------------------------------------------ listening sorting (in-world)
let listenMistakesCarry = 0;

function startScenario(id: string) {
  const sc = LISTEN_SCENARIOS.find((x) => x.id === id)!;
  const partnerLook = `${sc.partner.toLowerCase()}`;
  const lines: DLine[] = sc.lines.map((l) =>
    l.who === 'narrator' ? NARR(l.text)
      : l.who === 'npc' ? { speaker: sc.name, look: sc.id, text: l.text, expr: sc.good ? 'happy' : 'normal' }
      : { speaker: sc.partner, look: partnerLook, text: l.text, expr: sc.id === 'noura' || sc.id === 'dana' ? 'worried' : 'normal' });
  lines.push(NARR(`Was ${sc.name} a GOOD listener or a POOR listener? Walk onto the correct pad.`));
  say(lines, () => { ui.set({ activeScenario: id }); refreshWorld(); });
}

function onZone(pad: string) {
  const id = ui.get().activeScenario;
  if (!id) {
    if (!flag('m1_listen')) toast('Talk to a student first, then choose a pad.', 'info', '💬');
    return;
  }
  const sc = LISTEN_SCENARIOS.find((x) => x.id === id)!;
  const saidGood = pad === 'pad-good';
  if (saidGood === sc.good) {
    sfx('correct');
    bus.emit('celebrate');
    ui.set({ activeScenario: null });
    game.set((s) => ({ listenDone: [...s.listenDone, id] }));
    const done = game.get().listenDone.length;
    say([NARR(`✅ Correct! ${sc.name} is a ${sc.good ? 'GOOD' : 'POOR'} listener. ${sc.explain}`)], () => {
      if (done >= 5) {
        ui.set({ run: { mistakes: listenMistakesCarry, hints: 0 } });
        completeChallenge('m1-listen');
        setFlag('m1_listen');
        say([N('coach', 'Brilliant! You can recognise good and poor listening. Now, a real test: Reem is sitting near the bench. She seems upset. Go and talk to her.', 'happy')], refreshWorld);
      } else refreshWorld();
    });
  } else {
    listenMistakesCarry++;
    mistake();
    say([NARR(`❌ Not quite. Think again about what ${sc.name} did.`), N('coach', sc.good ? `Hint: Did ${sc.name} let the other person speak and try to understand? Try the other pad.` : `Hint: Did ${sc.name} really let the other person finish? Try the other pad.`, 'worried')]);
  }
}

// ------------------------------------------------------------------ interactions
function onInteract(id: string) {
  const s = game.get();
  const f = s.flags;

  if (id.startsWith('listen-')) {
    const sid = id.slice(7);
    if (!f.m1_listenStarted) { say([N(sid, 'Hello! We are just chatting. Ms Hessa, the Listening Coach, can explain the challenge.', 'happy')]); return; }
    if (s.listenDone.includes(sid)) { say([{ speaker: LISTEN_SCENARIOS.find((x) => x.id === sid)!.name, look: sid, expr: 'happy', text: 'Thanks for watching us! Communication is all about listening.' }]); return; }
    if (ui.get().activeScenario && ui.get().activeScenario !== sid) {
      toast('First decide about the last conversation: walk to a pad!', 'warn', '👣');
      return;
    }
    startScenario(sid);
    return;
  }
  if (id.startsWith('partner-')) {
    const pid = id.slice(8);
    const sc = LISTEN_SCENARIOS.find((x) => x.partner.toLowerCase() === pid);
    if (sc && f.m1_listenStarted && !s.listenDone.includes(sc.id)) { onInteract(`listen-${sc.id}`); return; }
    say([{ speaker: pid[0].toUpperCase() + pid.slice(1), look: pid, expr: 'happy', text: 'Good luck with your admission challenge!' }]);
    return;
  }
  if (id.startsWith('vocab-')) {
    const vid = id.slice(6);
    if (s.vocab.includes(vid)) return;
    game.set((st) => ({ vocab: [...st.vocab, vid] }));
    sfx('pickup');
    bus.emit('collect-fx', id);
    toast(`New word card: ${VOCAB.find((v) => v.id === vid)!.word}`, 'item', '💎');
    ui.set({ vocabCard: vid });
    if (game.get().vocab.length >= 7) {
      ui.set({ run: { mistakes: 0, hints: 0 } });
      completeChallenge('m2-collect');
      setFlag('m2_collect');
    }
    refreshWorld();
    return;
  }
  if (id.startsWith('find-')) {
    const did = id.slice(5);
    if (s.docsFound.includes(did)) return;
    game.set((st) => ({ docsFound: [...st.docsFound, did] }));
    sfx('pickup');
    bus.emit('collect-fx', id);
    const d = DOCS.find((x) => x.id === did)!;
    toast(`Found: ${d.name}`, 'item', d.icon);
    const st = game.get();
    if (DOCS.filter((x) => x.correct).every((x) => st.docsFound.includes(x.id)) && !st.flags.m4_docs) {
      setFlag('m4_docs');
      say([NARR('You found all five documents! Now go to the application folder on the desk and organise them.')]);
    }
    refreshWorld();
    return;
  }

  switch (id) {
    case 'gatekeeper':
      if (!f.m1_talkGate) {
        say([
          N('gatekeeper', 'Welcome, future student! Before entering, prove that you know how to communicate and listen effectively.', 'happy'),
          N('gatekeeper', 'This gate opens only for students with excellent communication skills. You have three challenges.'),
          N('gatekeeper', 'First, talk to Ms Hessa, our Listening Coach. She is standing in the middle of the plaza.'),
          ME('I am ready!', 'happy'),
        ], () => { setFlag('m1_talkGate'); refreshWorld(); });
      } else if (!f.m1_proverb) {
        say([N('gatekeeper', 'Keep going! Complete all three communication challenges, then come back to me.')]);
      } else if (!f.m1_done) {
        say([
          N('gatekeeper', 'You listened carefully, you understood hidden feelings, and you learned communication wisdom. Well done!', 'proud'),
          N('gatekeeper', 'Here is your Communication Badge and your University Entrance Pass. The gate is now OPEN!', 'happy'),
        ], () => {
          setFlag('m1_done');
          addItem('badge-communication'); addItem('entrance-pass');
          missionBonus(1);
          bus.emit('gate-open');
          window.setTimeout(() => showReward({ title: 'Mission 1 Complete!', text: 'The university gates are open. Visit the Library next!', items: [{ icon: '🗣️', name: 'Communication Badge' }, { icon: '🎫', name: 'University Entrance Pass' }] }), 2300);
        });
      } else say([N('gatekeeper', 'Welcome to Pearl Bay University! The library is in the north-west corner of the campus.', 'happy')]);
      break;
    case 'coach':
      if (!f.m1_talkGate) { say([N('coach', 'Hello! Please talk to Abu Salem at the gate first.', 'happy')]); break; }
      if (!f.m1_listenStarted) {
        say([
          N('coach', 'Hello! I am Ms Hessa. Today you will watch five students having short conversations.', 'happy'),
          N('coach', 'After each conversation, decide: is the student a GOOD listener or a POOR listener?'),
          N('coach', 'Here is an example. Ali looks at his friend, nods, and waits for her to finish. Ali is a GOOD listener, because he pays attention and does not interrupt.'),
          N('coach', 'To answer, WALK onto the green GOOD LISTENER pad or the coral POOR LISTENER pad. Off you go!', 'happy'),
        ], () => { setFlag('m1_listenStarted'); listenMistakesCarry = 0; refreshWorld(); });
      } else if (!f.m1_listen) {
        say([N('coach', `You have sorted ${s.listenDone.length} of 5 students. Remember: a good listener pays attention, does not interrupt and tries to understand feelings.`)]);
      } else say([N('coach', 'Great listening! Remember: empathy reduces misunderstandings.', 'happy')]);
      break;
    case 'reem':
      if (!f.m1_listen) { say([NARR('Reem sits quietly and looks at the ground.'), N('reem', '...I\'m fine.', 'sad')]); break; }
      if (!f.m1_lines) {
        say([ME('Hi Reem. How are you?'), N('reem', "I'm fine.", 'sad'), NARR('Reem says she is fine. But her face looks upset, her voice is quiet, and she avoids eye contact...')], () => openGame('m1-lines'));
      } else say([N('reem', 'Thanks again for listening. I feel much better now!', 'happy')]);
      break;
    case 'professor':
      if (!f.m1_lines) { say([N('professor', 'Ah, a new student. Help the people around you first, and then we will talk about wisdom.', 'proud')]); break; }
      if (!f.m1_proverb) {
        say([N('professor', 'Welcome, young listener. Let me share an old proverb with you.', 'proud'), N('professor', '"Listen or your tongue will keep you deaf." What do you think it means?')], () => openGame('m1-proverb'));
      } else say([N('professor', 'Remember: we have two ears and one mouth. Listen twice as much as you speak!', 'happy')]);
      break;
    case 'notice-gate':
      say([NARR(`📌 ${UNIVERSITY} – Admission Challenge. Five missions: 1) Communication Gate  2) Vocabulary Archive  3) Formal Letters  4) Application Workshop  5) Final Letter.`), NARR('Tip: Press the 💡 Hint button if you are stuck. Use the 📖 Journal to see your missions.')]);
      break;
    case 'notice-campus':
      say([NARR('🗺️ Campus map: LIBRARY (north-west) · ADMISSIONS (north) · CAREER CENTRE (north-east) · WRITING HALL (west) · STUDENT CAFÉ (east).')]);
      break;
    case 'fountain':
      say([NARR('The fountain sparkles in the sunshine. Some students throw in a coin and make a wish for good grades.'), ME('I wish for a place at this university!', 'happy')]);
      game.set((st) => ({ coins: st.coins + (st.flags.wished ? 0 : 5) }));
      if (!f.wished) { setFlag('wished'); toast('+5 coins for making a wish!', 'xp', '🪙'); }
      break;
    case 'student-a':
      say([{ speaker: 'Yousef', look: 'student1', expr: 'happy', text: 'Tip: In a formal letter, do not use contractions. Write "I am", not "I\'m".' }]);
      break;
    case 'student-b':
      say([{ speaker: 'Haya', look: 'student2', expr: 'happy', text: 'If you do not know the name of the reader, start with "Dear Sir or Madam," and finish with "Yours faithfully,".' }]);
      break;
    case 'student-c':
      say([{ speaker: 'Mubarak', look: 'student3', expr: 'happy', text: 'I applied for Engineering last year. My advice? Send your documents in advance!' }]);
      break;
    // ---- library
    case 'librarian':
      if (!f.m2_started) {
        say([
          N('librarian', 'Oh, thank goodness! A visitor! I am Mrs Amal, the librarian.', 'worried'),
          N('librarian', 'Seven important vocabulary records have disappeared. Every applicant needs these words!'),
          N('librarian', 'The records are glowing somewhere in the library. Please find all seven. When you touch one, you will learn the word.', 'normal'),
        ], () => { setFlag('m2_started'); refreshWorld(); });
      } else if (!f.m2_collect) {
        say([N('librarian', `You have found ${s.vocab.length} of 7 records. Look for things that glow: a heart diagram, a certificate, an envelope, a pile of books, a calendar, a stamped document and a letter.`)]);
      } else if (!f.m2_match) {
        say([N('librarian', 'You found them all! But the records are damaged. The words and meanings are separated. Please connect each word with its meaning.', 'happy')], () => openGame('m2-match'));
      } else if (!f.m2_sent) {
        openGame('m2-sentences');
      } else say([N('librarian', 'The archive is safe thanks to you. Open your backpack to review your word cards any time.', 'happy')]);
      break;
    case 'computer-lib':
      say([NARR('💻 Library database: "An extensive collection of 50,000 books. Please return books in advance of the due date."')]);
      break;
    // ---- career centre
    case 'faisal':
      if (!f.m3_started) {
        say([
          N('faisal', 'Hello there. I am Dr Faisal. I am a cardiac surgeon. I work on the heart.', 'normal'),
          N('faisal', 'I wrote a formal application letter for a hospital job. Oh no! My application letter is completely out of order. Can you help me organise it?', 'worried'),
        ], () => { setFlag('m3_started'); openGame('m3-order'); });
      } else if (!f.m3_order) openGame('m3-order');
      else if (!f.m3_formal) openGame('m3-formal');
      else if (!f.m3_detective) openGame('m3-detective');
      else say([N('faisal', 'Thank you again. I have a job interview next week, in advance of the new hospital opening!', 'happy')]);
      break;
    case 'jobboard':
      say([NARR('📌 JOB ADVERT: Senior Cardiac Surgeon wanted at Al-Noor Cardiac Centre. Applicants must have a doctorate and extensive experience. Please enclose a CV and two references.')]);
      break;
    case 'board-c':
      say([NARR('📋 Formal letter tips: ① Dear Sir or Madam, ② State your purpose ③ Qualifications ④ Reasons ⑤ Enclosed documents ⑥ Thank the reader ⑦ Yours faithfully,')]);
      break;
    case 'pc0':
      say([NARR('💻 The screen says: "A formal letter is polite, clear and organised. Avoid slang, emojis and contractions."')]);
      break;
    // ---- admissions
    case 'officer':
      if (!f.m4_started) {
        say([
          N('officer', 'Welcome to the Admissions Office. I am Ms Latifa.', 'happy'),
          N('officer', 'You are almost ready! But first, you must prepare your university application.'),
          N('officer', 'Let us start with the application form. You may use imaginary information.', 'happy'),
        ], () => { setFlag('m4_started'); openGame('m4-form'); });
      } else if (!f.m4_form) openGame('m4-form');
      else if (!f.m4_docs) say([N('officer', 'Look around the office for the five application documents. They are on the floor, near furniture and plants.')]);
      else if (!f.m4_folder) say([N('officer', 'Now put the correct documents into the folder on the desk to my left.')]);
      else if (!f.m4_check) openGame('m4-check');
      else if (!f.m5_done) say([N('officer', 'Go to the Writing Hall. Mr Bader will help you write your application letter.', 'happy')]);
      else if (!f.final_done) say([N('officer', 'The Dean is waiting for you on the red stage!', 'happy')]);
      else say([N('officer', 'Congratulations again! We will see you in September... in the game, of course!', 'happy')]);
      break;
    case 'folder-desk':
      if (!f.m4_form) { say([NARR('An empty application folder. Talk to Ms Latifa first.')]); break; }
      if (!f.m4_docs) { say([NARR(`An empty application folder. You still need to find more documents (${DOCS.filter((d) => d.correct && s.docsFound.includes(d.id)).length}/5).`)]); break; }
      if (!f.m4_folder) openGame('m4-folder');
      else say([NARR('Your application folder is complete and organised. 📁')]);
      break;
    case 'printer':
      say([NARR('🖨️ The printer is printing a copy of an attestation... beep beep!')]);
      break;
    case 'dean':
      say([
        N('dean', `Hello ${s.playerName}. I am Dr Munira, the Dean of ${UNIVERSITY}.`, 'happy'),
        N('dean', 'I have read your application letter and your documents.'),
        N('dean', 'Congratulations! You have demonstrated excellent communication skills and completed your university application!', 'proud'),
      ], () => {
        setFlag('final_done');
        addItem('admission-cert');
        checkAchievements();
        ui.set({ screen: 'final' });
      });
      break;
    // ---- writing hall
    case 'tutor':
      if (!f.m5_started) {
        say([
          N('tutor', 'Welcome to the Writing Hall! I am Mr Bader. This is your final mission.', 'happy'),
          N('tutor', 'You will write a formal application letter to the university. We will do it step by step, so do not worry.'),
          N('tutor', 'Sit at the writing desk in the middle of the hall when you are ready.'),
        ], () => { setFlag('m5_started'); refreshWorld(); });
      } else if (!f.m5_done) say([N('tutor', 'Sit at the writing desk to continue your letter. You can do it!')]);
      else say([N('tutor', 'Your letter is excellent. Now go to the Admissions Office!', 'proud')]);
      break;
    case 'writing-desk':
      if (!f.m5_started) { say([NARR('A quiet writing desk. Talk to Mr Bader first.')]); break; }
      if (!f.m5_build) openGame('m5-build');
      else if (!f.m5_choose) openGame('m5-choose');
      else if (!f.m5_write) openGame('m5-write');
      else if (!f.m5_submit) openGame('m5-submit');
      else openGame('m5-write', true);
      break;
    case 'board-w':
      say([NARR('📋 Useful formal phrases: "I am writing to apply for..." · "I am currently studying..." · "Please find enclosed..." · "I look forward to hearing from you."')]);
      break;
    default:
      break;
  }
}

export function initLogic() {
  bus.on('interact', onInteract);
  bus.on('zone', onZone);
  bus.on('locked', (msg: string) => toast(msg, 'warn', '🔒'));
  bus.on('scene-ready', () => bus.emit('objective', objective(game.get())));
}

export function resetListenCarry() { listenMistakesCarry = 0; }
