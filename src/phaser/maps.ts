// Room layouts. Tiles are 32px. Entities are placed in tile coordinates.
import type { GameState } from '../game/state';

export interface Ent {
  id: string;
  kind: 'npc' | 'obj' | 'item' | 'pad';
  x: number;
  y: number;
  tex?: string; // object texture key, or look id for NPCs
  name?: string; // shown on hover
  interact?: boolean;
  solid?: boolean;
  visible?: (s: GameState) => boolean;
  face?: 'down' | 'up' | 'left' | 'right';
  wander?: [number, number, number, number];
  label?: string; // text drawn on pads / signs
  depth?: number;
}

export interface Door {
  x: number; y: number; to: string; spawn: [number, number];
  locked?: (s: GameState) => string | null;
}

export interface RoomDef {
  id: string;
  name: string;
  w: number; h: number;
  grid: string[][];
  roofs: Record<string, string>; // "x,y" -> roof color
  ents: Ent[];
  doors: Door[];
  spawn: [number, number];
  solidExtra: Set<string>;
  zoom: number;
}

const SOLID = new Set(['h', '~', 'w', 'o', 'r', 'R', 'W', 'O', 'k', 'x']);
export const isSolidChar = (ch: string) => SOLID.has(ch);

function blank(w: number, h: number, ch: string) {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => ch));
}

