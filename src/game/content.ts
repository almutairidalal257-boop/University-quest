// All educational content lives here so teachers can edit it in one place.

export const UNIVERSITY = 'Pearl Bay University';

// ---------------------------------------------------------------- Vocabulary
export interface VocabWord {
  id: string;
  word: string;
  pos: string;
  meaning: string;
  example: string;
  arabic: string;
  object: string; // what the glowing object in the library looks like
}

export const VOCAB: VocabWord[] = [
  {
    id: 'attestation',
    word: 'attestation',
    pos: 'noun',
    meaning: 'a formal or legal statement confirming something is true',
    example: 'The ministry gave me an attestation to confirm that my certificate is genuine.',
    arabic: 'تصديق / شهادة رسمية',
    object: 'a signed and stamped official document',
  },
  {
    id: 'cardiac',
    word: 'cardiac',
    pos: 'adjective',
    meaning: 'relating to the heart',
    example: 'Dr Faisal is a cardiac surgeon. He operates on the heart.',
    arabic: 'قلبي (متعلق بالقلب)',
    object: 'a diagram of the heart',
  },
  {
    id: 'doctorate',
    word: 'doctorate',
    pos: 'noun',
    meaning: 'the highest university degree awarded in a field of study',
    example: 'She studied for five more years to get a doctorate in chemistry.',
    arabic: 'دكتوراه',
    object: 'a graduation certificate',
  },
  {
    id: 'enclose',
    word: 'enclose',
    pos: 'verb',
    meaning: 'to include something in an envelope with a letter',
    example: 'I enclose a copy of my certificate with this letter.',
    arabic: 'يُرفق',
    object: 'an envelope',
  },
  {
    id: 'extensive',
    word: 'extensive',
    pos: 'adjective',
    meaning: 'large in amount or covering many details',
    example: 'The library has an extensive collection of English books.',
    arabic: 'واسع / شامل',
    object: 'a huge pile of books',
  },
  {
    id: 'in-advance',
    word: 'in advance',
    pos: 'phrase',
    meaning: 'before something happens',
    example: 'Please send your documents in advance, before the deadline.',
    arabic: 'مُسبقاً',
    object: 'a calendar',
  },
  {
    id: 'reference',
    word: 'reference',
    pos: 'noun',
    meaning: "a source of information, or a person who can confirm someone's abilities",
    example: 'My English teacher wrote a reference for my university application.',
    arabic: 'مرجع / خطاب توصية',
    object: 'a letter of recommendation',
  },
];

export const vocabById = (id: string) => VOCAB.find((v) => v.id === id)!;

export const VOCAB_SENTENCES: { id: string; before: string; after: string; answer: string; tip: string }[] = [
  { id: 's1', before: 'The university asked me to', after: 'my certificates with my application.', answer: 'enclose', tip: 'We need a verb meaning "put inside an envelope with a letter".' },
  { id: 's2', before: 'She has', after: 'experience in teaching.', answer: 'extensive', tip: 'We need an adjective meaning "a lot of / large in amount".' },
  { id: 's3', before: 'Please submit your documents', after: '.', answer: 'in-advance', tip: 'We need a phrase meaning "before something happens".' },
  { id: 's4', before: 'The doctor specialises in', after: 'surgery.', answer: 'cardiac', tip: 'Which word is connected to the heart?' },
  { id: 's5', before: 'After many years of research, he received a', after: 'in medicine.', answer: 'doctorate', tip: 'This is the highest university degree.' },
  { id: 's6', before: 'My teacher wrote a', after: 'letter to support my application.', answer: 'reference', tip: 'This is a letter from a person who can confirm your abilities.' },
  { id: 's7', before: 'The ministry stamped an official', after: 'to confirm that my certificate is genuine.', answer: 'attestation', tip: 'This is a formal statement saying something is true.' },
];

// ------------------------------------------------------------- Mission 1
export interface ListenScenario {
  id: string;
  name: string;
  partner: string;
  good: boolean;
  lines: { who: 'npc' | 'partner' | 'narrator'; text: string }[];
  explain: string;
}

