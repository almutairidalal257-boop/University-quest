// Generates ElevenLabs voice files for every fixed line of dialogue in the game.
//
//   ELEVENLABS_API_KEY=... node --experimental-strip-types scripts/generate-voices.ts
//   node --experimental-strip-types scripts/generate-voices.ts --dry-run   (lists lines, no API calls)
//
// Files go to public/tts/<hash>.mp3 plus public/tts/manifest.json. Existing files are kept,
// so re-running only pays for new or edited lines. Files for deleted lines are removed.
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { VOICE_FOR_LOOK, PLAYER_VOICES, voiceKeyFor, speakableText, ttsHash } from '../src/game/voices.ts';
import { LISTEN_SCENARIOS, VOCAB } from '../src/game/content.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public', 'tts');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'voices.json'), 'utf8'));
const dryRun = process.argv.includes('--dry-run');
// In logic.ts the speaker is only chosen at run time for the plaza students.
const STUDENT_VOICES = [...new Set(['sara', 'ahmad'].map((l) => VOICE_FOR_LOOK[l]))];

const lines = new Map<string, { voice: string; text: string }>();
const add = (voice: string, text: string) => {
  if (!speakableText(text)) return;
  lines.set(ttsHash(voice, text), { voice, text });
};
const addForLook = (look: string | null, text: string) => {
  if (look === null) STUDENT_VOICES.forEach((v) => add(v, text)); // speaker decided at run time
  else add(voiceKeyFor(look), text);
};

// ---- 1. dialogue written in src/game/logic.ts
const file = path.join(ROOT, 'src', 'game', 'logic.ts');
const src = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
const literal = (n?: ts.Node) => (n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : undefined);
let skipped = 0;

const visit = (node: ts.Node) => {
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
    const fn = node.expression.text;
    const [a, b] = node.arguments;
    if (fn === 'N' && b) {
      const text = literal(b);
      if (text !== undefined) addForLook(literal(a) ?? null, text); else skipped++;
    } else if (fn === 'NARR' && a) {
      const text = literal(a);
      if (text !== undefined) add('narrator', text); else skipped++;
    } else if (fn === 'ME' && a) {
      const text = literal(a);
      if (text !== undefined) PLAYER_VOICES.forEach((v) => add(v, text)); else skipped++;
    }
  }
  if (ts.isObjectLiteralExpression(node)) {
    const prop = (name: string) => node.properties.find((p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === name);
    const speaker = prop('speaker'), text = prop('text');
    if (speaker && text) {
      const t = literal(text.initializer);
      const look = prop('look');
      if (t !== undefined) addForLook(look ? literal(look.initializer) ?? null : 'narrator', t); else skipped++;
    }
  }
  ts.forEachChild(node, visit);
};
visit(src);

// ---- 2. listening conversations and word cards from src/game/content.ts
for (const sc of LISTEN_SCENARIOS) {
  for (const l of sc.lines) {
    if (l.who === 'narrator') add('narrator', l.text);
    else addForLook(l.who === 'npc' ? sc.id : sc.partner.toLowerCase(), l.text);
  }
  add('narrator', `Was ${sc.name} a GOOD listener or a POOR listener? Walk onto the correct pad.`);
  add('narrator', `✅ Correct! ${sc.name} is a ${sc.good ? 'GOOD' : 'POOR'} listener. ${sc.explain}`);
  add('narrator', `❌ Not quite. Think again about what ${sc.name} did.`);
}
for (const v of VOCAB) add(voiceKeyFor('librarian'), `${v.word}. ${v.example}`);

// ---- 3. generate
const chars = [...lines.values()].reduce((n, l) => n + speakableText(l.text).length, 0);
fs.mkdirSync(OUT, { recursive: true });
const missing = [...lines.entries()].filter(([h]) => !fs.existsSync(path.join(OUT, `${h}.mp3`)));
const newChars = missing.reduce((n, [, l]) => n + speakableText(l.text).length, 0);
console.log(`${lines.size} lines (${chars} characters). ${missing.length} need generating (${newChars} characters). ${skipped} lines contain run-time text (e.g. the player's name) and will use the device voice.`);

if (dryRun) {
  for (const [h, l] of lines) console.log(`${h}  [${l.voice}]  ${speakableText(l.text)}`);
  process.exit(0);
}

const key = process.env.ELEVENLABS_API_KEY;
if (!key && missing.length) {
  console.error('ELEVENLABS_API_KEY is not set.');
  process.exit(1);
}

let failed = 0;
for (const [i, [h, l]] of missing.entries()) {
  const voiceId = config.voices[l.voice];
  if (!voiceId) { console.error(`No voice ID for "${l.voice}" in scripts/voices.json`); failed++; continue; }
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_64`, {
    method: 'POST',
    headers: { 'xi-api-key': key!, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text: speakableText(l.text), model_id: config.model_id, voice_settings: config.voice_settings }),
  });
  if (!res.ok) {
    console.error(`  ✖ ${res.status} ${await res.text()}`);
    failed++;
    if (res.status === 401 || res.status === 402) break; // bad key or no credits: stop early
    continue;
  }
  fs.writeFileSync(path.join(OUT, `${h}.mp3`), Buffer.from(await res.arrayBuffer()));
  console.log(`  ✔ ${i + 1}/${missing.length} [${l.voice}] ${speakableText(l.text).slice(0, 70)}`);
}

// remove files for lines that no longer exist, then write the manifest
for (const f of fs.readdirSync(OUT)) {
  if (f.endsWith('.mp3') && !lines.has(f.slice(0, -4))) fs.unlinkSync(path.join(OUT, f));
}
const files = [...lines.keys()].filter((h) => fs.existsSync(path.join(OUT, `${h}.mp3`)));
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ files }, null, 0));
console.log(`Done: ${files.length}/${lines.size} lines have recorded voices.${failed ? ` ${failed} failed.` : ''}`);
if (failed) process.exit(1);
