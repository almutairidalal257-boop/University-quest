// Shared by the game and scripts/generate-voices.ts — keep this file free of imports.

/** Which voice each character uses. Voice keys are mapped to ElevenLabs voice IDs in scripts/voices.json. */
export const VOICE_FOR_LOOK: Record<string, string> = {
  // player avatars
  'hijab-lavender': 'player_female',
  'hijab-sage': 'player_female',
  'long-hair': 'player_female',
  ghutra: 'player_male',
  'short-hair': 'player_male',
  // staff
  gatekeeper: 'older_man',
  professor: 'older_man',
  faisal: 'man',
  tutor: 'man',
  coach: 'woman',
  librarian: 'woman',
  officer: 'woman',
  dean: 'older_woman',
  // students
  sara: 'young_woman', lulwa: 'young_woman', noura: 'young_woman', fatma: 'young_woman', maryam: 'young_woman',
  dana: 'young_woman', bashayer: 'young_woman', huda: 'young_woman', shahad: 'young_woman', reem: 'young_woman',
  student2: 'young_woman',
  ahmad: 'young_man', student1: 'young_man', student3: 'young_man',
};

export const PLAYER_VOICES = ['player_female', 'player_male'];

export function voiceKeyFor(look?: string) {
  return (look && VOICE_FOR_LOOK[look]) || 'narrator';
}

/** Text actually sent to the voice: emoji and decorative symbols removed. */
export function speakableText(text: string) {
  return text
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{20E3}]/gu, '')
    .replace(/[▼⬇⬆➜→]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Stable file name for a (voice, text) pair. FNV-1a, 2 x 32 bit. */
export function ttsHash(voiceKey: string, text: string) {
  const s = `${voiceKey}|${speakableText(text)}`;
  let h1 = 0x811c9dc5, h2 = 0x01000193 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}
