// Transparent structural checks for the student's letter.
// These checks look for structure and key words only. They do NOT grade grammar or meaning.
import { countWords, type Letter } from './state';

export interface LetterCheck { id: string; label: string; para: number; tip: string; pass: (l: Letter) => boolean; why: string }

const has = (t: string, re: RegExp) => re.test(t || '');
const enough = (t: string, n = 5) => countWords(t || '') >= n;

export const LETTER_CHECKS: LetterCheck[] = [
  { id: 'greeting', label: 'I included a suitable greeting.', para: -1, tip: 'Start your letter with "Dear Sir or Madam,".', why: 'Looks for a greeting that starts with "Dear".', pass: (l) => /^dear\b/i.test(l.greeting.trim()) },
  { id: 'purpose', label: 'I explained the purpose of my letter.', para: 0, tip: 'In paragraph 1, write: "I am writing to apply for a place on the ... course."', why: 'Looks for "apply", "application" or "writing to" in paragraph 1 (at least 5 words).', pass: (l) => enough(l.paragraphs[0]) && has(l.paragraphs[0], /\b(apply|applying|application|writing to)\b/i) },
  { id: 'qual', label: 'I described my qualifications.', para: 1, tip: 'In paragraph 2, write about your school, your subjects or your experience. e.g. "I am currently completing my secondary education."', why: 'Looks for words like school, subjects, grades, experience or qualifications in paragraph 2.', pass: (l) => enough(l.paragraphs[1]) && has(l.paragraphs[1], /(stud|school|secondary|subject|grade|qualif|experience|certificate|skill|achiev|won|volunteer|course|education)/i) },
  { id: 'why', label: 'I explained why I chose this university.', para: 2, tip: 'In paragraph 3, give a reason: "The main reason for choosing your university is its excellent reputation."', why: 'Looks for reason words like because, reason, choose, reputation or facilities in paragraph 3.', pass: (l) => enough(l.paragraphs[2]) && has(l.paragraphs[2], /(reason|because|chose|choos|reputation|excellent|facilit|teacher|laborator|librar|hope|would like|future|career)/i) },
  { id: 'docs', label: 'I mentioned the enclosed documents.', para: 3, tip: 'In paragraph 4, write: "I am enclosing my academic certificate and a reference letter."', why: 'Looks for enclose/attach and a document name in paragraph 4.', pass: (l) => enough(l.paragraphs[3], 4) && has(l.paragraphs[3], /(enclos|attach|find)/i) && has(l.paragraphs[3], /(certificate|reference|attestation|document|statement|cv|curriculum|form|transcript|copy)/i) },
  { id: 'polite', label: 'I ended the letter politely.', para: 4, tip: 'In paragraph 5, thank the reader. Then choose "Yours faithfully," and write your name.', why: 'Looks for "thank" or "look forward" in paragraph 5, a formal closing and your name.', pass: (l) => has(l.paragraphs[4], /(thank|look forward|grateful)/i) && /yours (faithfully|sincerely)/i.test(l.closing) && l.name.trim().length > 1 },
];

const INFORMAL: [RegExp, string][] = [
  [/\b(hi|hey|hello|yo)\b/i, 'Greetings like "Hi" or "Hey" are informal. Use "Dear Sir or Madam,".'],
  [/\b(gonna|wanna|gotta)\b/i, 'Use "going to" / "want to" / "have to".'],
  [/\b(coz|cuz|cause)\b/i, 'Use "because".'],
  [/\b(u|ur)\b/i, 'Write "you" / "your" in full.'],
  [/\b(lol|omg|btw|asap)\b/i, 'Text-message words are not suitable for a formal letter.'],
  [/\b(ok|okay|cool|awesome|super|stuff|kinda|guys)\b/i, 'This word is informal. Try a more formal word.'],
  [/\bthanks\b/i, 'Use "Thank you" instead of "Thanks".'],
  [/\b(bye|cya)\b/i, 'End with "Yours faithfully," instead.'],
  [/\buni\b/i, 'Write "university" in full.'],
  [/\b(i'm|i’m|don't|don’t|can't|can’t|it's|it’s|i've|i’ve|i'd|i’d|won't|isn't|here's|that's|i'll)\b/i, 'Avoid contractions. Write the full form, e.g. "I am", "do not".'],
  [/!{2,}/, 'Avoid "!!" in a formal letter.'],
  [/(^|[.!?]\s+)i\s/, 'The word "I" is always a capital letter.'],
];

export function informalScan(text: string) {
  const out: { word: string; tip: string }[] = [];
  INFORMAL.forEach(([re, tip]) => {
    const m = text.match(re);
    if (m) out.push({ word: m[0].trim(), tip });
  });
  return out;
}

export function letterText(l: Letter) {
  return [l.greeting, '', ...l.paragraphs.filter((p) => p.trim()).flatMap((p) => [p.trim(), '']), l.closing, l.name].join('\n');
}

export function letterWords(l: Letter) {
  return countWords(l.paragraphs.join(' '));
}