// ------------------------------------------------------------------ campus
function campus(): RoomDef {
  const W = 44, H = 40;
  const g = blank(W, H, '.');
  const roofs: Record<string, string> = {};
  const ents: Ent[] = [];
  const doors: Door[] = [];
  const set = (x: number, y: number, ch: string) => { if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = ch; };
  const rect = (x: number, y: number, w: number, h: number, ch: string) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, ch); };

  // flowers sprinkled
  for (let i = 0; i < 90; i++) { const x = (i * 37) % W, y = (i * 53 + 7) % H; if (g[y][x] === '.') set(x, y, ','); }

  // paths
  rect(3, 10, 38, 2, '#');       // main east-west avenue
  rect(21, 9, 2, 30, '#');       // main north-south avenue to the gate and bottom
  rect(8, 20, 28, 2, '#');       // southern avenue (writing hall & café)
  rect(17, 11, 10, 9, '=');      // fountain plaza
  rect(8, 9, 2, 1, '#'); rect(35, 9, 2, 1, '#'); rect(8, 20, 2, 1, '#'); rect(35, 20, 2, 1, '#');
  // outside entrance plaza
  rect(9, 25, 26, 11, '=');
  rect(21, 36, 2, 4, '#');

  // building helper
  const building = (x: number, y: number, w: number, h: number, roof: string, doorX: number, to: string, spawn: [number, number], label: string, locked?: Door['locked']) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      const isWall = j >= y + h - 2;
      const isEave = j === y + h - 3;
      if (isWall) set(i, j, (i - x) % 3 === 1 ? 'o' : 'w');
      else if (isEave) { set(i, j, 'R'); roofs[`${i},${j}`] = roof; }
      else { set(i, j, 'r'); roofs[`${i},${j}`] = roof; }
    }
    set(doorX, y + h - 1, 'd');
    set(doorX, y + h - 2, 'w');
    doors.push({ x: doorX, y: y + h - 1, to, spawn, locked });
    ents.push({ id: `sign-${to}`, kind: 'obj', x: doorX - 1, y: y + h - 3, tex: 'sign', label, depth: -500 });
  };

  building(3, 2, 10, 7, '#c9a7ff', 8, 'library', [14.5, 15.5], 'LIBRARY',
    (s) => (s.flags.m1_done ? null : 'The library is locked. Complete Mission 1 first.'));
  building(17, 1, 10, 8, '#ff9a85', 22, 'admissions', [15.5, 15.5], 'ADMISSIONS',
    (s) => (s.flags.m3_done ? null : 'The Admissions Office opens after Mission 3.'));
  building(31, 2, 10, 7, '#8fb8ff', 36, 'career', [15.5, 15.5], 'CAREER CENTRE',
    (s) => (s.flags.m2_done ? null : 'The Career Centre opens after Mission 2.'));
  building(3, 13, 10, 7, '#a8d5a2', 8, 'writing', [15.5, 15.5], 'WRITING HALL',
    (s) => (s.flags.m4_done ? null : 'The Writing Hall opens after Mission 4.'));
  building(31, 13, 10, 7, '#ffd36e', 36, 'cafe', [0, 0], 'STUDENT CAFÉ',
    () => 'The café is closed during the Admission Challenge. Good luck!');

  // hedge fence across the campus with the gate
  rect(0, 23, W, 1, 'h');
  set(21, 23, 'g'); set(22, 23, 'g');
  // outer border hedges
  rect(0, 0, W, 1, 'h'); rect(0, 0, 1, H, 'h'); rect(W - 1, 0, 1, H, 'h'); rect(0, H - 1, W, 1, 'h');
  set(21, H - 1, '#'); set(22, H - 1, '#'); // road out (blocked by solidExtra)

  // fountain
  for (let j = 13; j < 16; j++) for (let i = 20; i < 24; i++) set(i, j, 'x');
  ents.push({ id: 'fountain', kind: 'obj', x: 20, y: 13, tex: 'fountain', interact: true, name: 'Fountain' });

  // gate pillars
  ents.push({ id: 'pillarL', kind: 'obj', x: 20, y: 23, tex: 'pillar', solid: true });
  ents.push({ id: 'pillarR', kind: 'obj', x: 23, y: 23, tex: 'pillar', solid: true });

  // trees around
  const trees: [number, number, string][] = [
    [1, 2, 'palm'], [1, 6, 'tree'], [1, 10, 'blossom'], [1, 14, 'tree'], [1, 18, 'palm'], [14, 3, 'tree'], [15, 6, 'blossom'],
    [28, 3, 'blossom'], [29, 6, 'tree'], [42, 2, 'palm'], [42, 6, 'tree'], [42, 10, 'blossom'], [42, 14, 'tree'], [42, 18, 'palm'],
    [14, 15, 'tree'], [15, 18, 'palm'], [28, 15, 'palm'], [29, 18, 'tree'],
    [2, 25, 'palm'], [5, 27, 'tree'], [2, 30, 'blossom'], [5, 33, 'palm'], [2, 36, 'tree'],
    [41, 25, 'palm'], [38, 27, 'tree'], [41, 30, 'blossom'], [38, 33, 'palm'], [41, 36, 'tree'],
    [17, 37, 'blossom'], [26, 37, 'blossom'], [11, 38, 'tree'], [32, 38, 'tree'],
  ];
  trees.forEach(([x, y, t], i) => ents.push({ id: `tree${i}`, kind: 'obj', x, y, tex: t, solid: true }));

  // lamps & benches
  [[19, 10], [24, 10], [19, 24], [24, 24], [19, 34], [24, 34], [12, 12], [31, 12]].forEach(([x, y], i) => ents.push({ id: `lamp${i}`, kind: 'obj', x, y, tex: 'lamp', solid: true }));
  ents.push({ id: 'bench1', kind: 'obj', x: 17, y: 18, tex: 'bench', solid: true });
  ents.push({ id: 'bench2', kind: 'obj', x: 25, y: 18, tex: 'bench', solid: true });
  ents.push({ id: 'bench3', kind: 'obj', x: 14, y: 35, tex: 'bench', solid: true });

  // notice boards
  ents.push({ id: 'notice-gate', kind: 'obj', x: 25, y: 25, tex: 'notice', solid: true, interact: true, name: 'Notice board' });
  ents.push({ id: 'notice-campus', kind: 'obj', x: 27, y: 18, tex: 'notice', solid: true, interact: true, name: 'Campus map' });

  // ---- Mission 1 characters
  ents.push({ id: 'gatekeeper', kind: 'npc', x: 19, y: 25, tex: 'gatekeeper', interact: true, name: 'Abu Salem', face: 'down' });
  ents.push({ id: 'coach', kind: 'npc', x: 18, y: 31, tex: 'coach', interact: true, name: 'Ms Hessa', face: 'down' });
  ents.push({ id: 'professor', kind: 'npc', x: 36, y: 29, tex: 'professor', interact: true, name: 'Professor Yousef', face: 'left' });
  ents.push({ id: 'reem', kind: 'npc', x: 16, y: 35, tex: 'reem', interact: true, name: 'Reem', face: 'down' });
  const pairs: [string, string, number, number][] = [
    ['sara', 'lulwa', 11, 26], ['noura', 'fatma', 31, 26], ['maryam', 'ahmad', 11, 33], ['dana', 'bashayer', 31, 33], ['huda', 'shahad', 26, 35],
  ];
  pairs.forEach(([a, b, x, y]) => {
    ents.push({ id: `listen-${a}`, kind: 'npc', x, y, tex: a, interact: true, name: a[0].toUpperCase() + a.slice(1), face: 'right' });
    ents.push({ id: `partner-${b}`, kind: 'npc', x: x + 1, y, tex: b, interact: true, name: b[0].toUpperCase() + b.slice(1), face: 'left' });
  });
  ents.push({ id: 'pad-good', kind: 'pad', x: 12, y: 28, tex: 'pad-good', label: 'GOOD LISTENER' });
  ents.push({ id: 'pad-poor', kind: 'pad', x: 28, y: 28, tex: 'pad-poor', label: 'POOR LISTENER' });

  // wandering students inside campus
  ents.push({ id: 'student-a', kind: 'npc', x: 12, y: 11, tex: 'student1', interact: true, name: 'Yousef', wander: [4, 10, 18, 11], visible: (s) => !!s.flags.m1_done });
  ents.push({ id: 'student-b', kind: 'npc', x: 30, y: 21, tex: 'student2', interact: true, name: 'Haya', wander: [24, 20, 36, 21], visible: (s) => !!s.flags.m1_done });
  ents.push({ id: 'student-c', kind: 'npc', x: 26, y: 12, tex: 'student3', interact: true, name: 'Mubarak', wander: [17, 11, 26, 12], visible: (s) => !!s.flags.m1_done });

  const solidExtra = new Set<string>(['21,39', '22,39']);
  return { id: 'campus', name: 'Pearl Bay University Campus', w: W, h: H, grid: g, roofs, ents, doors, spawn: [21.5, 37.5], solidExtra, zoom: 1.5 };
}