export const LISTEN_SCENARIOS: ListenScenario[] = [
  {
    id: 'sara',
    name: 'Sara',
    partner: 'Lulwa',
    good: true,
    lines: [
      { who: 'partner', text: 'I am so nervous about my university interview next week.' },
      { who: 'narrator', text: 'Sara looks at Lulwa, nods, and waits quietly for her to finish.' },
      { who: 'npc', text: 'I understand. Tell me more. What worries you the most?' },
    ],
    explain: 'Sara listens carefully and does not interrupt. She lets her friend finish speaking.',
  },
  {
    id: 'noura',
    name: 'Noura',
    partner: 'Fatma',
    good: false,
    lines: [
      { who: 'partner', text: 'Noura, I wanted to tell you about my—' },
      { who: 'npc', text: 'Oh! That reminds me of MY weekend! We went to the beach, and then the mall, and then...' },
      { who: 'narrator', text: 'Noura talks and talks. Fatma never gets a chance to speak.' },
    ],
    explain: 'Noura talks continuously and does not let her friend speak. A good listener gives others time to talk.',
  },
  {
    id: 'maryam',
    name: 'Maryam',
    partner: 'Ahmad',
    good: true,
    lines: [
      { who: 'partner', text: 'The library closes at five on Thursday, and the exam room is B-12...' },
      { who: 'npc', text: 'Sorry, could you repeat the room number, please? I want to be sure.' },
      { who: 'partner', text: 'Of course. It is B-12.' },
    ],
    explain: 'Maryam asks the speaker to repeat. This shows she wants to understand correctly. That is good listening!',
  },
  {
    id: 'dana',
    name: 'Dana',
    partner: 'Bashayer',
    good: false,
    lines: [
      { who: 'partner', text: 'Dana, I was late today because—' },
      { who: 'npc', text: 'Because you are lazy! You are always late. I do not want to hear excuses.' },
      { who: 'narrator', text: "Dana judged her friend before she heard the explanation. (Bashayer's bus had broken down.)" },
    ],
    explain: 'Dana judges her friend before hearing the explanation. A good listener waits and keeps an open mind.',
  },
  {
    id: 'huda',
    name: 'Huda',
    partner: 'Shahad',
    good: true,
    lines: [
      { who: 'partner', text: 'I did not get the grade I wanted in Maths...' },
      { who: 'npc', text: 'That must feel really disappointing. I can see you worked hard.' },
      { who: 'narrator', text: 'Huda tries to understand how Shahad feels. This is called empathy.' },
    ],
    explain: "Huda tries to understand her friend's feelings. Empathy reduces misunderstandings.",
  },
];

export const LINES_QUESTION = {
  prompt: 'Reem says, "I\'m fine." But she looks upset and avoids eye contact. What might Reem really be feeling?',
  options: [
    { text: 'She is very happy and relaxed.', correct: false, feedback: 'Look again! Her face looks upset and she avoids eye contact. Happy people usually smile and look at you.' },
    { text: 'She may be sad or worried, but she does not want to say it.', correct: true, feedback: 'Excellent! Her words say "fine", but her body language says something else. This is listening between the lines.' },
    { text: 'She is angry because you are standing near her bench.', correct: false, feedback: 'There is no sign that she is angry with you. Her sad face and lowered eyes suggest she is upset or worried.' },
  ],
  followUp: {
    prompt: 'What should a good listener do now?',
    options: [
      { text: 'Say "OK!" and walk away quickly.', correct: false, feedback: 'Walking away ignores her hidden message. Try to show that you care.' },
      { text: 'Gently ask, "Are you sure? I am here if you want to talk."', correct: true, feedback: 'Perfect! You showed empathy and gave her space to share her feelings.' },
      { text: 'Tell her about your own problems instead.', correct: false, feedback: 'That changes the topic to you. A good listener lets the other person express their feelings.' },
    ],
  },
  cues: [
    { icon: '😔', label: 'Facial expression', text: 'Her face looks sad, not happy.' },
    { icon: '👀', label: 'Eye contact', text: 'She looks down and avoids your eyes.' },
    { icon: '🗣️', label: 'Tone of voice', text: 'Her voice is quiet and flat.' },
  ],
};