// ------------------------------------------------------------------ interiors
function interior(id: string, name: string, floor: string, exitTo: [number, number], build: (g: string[][], ents: Ent[]) => void): RoomDef {
  const W = 30, H = 18;
  const g = blank(W, H, floor);
  for (let x = 0; x < W; x++) { g[0][x] = 'W'; g[1][x] = x % 6 === 3 ? 'O' : 'W'; g[2][x] = x % 6 === 3 ? 'O' : 'W'; g[H - 1][x] = 'k'; }
  for (let y = 0; y < H; y++) { g[y][0] = 'k'; g[y][W - 1] = 'k'; }
  g[H - 1][14] = 'X'; g[H - 1][15] = 'X';
  const ents: Ent[] = [];
  build(g, ents);
  const doors: Door[] = [
    { x: 14, y: H - 1, to: 'campus', spawn: exitTo },
    { x: 15, y: H - 1, to: 'campus', spawn: exitTo },
  ];
  return { id, name, w: W, h: H, grid: g, roofs: {}, ents, doors, spawn: [15, 15.5], solidExtra: new Set(), zoom: 1.5 };
}

const o = (id: string, tex: string, x: number, y: number, extra: Partial<Ent> = {}): Ent => ({ id, kind: 'obj', x, y, tex, solid: true, ...extra });