export const PROVERB = {
  text: 'Listen or your tongue will keep you deaf.',
  origin: 'A Native American proverb',
  options: [
    { letter: 'A', text: 'Always speak loudly.', correct: false, feedback: 'No. The proverb is about listening, not speaking loudly.' },
    { letter: 'B', text: 'Listen carefully and allow others to finish speaking.', correct: true, feedback: 'Correct! If you talk all the time, you cannot hear (learn from) others.' },
    { letter: 'C', text: 'Avoid talking to others.', correct: false, feedback: 'Not quite. The proverb does not say "never talk". It says: listen first!' },
  ],
  ideas: [
    'Communication builds emotional and intellectual connections between people.',
    'Listening between the lines means understanding hidden messages.',
    'Empathy (understanding feelings) reduces misunderstandings.',
    'A good listener lets others express their ideas.',
  ],
};

// ------------------------------------------------------------- Mission 3
export const FAISAL = {
  name: 'Dr Faisal Al-Rashidi',
  hospital: 'Al-Noor Cardiac Centre',
};

export const FAISAL_PARAGRAPHS = [
  {
    id: 'p1',
    label: 'Purpose for writing',
    text: 'I am writing to apply for a position at Al-Noor Cardiac Centre. I would like to be considered for the post of Senior Cardiac Surgeon, as advertised on your website.',
  },
  {
    id: 'p2',
    label: 'Qualifications and experience',
    text: 'I hold a doctorate in cardiac surgery from a university in the United Kingdom. I have eight years of extensive experience in a large teaching hospital in London.',
  },
  {
    id: 'p3',
    label: 'Reasons for applying',
    text: 'I would like to return to Kuwait to be closer to my family and to serve patients in my home country. Your centre has an excellent reputation for heart care.',
  },
  {
    id: 'p4',
    label: 'Enclosed documents and references',
    text: 'I am enclosing my curriculum vitae and an attestation of my qualifications. Two senior surgeons have agreed to act as references.',
  },
  {
    id: 'p5',
    label: 'Thanking and conclusion',
    text: 'Thank you in advance for considering my application. I look forward to hearing from you.',
  },
];

export const FORMAL_PAIRS = [
  { informal: 'Hey!', formal: 'Dear Sir or Madam,' },
  { informal: 'I want this job.', formal: 'I wish to apply for this position.' },
  { informal: "Here's my CV.", formal: 'I am enclosing my curriculum vitae.' },
  { informal: 'Thanks a lot!', formal: 'Thank you for your consideration.' },
  { informal: 'Bye!', formal: 'Yours faithfully,' },
];

// Letter sentences for the Reading Detective board
export const DETECTIVE_LETTER: { id: string; text: string }[] = [
  { id: 'greet', text: 'Dear Sir or Madam,' },
  { id: 'purpose', text: 'I am writing to apply for a position at Al-Noor Cardiac Centre.' },
  { id: 'post', text: 'I would like to be considered for the post of Senior Cardiac Surgeon, as advertised on your website.' },
  { id: 'qual', text: 'I hold a doctorate in cardiac surgery from a university in the United Kingdom.' },
  { id: 'exp', text: 'I have eight years of extensive experience in a large teaching hospital in London.' },
  { id: 'why', text: 'I would like to return to Kuwait to be closer to my family and to serve patients in my home country.' },
  { id: 'rep', text: 'Your centre has an excellent reputation for heart care.' },
  { id: 'docs', text: 'I am enclosing my curriculum vitae and an attestation of my qualifications.' },
  { id: 'refs', text: 'Two senior surgeons have agreed to act as references.' },
  { id: 'thanks', text: 'Thank you in advance for considering my application.' },
  { id: 'forward', text: 'I look forward to hearing from you.' },
  { id: 'close', text: 'Yours faithfully,' },
  { id: 'sign', text: 'Dr Faisal Al-Rashidi' },
];