function library(): RoomDef {
  return interior('library', 'University Library', 'f', [8.5, 9.6], (g, e) => {
    for (let y = 12; y < 16; y++) for (let x = 11; x < 19; x++) g[y][x] = 'c';
    [1, 5, 7, 11, 13, 17, 19, 23, 25].forEach((x, i) => e.push(o(`shelf-top${i}`, 'bookshelf', x, 2)));
    [3, 5, 7].forEach((x, i) => { e.push(o(`shelfA${i}`, 'bookshelf', x - 1, 6)); });
    [20, 22, 24].forEach((x, i) => { e.push(o(`shelfB${i}`, 'bookshelf', x, 6)); });
    [3, 5].forEach((x, i) => e.push(o(`shelfC${i}`, 'bookshelf', x - 1, 10)));
    [22, 24].forEach((x, i) => e.push(o(`shelfD${i}`, 'bookshelf', x, 10)));
    e.push(o('table1', 'table', 12, 7)); e.push(o('table2', 'table', 16, 7));
    e.push(o('chairL1', 'chair', 11, 7)); e.push(o('chairR2', 'chair', 18, 7));
    e.push(o('counter', 'counter', 20, 14));
    e.push({ id: 'librarian', kind: 'npc', x: 21, y: 13, tex: 'librarian', interact: true, name: 'Mrs Amal', face: 'down' });
    e.push(o('plant1', 'plant', 1, 15)); e.push(o('plant2', 'plant', 28, 15)); e.push(o('plant3', 'plant', 28, 4));
    e.push({ id: 'clock', kind: 'obj', x: 15, y: 1, tex: 'clock', depth: -400 });
    e.push(o('computer-lib', 'computer', 26, 12, { interact: true, name: 'Library computer' }));
    // vocabulary objects (glowing)
    const vis = (s: GameState) => !!s.flags.m2_started;
    const items: [string, number, number][] = [
      ['cardiac', 13, 8], ['doctorate', 3, 8], ['enclose', 21, 4], ['extensive', 8, 12],
      ['in-advance', 27, 9], ['attestation', 24, 13], ['reference', 3, 14],
    ];
    items.forEach(([id, x, y]) => e.push({ id: `vocab-${id}`, kind: 'item', x, y, tex: `v-${id}`, interact: true, name: 'Glowing record', visible: (s) => vis(s) && !s.vocab.includes(id) }));
  });
}

function career(): RoomDef {
  return interior('career', 'Career Centre', 't', [36.5, 9.6], (g, e) => {
    for (let y = 6; y < 10; y++) for (let x = 11; x < 19; x++) g[y][x] = 'c';
    e.push({ id: 'jobboard', kind: 'obj', x: 6, y: 2, tex: 'notice', solid: true, interact: true, name: 'Job adverts' });
    e.push(o('board-c', 'board', 12, 2, { interact: true, name: 'Formal letter tips' }));
    [[3, 6], [3, 10], [23, 6], [23, 10]].forEach(([x, y], i) => { e.push(o(`pc${i}`, 'computer', x, y, i === 0 ? { interact: true, name: 'Computer' } : {})); e.push(o(`pcc${i}`, 'chair', x + 1, y + 1, { solid: true })); });
    e.push(o('sofa-c', 'sofa', 20, 14));
    e.push(o('plant-c1', 'plant', 1, 4)); e.push(o('plant-c2', 'plant', 28, 4)); e.push(o('plant-c3', 'plant', 28, 15)); e.push(o('plant-c4', 'plant', 1, 15));
    e.push(o('faisal-desk', 'desk', 13, 9));
    e.push({ id: 'papers1', kind: 'obj', x: 11, y: 10, tex: 'papers', depth: -300 });
    e.push({ id: 'papers2', kind: 'obj', x: 17, y: 11, tex: 'papers', depth: -300 });
    e.push({ id: 'papers3', kind: 'obj', x: 16, y: 7, tex: 'papers', depth: -300 });
    e.push({ id: 'faisal', kind: 'npc', x: 15, y: 8, tex: 'faisal', interact: true, name: 'Dr Faisal', face: 'down' });
    e.push(o('cab-c', 'cabinet', 20, 2)); e.push(o('cab-c2', 'cabinet', 21, 2));
  });
}