export const DETECTIVE_QUESTIONS: { id: string; q: string; evidence: string[]; answer: string; hint: string }[] = [
  { id: 'q1', q: 'What is the purpose of his letter?', evidence: ['purpose'], answer: 'To apply for a job at Al-Noor Cardiac Centre.', hint: 'Look for "I am writing to..." near the beginning.' },
  { id: 'q2', q: 'Which position is he applying for?', evidence: ['post'], answer: 'Senior Cardiac Surgeon.', hint: 'Look for the word "post".' },
  { id: 'q3', q: 'What qualification does he hold?', evidence: ['qual'], answer: 'A doctorate in cardiac surgery.', hint: 'Look for "I hold...".' },
  { id: 'q4', q: 'Why does he want to return to Kuwait?', evidence: ['why'], answer: 'To be closer to his family and to serve patients in his home country.', hint: 'Look for "return to Kuwait".' },
  { id: 'q5', q: 'What documents does he enclose?', evidence: ['docs'], answer: 'His curriculum vitae (CV) and an attestation of his qualifications.', hint: 'Look for the word "enclosing".' },
  { id: 'q6', q: 'What makes his letter formal?', evidence: ['greet', 'close', 'thanks', 'forward'], answer: 'Formal greeting and closing, polite phrases, and no slang or contractions.', hint: 'Look at the greeting at the top or the closing at the bottom.' },
];

// ------------------------------------------------------------- Mission 4
export const COURSES = [
  { id: 'medicine', name: 'Medicine', icon: '🩺', years: 7, desc: 'Learn to diagnose and treat patients. Includes hospital training.', needs: 'Excellent grades in Biology and Chemistry.' },
  { id: 'engineering', name: 'Engineering', icon: '⚙️', years: 5, desc: 'Design bridges, machines and energy systems for the future.', needs: 'Strong Mathematics and Physics.' },
  { id: 'computer-science', name: 'Computer Science', icon: '💻', years: 4, desc: 'Programming, artificial intelligence and app design.', needs: 'Good Mathematics and problem-solving skills.' },
  { id: 'business', name: 'Business Administration', icon: '📊', years: 4, desc: 'Management, marketing and starting your own company.', needs: 'Good Mathematics and English.' },
  { id: 'english-literature', name: 'English Literature', icon: '📖', years: 4, desc: 'Novels, poetry, drama and creative writing in English.', needs: 'A love of reading and very good English.' },
];

export const DOCS = [
  { id: 'doc-certificate', name: 'Academic certificate', icon: '📜', correct: true, desc: 'Shows your school grades and qualifications.' },
  { id: 'doc-attestation', name: 'Attestation', icon: '🔏', correct: true, desc: 'An official stamp confirming that your certificate is genuine.' },
  { id: 'doc-reference', name: 'Reference letter', icon: '✉️', correct: true, desc: 'A teacher confirms your abilities and character.' },
  { id: 'doc-form', name: 'Application form', icon: '📝', correct: true, desc: 'Your personal details and chosen course.' },
  { id: 'doc-statement', name: 'Personal statement', icon: '🗒️', correct: true, desc: 'Explains why you want to study this course.' },
  { id: 'decoy-comic', name: 'Comic book', icon: '📗', correct: false, desc: 'Fun to read, but not part of an application.' },
  { id: 'decoy-receipt', name: 'Shopping receipt', icon: '🧾', correct: false, desc: 'A receipt for snacks. Not needed!' },
];

// Khaled's incomplete application for the checklist challenge
export const CHECKLIST_ITEMS: { id: string; zone: 'form' | 'letter' | 'docs'; text: string; label?: string; problem: boolean; fix: string; kind?: string }[] = [
  { id: 'f-first', zone: 'form', label: 'First name', text: 'Khaled', problem: false, fix: 'This is fine.' },
  { id: 'f-surname', zone: 'form', label: 'Surname', text: '(empty)', problem: true, fix: 'Missing information: the surname is empty.', kind: 'Missing information' },
  { id: 'f-email', zone: 'form', label: 'Email', text: 'khaled.a@mail.kw', problem: false, fix: 'This is fine.' },
  { id: 'f-course', zone: 'form', label: 'Course title', text: '(not chosen)', problem: true, fix: 'Missing information: he did not choose a course.', kind: 'Missing information' },
  { id: 'f-mode', zone: 'form', label: 'Study mode', text: 'Full-time', problem: false, fix: 'This is fine.' },
  { id: 'l-greet', zone: 'letter', text: 'Hey there,', problem: true, fix: 'Informal greeting. Use "Dear Sir or Madam,".', kind: 'Informal expression' },
  { id: 'l-purpose', zone: 'letter', text: 'I am writing to apply for a place at your university.', problem: false, fix: 'This sentence is formal and clear.' },
  { id: 'l-wanna', zone: 'letter', text: 'I wanna study here coz it is cool.', problem: true, fix: 'Informal: use "I would like to study here because of your excellent reputation."', kind: 'Informal expression' },
  { id: 'l-subjects', zone: 'letter', text: 'My favourite subjects are Mathematics and English.', problem: false, fix: 'This sentence is fine.' },
  { id: 'l-thanks', zone: 'letter', text: 'Thanks a lot!!', problem: true, fix: 'Informal: use "Thank you for considering my application."', kind: 'Informal expression' },
  { id: 'l-close', zone: 'letter', text: 'Yours faithfully, Khaled', problem: false, fix: 'This closing is formal and correct.' },
  { id: 'd-cert', zone: 'docs', text: 'Academic certificate ✔ in folder', problem: false, fix: 'This document is included.' },
  { id: 'd-attest', zone: 'docs', text: 'Attestation ✖ not in folder', problem: true, fix: 'Missing document: the attestation.', kind: 'Missing document' },
  { id: 'd-form', zone: 'docs', text: 'Application form ✔ in folder', problem: false, fix: 'This document is included.' },
  { id: 'd-ref', zone: 'docs', text: 'Reference letter ✖ not in folder', problem: true, fix: 'Missing document: the reference letter.', kind: 'Missing document' },
];