function admissions(): RoomDef {
  return interior('admissions', 'Admissions Office', 'c', [22.5, 9.6], (g, e) => {
    for (let y = 3; y < 17; y++) for (let x = 1; x < 29; x++) if (x < 4 || x > 25 || y > 12) g[y][x] = 't';
    e.push(o('counter-a', 'counter', 13, 5));
    e.push({ id: 'officer', kind: 'npc', x: 14, y: 4, tex: 'officer', interact: true, name: 'Ms Latifa', face: 'down' });
    e.push(o('folder-desk', 'folder', 7, 4, { interact: true, name: 'Application folder' }));
    e.push(o('cab1', 'cabinet', 2, 2)); e.push(o('cab2', 'cabinet', 3, 2)); e.push(o('cab3', 'cabinet', 26, 2));
    e.push(o('printer', 'printer', 24, 3, { interact: true, name: 'Printer' }));
    e.push(o('sofa-a', 'sofa', 4, 13)); e.push(o('chairs1', 'chair', 9, 9)); e.push(o('chairs2', 'chair', 10, 9)); e.push(o('chairs3', 'chair', 19, 9)); e.push(o('chairs4', 'chair', 20, 9));
    e.push(o('table-a', 'table', 19, 12));
    e.push(o('plant-a1', 'plant', 1, 6)); e.push(o('plant-a2', 'plant', 28, 13)); e.push(o('plant-a3', 'plant', 28, 6));
    e.push(o('bin-a', 'bin', 23, 10));
    e.push({ id: 'paint1', kind: 'obj', x: 8, y: 1, tex: 'painting', depth: -400 });
    e.push({ id: 'paint2', kind: 'obj', x: 19, y: 1, tex: 'painting', depth: -400 });
    e.push({ id: 'stage', kind: 'obj', x: 11, y: 9, tex: 'stage', depth: -600, visible: (s) => !!s.flags.m5_done });
    e.push({ id: 'dean', kind: 'npc', x: 14, y: 10, tex: 'dean', interact: true, name: 'Dr Munira (Dean)', face: 'down', visible: (s) => !!s.flags.m5_done });
    // documents to find
    const vis = (id: string) => (s: GameState) => !!s.flags.m4_form && !s.flags.m4_folder && !s.docsFound.includes(id);
    const docs: [string, number, number][] = [
      ['doc-certificate', 4, 6], ['doc-attestation', 25, 5], ['doc-reference', 8, 14], ['doc-form', 21, 13],
      ['doc-statement', 27, 15], ['decoy-comic', 11, 11], ['decoy-receipt', 24, 11],
    ];
    docs.forEach(([id, x, y]) => e.push({ id: `find-${id}`, kind: 'item', x, y, tex: id, interact: true, name: 'Document', visible: vis(id) }));
  });
}

function writing(): RoomDef {
  return interior('writing', 'Writing Hall', 'f', [8.5, 20.6], (g, e) => {
    for (let y = 4; y < 8; y++) for (let x = 11; x < 19; x++) g[y][x] = 'c';
    e.push(o('board-w', 'board', 12, 2, { interact: true, name: 'Formal phrases board' }));
    e.push(o('podium', 'podium', 18, 5));
    e.push({ id: 'tutor', kind: 'npc', x: 16, y: 6, tex: 'tutor', interact: true, name: 'Mr Bader', face: 'down' });
    [[3, 9], [7, 9], [20, 9], [24, 9], [3, 13], [7, 13], [20, 13], [24, 13]].forEach(([x, y], i) => { e.push(o(`tw${i}`, 'typewriter', x, y)); e.push(o(`twc${i}`, 'chair', x + 1, y + 1)); });
    e.push(o('writing-desk', 'computer', 13, 11, { interact: true, name: 'Writing desk' }));
    e.push(o('wchair', 'chair', 14, 12));
    e.push(o('shelf-w1', 'bookshelf', 1, 2)); e.push(o('shelf-w2', 'bookshelf', 25, 2)); e.push(o('shelf-w3', 'bookshelf', 27, 2));
    e.push(o('plant-w1', 'plant', 1, 15)); e.push(o('plant-w2', 'plant', 28, 15));
  });
}

let cache: Record<string, RoomDef> | null = null;
export function rooms(): Record<string, RoomDef> {
  if (!cache) cache = { campus: campus(), library: library(), career: career(), admissions: admissions(), writing: writing() };
  return cache;
}

export const ROOM_NAMES: Record<string, string> = {
  campus: 'Campus', library: 'Library', career: 'Career Centre', admissions: 'Admissions Office', writing: 'Writing Hall',
};