// ------------------------------------------------------------- Mission 5
export const LETTER_PARTS = [
  { id: 0, title: 'Paragraph 1', purpose: 'Purpose for writing and course applied for', starter: 'I am writing to apply for a place on the', icon: '🎯' },
  { id: 1, title: 'Paragraph 2', purpose: 'Personal qualifications and experience', starter: 'I am currently completing my secondary education', icon: '🏅' },
  { id: 2, title: 'Paragraph 3', purpose: 'Reasons for choosing the university', starter: 'The main reason for choosing your university is', icon: '🏛️' },
  { id: 3, title: 'Paragraph 4', purpose: 'Documents enclosed', starter: 'I am enclosing', icon: '📎' },
  { id: 4, title: 'Paragraph 5', purpose: 'Conclusion and thanks', starter: 'Thank you in advance for considering my application.', icon: '🤝' },
];

export const BUILD_SENTENCES: { text: string; para: number }[] = [
  { text: 'I am writing to apply for a place on the Computer Science course.', para: 0 },
  { text: 'I saw your advertisement on the university website.', para: 0 },
  { text: 'I am currently completing my secondary education.', para: 1 },
  { text: 'My favourite subjects are Mathematics and English.', para: 1 },
  { text: 'The main reason for choosing your university is its excellent reputation.', para: 2 },
  { text: 'Your modern laboratories would help me to develop my skills.', para: 2 },
  { text: 'I am enclosing my academic certificates and a reference letter.', para: 3 },
  { text: 'I have also enclosed an attestation of my certificate.', para: 3 },
  { text: 'Thank you in advance for considering my application.', para: 4 },
  { text: 'I look forward to hearing from you.', para: 4 },
];

export const CHOOSE_BANK: { text: string; formal: boolean; why: string }[] = [
  { text: 'I am writing to apply for a place on the Computer Science course.', formal: true, why: 'Clear purpose with formal language.' },
  { text: 'Hi! I wanna join your uni.', formal: false, why: '"Hi", "wanna" and "uni" are informal.' },
  { text: 'I am currently completing my secondary education.', formal: true, why: 'Formal and complete sentence.' },
  { text: "School's OK I guess, lol.", formal: false, why: '"lol" and "I guess" are too casual for a formal letter.' },
  { text: 'My favourite subjects are Mathematics and English.', formal: true, why: 'Clear and formal.' },
  { text: 'The main reason for choosing your university is its excellent reputation.', formal: true, why: 'Gives a formal reason.' },
  { text: 'Your uni is super cool!!!', formal: false, why: '"Super cool" and "!!!" are informal.' },
  { text: 'I am enclosing my academic certificates and a reference letter.', formal: true, why: 'Formal way to mention documents.' },
  { text: "Here's my stuff.", formal: false, why: 'Contractions and "stuff" are informal.' },
  { text: 'Thank you in advance for considering my application.', formal: true, why: 'Polite and formal thanks.' },
  { text: 'Thanks a lot, bye!', formal: false, why: '"Thanks a lot" and "bye" are informal.' },
  { text: 'I look forward to hearing from you.', formal: true, why: 'The standard formal ending.' },
  { text: 'Text me back ASAP.', formal: false, why: '"Text me" and "ASAP" are informal.' },
];

export const FORMAL_PHRASES = [
  'Dear Sir or Madam,',
  'I am writing to apply for...',
  'I would like to be considered for...',
  'I am currently studying...',
  'I have experience in...',
  'I am particularly interested in...',
  'The main reason for choosing your university is...',
  'I believe that I would be a suitable candidate because...',
  'Please find enclosed...',
  'I am enclosing...',
  'I would be grateful if you could...',
  'Thank you in advance for considering my application.',
  'I look forward to hearing from you.',
  'Yours faithfully,',
];

export const LETTER_WORD_BANK = [
  'attestation', 'reference', 'enclose', 'enclosing', 'extensive', 'in advance', 'doctorate', 'cardiac',
  'qualifications', 'reputation', 'secondary education', 'certificate', 'experience', 'excellent', 'motivated', 'consider',
];

// Guided frames: weaker students build each paragraph from choices.
export const GUIDED_FRAMES: { parts: (string | { key: string; options: string[] })[] }[] = [
  { parts: ['I am writing to apply for a place on the ', { key: 'course', options: [] }, ' course at Pearl Bay University. I saw information about the course ', { key: 'where', options: ['on your website', 'at a university fair', 'in a newspaper'] }, '.'] },
  { parts: ['I am currently completing my secondary education at ', { key: 'school', options: ['a high school in Kuwait City', 'a secondary school in Hawalli', 'a high school in Al-Ahmadi', 'a secondary school in Jahra'] }, '. My favourite subjects are ', { key: 'subj', options: ['Mathematics and English', 'Biology and Chemistry', 'Physics and Mathematics', 'English and History', 'Computer Studies and Mathematics'] }, '. I also have experience in ', { key: 'exp', options: ['volunteering at a charity', 'organising school events', 'helping younger students with homework', 'working in a team on science projects'] }, '.'] },
  { parts: ['The main reason for choosing your university is its ', { key: 'reason', options: ['excellent reputation', 'modern facilities', 'experienced teachers', 'extensive library'] }, '. I believe this course will help me to ', { key: 'goal', options: ['achieve my career goals', 'serve my country in the future', 'develop my skills and knowledge'] }, '.'] },
  { parts: ['I am enclosing ', { key: 'docs', options: ['my academic certificate and a reference letter', 'my academic certificate, an attestation and a reference letter', 'a copy of my certificate and my personal statement'] }, '.'] },
  { parts: ['Thank you in advance for considering my application. I look forward to hearing from you.'] },
];

export const EXAMPLE_LETTER = {
  greeting: 'Dear Sir or Madam,',
  paragraphs: [
    'I am writing to apply for a place on the Engineering course at Pearl Bay University, which starts in September. I saw information about the course on your website.',
    'I am currently completing my secondary education at a high school in Kuwait City. My favourite subjects are Mathematics and Physics, and I have always achieved high grades in them. Last year, I took part in a national robotics competition, which gave me extensive experience of working in a team.',
    'The main reason for choosing your university is its excellent reputation for engineering. Your modern laboratories and experienced teachers would help me to develop my skills. In the future, I hope to design energy systems for Kuwait.',
    'I am enclosing a copy of my academic certificate, an attestation from the Ministry of Education and a reference letter from my Physics teacher.',
    'Thank you in advance for considering my application. I look forward to hearing from you.',
  ],
  closing: 'Yours faithfully,',
  name: 'Nasser Al-Ali',
};

// ------------------------------------------------------------- Arabic hints for key instructions
export const ARABIC_HINTS: Record<string, string> = {
  'good listener': 'مستمع جيد',
  'poor listener': 'مستمع ضعيف',
  'formal': 'رسمي',
  'informal': 'غير رسمي',
  'application': 'طلب التحاق',
  'letter': 'رسالة',
  'evidence': 'دليل',
  'qualifications': 'المؤهلات',
  'enclosed documents': 'المستندات المرفقة',
  'purpose': 'الغرض / الهدف',
  'course': 'تخصص / مقرر دراسي',
  'surname': 'اسم العائلة',
  'full-time': 'دوام كامل',
  'part-time': 'دوام جزئي',
};
