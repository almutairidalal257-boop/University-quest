// Procedural pixel art drawn on <canvas>. Every graphic in the game is generated here,
// so the game needs no external image files and works offline.
import type { Look, HairStyle } from './looks';
import type { Expr } from './state';

export const OUT = '#3d3354';
export type Dir = 'down' | 'up' | 'left' | 'right';

type Ctx = CanvasRenderingContext2D;

export function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

/** Pixel painter with a fixed art-pixel size. */
export function painter(ctx: Ctx, P: number, ox = 0, oy = 0) {
  const r = (x: number, y: number, w: number, h: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(ox + x * P, oy + y * P, w * P, h * P);
  };
  // filled rect with a 1px outline and "rounded" corners
  const blob = (x: number, y: number, w: number, h: number, col: string, out = OUT) => {
    r(x - 1, y, w + 2, h, out);
    r(x, y - 1, w, h + 2, out);
    r(x, y, w, h, col);
  };
  return { r, blob };
}

export function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  r = f(r); g = f(g); b = f(b);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// Seeded random for stable tile variation
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

// ======================================================================= characters
// Frame is 16 x 24 art pixels. frame 0 = stand, 1 & 2 = walk steps.
export function drawCharacter(ctx: Ctx, look: Look, dir: Dir, frame: number, P: number, ox: number, oy: number) {
  const { r, blob } = painter(ctx, P, ox, oy);
  const step = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  const bob = frame === 0 ? 0 : 1;
  // shadow
  ctx.fillStyle = 'rgba(40,30,70,0.25)';
  ctx.beginPath();
  ctx.ellipse(ox + 8 * P, oy + 22.5 * P, 5.5 * P, 1.6 * P, 0, 0, Math.PI * 2);
  ctx.fill();

  const y0 = -bob + 1; // body offset when walking
  // legs / garment
  if (look.dress) {
    const garment = look.coat && look.coat !== '#ffffff' ? look.coat : look.bottom;
    blob(4, 12 + y0, 8, 9, garment);
    r(4, 18 + y0, 8, 1, shade(garment, -0.15));
    // feet peeking
    if (dir === 'left' || dir === 'right') {
      r(6 + step, 21, 3, 1, look.shoes);
    } else {
      r(5, 21 + (step > 0 ? -1 : 0), 2, 1, look.shoes);
      r(9, 21 + (step < 0 ? -1 : 0), 2, 1, look.shoes);
    }
  } else {
    if (dir === 'left' || dir === 'right') {
      blob(6 + step, 16 + y0, 2, 5 - y0, look.bottom);
      blob(8 - step, 16 + y0, 2, 5 - y0, shade(look.bottom, -0.12));
      r(6 + step, 20, 2, 1, look.shoes);
      r(8 - step, 20, 2, 1, look.shoes);
    } else {
      blob(5, 16 + y0 + (step > 0 ? -1 : 0), 2, 5 - y0, look.bottom);
      blob(9, 16 + y0 + (step < 0 ? -1 : 0), 2, 5 - y0, look.bottom);
      r(5, 20 + (step > 0 ? -1 : 0), 2, 1, look.shoes);
      r(9, 20 + (step < 0 ? -1 : 0), 2, 1, look.shoes);
    }
  }
  // torso
  blob(4, 11 + y0, 8, 6, look.top);
  r(4, 16 + y0, 8, 1, shade(look.top, -0.12));
  if (look.coat) {
    if (dir === 'up') r(4, 11 + y0, 8, 6, look.coat);
    else if (dir === 'down') { r(4, 11 + y0, 3, 6, look.coat); r(9, 11 + y0, 3, 6, look.coat); if (look.trim) { r(6, 11 + y0, 1, 6, look.trim); r(9, 11 + y0, 1, 6, look.trim); } }
    else r(dir === 'left' ? 7 : 4, 11 + y0, 5, 6, look.coat);
  }
  // arms
  const arm = look.coat || look.top;
  if (dir === 'down' || dir === 'up') {
    blob(2, 12 + y0 + step, 1, 4, arm);
    blob(13, 12 + y0 - step, 1, 4, arm);
    r(2, 16 + y0 + step, 1, 1, look.skin);
    r(13, 16 + y0 - step, 1, 1, look.skin);
  } else {
    blob(7 + step, 12 + y0, 2, 4, shade(arm, -0.08));
    r(7 + step, 16 + y0, 2, 1, look.skin);
  }
  // head
  const hy = y0 - 1;
  blob(3, 2 + hy, 10, 9, look.skin);
  drawHair(ctx, look, dir, P, ox, oy + hy * P);
  // face
  const eye = '#2a2138';
  if (dir === 'down') {
    r(5, 7 + hy, 1, 2, eye); r(10, 7 + hy, 1, 2, eye);
    r(4, 9 + hy, 1, 1, '#f3a0a0'); r(11, 9 + hy, 1, 1, '#f3a0a0');
    if (look.glasses) { ctx.strokeStyle = OUT; ctx.lineWidth = P * 0.5; ctx.strokeRect(ox + 4.4 * P, oy + (6.6 + hy) * P, 2.2 * P, 2.6 * P); ctx.strokeRect(ox + 9.4 * P, oy + (6.6 + hy) * P, 2.2 * P, 2.6 * P); }
    if (look.beard) r(5, 9 + hy, 6, 2, look.beard);
  } else if (dir === 'left' || dir === 'right') {
    const ex = dir === 'left' ? 4 : 11;
    r(ex, 7 + hy, 1, 2, eye);
    r(dir === 'left' ? 4 : 11, 9 + hy, 1, 1, '#f3a0a0');
    if (look.glasses) r(dir === 'left' ? 3 : 10, 7 + hy, 3, 1, OUT);
    if (look.beard) r(dir === 'left' ? 3 : 8, 9 + hy, 5, 2, look.beard);
  }
}

function drawHair(ctx: Ctx, look: Look, dir: Dir, P: number, ox: number, oy: number) {
  const { r, blob } = painter(ctx, P, ox, oy);
  const h = look.hair;
  const style: HairStyle = look.style;
  if (style === 'hijab' || style === 'ghutra') {
    const w = look.wrap || '#fff';
    const d = shade(w, -0.15);
    if (dir === 'up') {
      blob(2, 1, 12, 12, w);
      r(3, 10, 10, 2, d);
    } else {
      blob(2, 1, 12, 12, w);
      // face opening
      if (dir === 'down') r(4, 4, 8, 7, look.skin);
      else if (dir === 'left') r(3, 4, 7, 7, look.skin);
      else r(6, 4, 7, 7, look.skin);
      r(2, 11, 12, 1, d);
    }
    if (style === 'ghutra') {
      // agal (black cord)
      r(3, 2, 10, 1, '#222');
      if (dir !== 'up') r(4, 4, 8, 1, shade(w, -0.05));
    } else if (dir !== 'up') {
      r(4, 4, 8, 1, d);
    }
    return;
  }
  if (style === 'bald') {
    r(3, 5, 1, 3, h); r(12, 5, 1, 3, h);
    return;
  }
  // hair base
  if (dir === 'up') {
    blob(3, 1, 10, 9, h);
    if (style === 'long') blob(3, 9, 10, 5, h);
    if (style === 'bob') blob(2, 6, 12, 4, h);
    if (style === 'bun') blob(6, -1, 4, 3, h);
    return;
  }
  blob(3, 1, 10, 4, h);
  if (dir === 'down') {
    r(3, 5, 1, 3, h); r(12, 5, 1, 3, h);
    r(5, 4, 3, 1, h);
    if (style === 'long') { blob(2, 5, 1, 8, h); blob(13, 5, 1, 8, h); }
    if (style === 'bob') { blob(2, 4, 2, 6, h); blob(12, 4, 2, 6, h); }
    if (style === 'bun') blob(6, -1, 4, 3, h);
  } else {
    const back = dir === 'left' ? 9 : 3;
    blob(back, 3, 4, 6, h);
    if (style === 'long') blob(back, 8, 4, 5, h);
    if (style === 'bob') blob(back - (dir === 'left' ? 0 : 1), 4, 5, 6, h);
    if (style === 'bun') blob(dir === 'left' ? 11 : 1, 1, 3, 3, h);
  }
}

/** Sprite sheet: 4 rows (down, left, right, up) x 3 frames, each 32x48. */
export function characterSheet(look: Look) {
  const P = 2, FW = 32, FH = 48;
  const { c, ctx } = makeCanvas(FW * 3, FH * 4);
  (['down', 'left', 'right', 'up'] as Dir[]).forEach((d, row) => {
    for (let f = 0; f < 3; f++) drawCharacter(ctx, look, d, f, P, f * FW, row * FH);
  });
  return c;
}

// ======================================================================= portraits
export function drawPortrait(look: Look, expr: Expr = 'normal', size = 144): HTMLCanvasElement {
  const P = size / 48;
  const { c, ctx } = makeCanvas(size, size);
  const { r, blob } = painter(ctx, P);
  // background halo
  const grd = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.7);
  grd.addColorStop(0, '#fff8ec');
  grd.addColorStop(1, '#e8ddff');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  const sk = look.skin;
  const style = look.style;
  const wrap = look.wrap || '#fff';
  // shoulders
  blob(6, 38, 36, 11, look.coat || look.top);
  if (look.coat) { r(19, 38, 10, 11, look.top); if (look.trim) { r(18, 38, 1, 11, look.trim); r(29, 38, 1, 11, look.trim); } }
  else r(6, 46, 36, 2, shade(look.top, -0.1));
  // neck
  r(20, 33, 8, 6, shade(sk, -0.1));
  // back hair / hijab
  if (style === 'hijab' || style === 'ghutra') {
    blob(9, 3, 30, 38, wrap);
    r(9, 36, 30, 3, shade(wrap, -0.12));
  } else if (style === 'long') {
    blob(9, 6, 30, 32, look.hair);
  } else if (style === 'bob') {
    blob(9, 6, 30, 22, look.hair);
  }
  // face
  blob(13, 8, 22, 26, sk);
  r(13, 30, 22, 4, shade(sk, -0.04));
  // front hair
  if (style === 'hijab' || style === 'ghutra') {
    blob(11, 4, 26, 6, wrap);
    r(11, 10, 3, 22, wrap); r(34, 10, 3, 22, wrap);
    r(14, 9, 20, 1, shade(wrap, -0.1));
    if (style === 'ghutra') { r(11, 6, 26, 2, '#222'); }
  } else if (style !== 'bald') {
    blob(12, 5, 24, 6, look.hair);
    r(12, 10, 3, 8, look.hair); r(33, 10, 3, 8, look.hair);
    r(16, 10, 6, 2, look.hair);
    if (style === 'bun') blob(19, 1, 10, 5, look.hair);
  }
  // eyes & brows
  const eye = '#2a2138';
  const ey = 19;
  const brow = style === 'hijab' || style === 'ghutra' ? '#3b2a24' : look.hair;
  const browTilt = expr === 'sad' || expr === 'worried' ? 1 : expr === 'surprised' ? -1 : 0;
  r(16, ey - 4 - (browTilt < 0 ? 1 : 0), 5, 1, brow);
  r(27, ey - 4 - (browTilt < 0 ? 1 : 0), 5, 1, brow);
  if (browTilt > 0) { r(20, ey - 5, 1, 1, brow); r(27, ey - 5, 1, 1, brow); }
  if (expr === 'happy' || expr === 'proud') {
    r(16, ey + 1, 1, 1, eye); r(17, ey, 3, 1, eye); r(20, ey + 1, 1, 1, eye);
    r(27, ey + 1, 1, 1, eye); r(28, ey, 3, 1, eye); r(31, ey + 1, 1, 1, eye);
  } else {
    const eh = expr === 'surprised' ? 5 : 4;
    const lookDown = expr === 'sad' ? 1 : 0;
    r(17, ey - 1 + lookDown, 3, eh, eye); r(28, ey - 1 + lookDown, 3, eh, eye);
    r(18, ey - 1 + lookDown, 1, 1, '#ffffff'); r(29, ey - 1 + lookDown, 1, 1, '#ffffff');
  }
  if (look.glasses) {
    ctx.strokeStyle = OUT; ctx.lineWidth = P * 0.8;
    ctx.strokeRect(15 * P, 16 * P, 7 * P, 7 * P);
    ctx.strokeRect(26 * P, 16 * P, 7 * P, 7 * P);
    r(22, 19, 4, 1, OUT);
  }
  // blush
  ctx.fillStyle = 'rgba(255,120,130,0.35)';
  ctx.fillRect(15 * P, 25 * P, 4 * P, 2 * P);
  ctx.fillRect(29 * P, 25 * P, 4 * P, 2 * P);
  // nose
  r(23, 24, 2, 1, shade(sk, -0.18));
  // beard
  if (look.beard) { r(14, 27, 20, 7, look.beard); r(17, 34, 14, 2, look.beard); }
  // mouth
  const m = '#7a3344';
  const my = 28;
  switch (expr) {
    case 'happy': r(20, my, 8, 1, m); r(21, my + 1, 6, 2, '#c04a5a'); r(22, my + 3, 4, 1, m); break;
    case 'proud': r(20, my, 1, 1, m); r(21, my + 1, 6, 1, m); r(27, my, 1, 1, m); break;
    case 'sad': r(21, my + 2, 6, 1, m); r(20, my + 3, 1, 1, m); r(27, my + 3, 1, 1, m); break;
    case 'worried': r(20, my + 1, 2, 1, m); r(22, my, 2, 1, m); r(24, my + 1, 2, 1, m); r(26, my, 2, 1, m); break;
    case 'surprised': r(22, my, 4, 4, m); r(23, my + 1, 2, 2, '#c04a5a'); break;
    default: r(21, my + 1, 6, 1, m); r(20, my, 1, 1, m); r(27, my, 1, 1, m);
  }
  return c;
}

const portraitCache = new Map<string, string>();
export function portraitURL(look: Look, expr: Expr = 'normal', key = '') {
  const k = key + JSON.stringify(look) + expr;
  if (!portraitCache.has(k)) portraitCache.set(k, drawPortrait(look, expr).toDataURL());
  return portraitCache.get(k)!;
}

export function avatarURL(look: Look, scale = 4) {
  const { c, ctx } = makeCanvas(16 * scale, 24 * scale);
  drawCharacter(ctx, look, 'down', 0, scale, 0, 0);
  return c.toDataURL();
}

// ======================================================================= tiles (32x32, art pixel 2)
const T = 32;
export const PAL = {
  grass: '#a8d8a0', grass2: '#98cc92', grass3: '#8cc088', path: '#f2e6cc', path2: '#e2d1ad',
  plaza: '#e9e1f7', plaza2: '#d8cdef', hedge: '#6fae7c', hedge2: '#5a9a6a', water: '#8fcdf2', water2: '#c6e8fb',
  wall: '#fff3df', wall2: '#ead7b8', floorWood: '#e8c79c', floorWood2: '#d9b585', tile: '#f4f0ff', tile2: '#dcd3f2',
  carpet: '#b9a6e8', carpet2: '#a793dc', iwall: '#cfc2f0', iwall2: '#b8a8e6',
};

export function drawTile(ctx: Ctx, ch: string, x: number, y: number, seed: number, roof?: string) {
  const R = rng(seed * 7919 + 13);
  const { r } = painter(ctx, 2, x, y);
  const fill = (c: string) => { ctx.fillStyle = c; ctx.fillRect(x, y, T, T); };
  switch (ch) {
    case '.': case ',': {
      fill(PAL.grass);
      for (let i = 0; i < 6; i++) { const gx = (R() * 15) | 0, gy = (R() * 15) | 0; r(gx, gy, 1, 2, i % 2 ? PAL.grass2 : PAL.grass3); }
      if (ch === ',') {
        const cols = ['#ff9a85', '#ffd36e', '#ffffff', '#c9a7ff'];
        for (let i = 0; i < 4; i++) { const fx = 1 + ((R() * 13) | 0), fy = 1 + ((R() * 13) | 0); const col = cols[(R() * 4) | 0]; r(fx, fy, 2, 2, col); r(fx, fy + 2, 1, 1, PAL.hedge2); }
      }
      break;
    }
    case '#': {
      fill(PAL.path);
      ctx.fillStyle = PAL.path2;
      ctx.fillRect(x, y + 15, T, 2); ctx.fillRect(x + ((seed % 2) ? 8 : 22), y, 2, 15); ctx.fillRect(x + ((seed % 2) ? 20 : 6), y + 17, 2, 15);
      if (R() < 0.3) r(3 + ((R() * 10) | 0), 3 + ((R() * 10) | 0), 1, 1, '#d8c39a');
      break;
    }
    case '=': {
      fill(PAL.plaza);
      ctx.fillStyle = PAL.plaza2; ctx.fillRect(x, y, T, 2); ctx.fillRect(x, y, 2, T);
      r(7, 7, 2, 2, '#f7f2ff');
      break;
    }
    case 'h': {
      fill(PAL.grass);
      ctx.fillStyle = PAL.hedge2; ctx.beginPath(); ctx.roundRect(x, y + 4, T, T - 4, 8); ctx.fill();
      ctx.fillStyle = PAL.hedge; ctx.beginPath(); ctx.roundRect(x, y + 2, T, T - 8, 8); ctx.fill();
      r(3, 3, 3, 2, '#8fcb98'); r(10, 5, 3, 2, '#8fcb98');
      break;
    }
    case '~': {
      fill(PAL.water);
      r(2 + (seed % 5), 4, 4, 1, PAL.water2); r(9, 10 + (seed % 3), 4, 1, PAL.water2);
      break;
    }
    case 'w': case 'o': case 'd': {
      fill(PAL.wall);
      ctx.fillStyle = PAL.wall2;
      for (let i = 0; i < 4; i++) ctx.fillRect(x, y + i * 8 + 7, T, 1);
      if (ch === 'o') {
        r(3, 3, 10, 10, OUT); r(4, 4, 8, 8, '#a9d4f5'); r(4, 4, 3, 3, '#e3f3ff'); r(7, 4, 1, 8, OUT); r(4, 8, 8, 1, OUT);
        r(3, 13, 10, 1, '#ffffff');
      }
      if (ch === 'd') {
        r(2, 1, 12, 15, OUT); r(3, 2, 10, 14, '#a8744a'); r(3, 2, 10, 2, '#c08a5a'); r(7, 2, 2, 14, '#8a5a3a');
        r(5, 9, 1, 2, '#ffd36e'); r(10, 9, 1, 2, '#ffd36e'); r(1, 15, 14, 1, '#d8c39a');
      }
      break;
    }
    case 'r': {
      const c0 = roof || '#c9a7ff';
      fill(c0);
      ctx.fillStyle = shade(c0, -0.12);
      for (let i = 0; i < 4; i++) ctx.fillRect(x, y + i * 8 + 6, T, 2);
      ctx.fillStyle = shade(c0, 0.2);
      for (let i = 0; i < 4; i++) ctx.fillRect(x + ((i % 2) ? 0 : 8), y + i * 8, 2, 6), ctx.fillRect(x + ((i % 2) ? 16 : 24), y + i * 8, 2, 6);
      break;
    }
    case 'R': { // roof eave (bottom edge of roof)
      const c0 = roof || '#c9a7ff';
      fill(PAL.wall);
      ctx.fillStyle = shade(c0, -0.25); ctx.fillRect(x, y, T, 10);
      ctx.fillStyle = c0; ctx.fillRect(x, y, T, 7);
      ctx.fillStyle = 'rgba(60,40,80,0.18)'; ctx.fillRect(x, y + 10, T, 4);
      ctx.fillStyle = PAL.wall2; ctx.fillRect(x, y + 23, T, 1);
      break;
    }
    case 'f': {
      fill(PAL.floorWood);
      ctx.fillStyle = PAL.floorWood2;
      ctx.fillRect(x, y + 7, T, 1); ctx.fillRect(x, y + 15, T, 1); ctx.fillRect(x, y + 23, T, 1); ctx.fillRect(x, y + 31, T, 1);
      ctx.fillRect(x + (seed % 4) * 8, y, 1, 7); ctx.fillRect(x + ((seed + 2) % 4) * 8, y + 8, 1, 7);
      ctx.fillRect(x + ((seed + 1) % 4) * 8, y + 16, 1, 7); ctx.fillRect(x + ((seed + 3) % 4) * 8, y + 24, 1, 7);
      break;
    }
    case 't': {
      fill(((seed + (seed >> 8)) % 2) ? PAL.tile : '#ffffff');
      ctx.fillStyle = PAL.tile2; ctx.fillRect(x, y, T, 1); ctx.fillRect(x, y, 1, T);
      break;
    }
    case 'c': {
      fill(PAL.carpet);
      ctx.fillStyle = PAL.carpet2;
      for (let i = 0; i < T; i += 8) ctx.fillRect(x + i, y + (i % 16 ? 4 : 0), 2, 2);
      break;
    }
    case 'W': case 'O': {
      fill(PAL.iwall);
      ctx.fillStyle = PAL.iwall2; ctx.fillRect(x, y + 26, T, 6);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y + 25, T, 1);
      if (ch === 'O') { r(2, 2, 12, 10, OUT); r(3, 3, 10, 8, '#bfe3ff'); r(3, 3, 4, 3, '#eaf6ff'); r(8, 3, 1, 8, OUT); }
      break;
    }
    case 'X': {
      fill(PAL.floorWood2);
      r(1, 0, 14, 16, '#7d5a8a'); r(2, 0, 12, 16, '#9d7ab0');
      r(4, 6, 8, 4, '#ffd36e'); // exit mat
      break;
    }
    case 'k': default:
      fill('#2b2350');
  }
}

// ======================================================================= objects
export interface ObjDef { w: number; h: number; foot: [number, number]; draw: (ctx: Ctx) => void }

function obj(w: number, h: number, foot: [number, number], draw: (ctx: Ctx, p: ReturnType<typeof painter>) => void): ObjDef {
  return { w, h, foot, draw: (ctx) => draw(ctx, painter(ctx, 2)) };
}

const BOOK = ['#ff9a85', '#8fb8ff', '#ffd36e', '#a8d5a2', '#c9a7ff', '#f4f0ff', '#ff7f9f', '#7fd8d8'];

export const OBJECTS: Record<string, ObjDef> = {
  tree: obj(64, 80, [1, 1], (ctx, { r, blob }) => {
    blob(14, 26, 4, 13, '#9a6a44'); r(15, 26, 1, 13, '#b8845a');
    blob(5, 6, 22, 18, '#6fae7c'); blob(3, 12, 26, 10, '#6fae7c'); blob(8, 2, 16, 8, '#7fbe8a');
    r(8, 6, 6, 3, '#9fd8a8'); r(6, 12, 4, 3, '#9fd8a8'); r(18, 4, 4, 2, '#9fd8a8');
    r(4, 20, 24, 3, '#5a9a6a');
  }),
  blossom: obj(64, 80, [1, 1], (ctx, { r, blob }) => {
    blob(14, 26, 4, 13, '#9a6a44');
    blob(5, 6, 22, 18, '#ffb3c1'); blob(3, 12, 26, 10, '#ffb3c1'); blob(8, 2, 16, 8, '#ffc9d3');
    r(8, 6, 3, 2, '#ffffff'); r(20, 10, 3, 2, '#ffffff'); r(12, 16, 3, 2, '#ffe0e6'); r(4, 20, 24, 3, '#f08aa0');
  }),
  palm: obj(64, 96, [1, 1], (ctx, { r, blob }) => {
    for (let i = 0; i < 13; i++) { r(15 + (i > 8 ? 1 : 0), 18 + i * 2, 3, 2, i % 2 ? '#b88a5a' : '#9a6a44'); }
    r(14, 18, 1, 26, OUT); r(19, 18, 1, 26, OUT);
    const leaf = (x: number, y: number, w: number, dy: number) => { for (let i = 0; i < w; i++) r(x + i, y + Math.round((i * dy) / w), 1, 3, i % 3 ? '#6fae7c' : '#5a9a6a'); };
    leaf(2, 10, 14, 6); leaf(18, 16, 14, -6); leaf(4, 4, 12, 10); leaf(18, 13, 12, -9); leaf(10, 1, 8, 14); leaf(16, 15, 6, -14);
    blob(14, 15, 5, 4, '#8a5a3a'); r(15, 16, 1, 1, '#c08a5a');
  }),
  lamp: obj(32, 64, [1, 1], (ctx, { r, blob }) => {
    r(7, 8, 2, 22, '#5a5a7a'); blob(5, 29, 6, 2, '#5a5a7a');
    blob(4, 3, 8, 6, '#fff6c8'); r(5, 4, 6, 4, '#ffffff'); r(3, 2, 10, 1, '#5a5a7a');
  }),
  bench: obj(64, 40, [2, 1], (ctx, { r, blob }) => {
    blob(2, 4, 28, 3, '#c08a5a'); blob(2, 10, 28, 3, '#c08a5a'); r(3, 7, 2, 3, '#7a5a3a'); r(27, 7, 2, 3, '#7a5a3a');
    r(4, 13, 2, 6, '#5a4a6a'); r(26, 13, 2, 6, '#5a4a6a');
  }),
  notice: obj(64, 64, [2, 1], (ctx, { r, blob }) => {
    r(4, 18, 2, 14, '#7a5a3a'); r(26, 18, 2, 14, '#7a5a3a');
    blob(2, 2, 28, 18, '#c08a5a'); r(3, 3, 26, 16, '#e8c79c');
    r(5, 5, 7, 8, '#ffffff'); r(14, 4, 6, 6, '#ffd36e'); r(22, 5, 6, 9, '#c9e4ff'); r(13, 12, 8, 5, '#ffb3c1');
    r(8, 5, 1, 1, '#ff5a5a'); r(17, 4, 1, 1, '#ff5a5a'); r(25, 5, 1, 1, '#ff5a5a');
  }),
  pillar: obj(32, 80, [1, 1], (ctx, { r, blob }) => {
    blob(2, 4, 12, 34, '#fff3df'); r(3, 6, 2, 30, '#ffffff'); r(11, 6, 2, 30, '#ead7b8');
    blob(1, 1, 14, 4, '#c9a7ff'); r(4, 0, 8, 1, '#ffd36e');
  }),
  gateL: obj(32, 56, [1, 1], (ctx, { r }) => {
    for (let i = 0; i < 4; i++) r(1 + i * 4, 4, 2, 22, '#5a5a7a');
    r(0, 4, 16, 2, '#5a5a7a'); r(0, 14, 16, 2, '#5a5a7a'); r(0, 24, 16, 2, '#5a5a7a');
    r(6, 0, 4, 4, '#ffd36e');
  }),
  fountain: obj(128, 112, [4, 3], (ctx, { r, blob }) => {
    blob(4, 22, 56, 30, '#e9e1f7'); r(6, 24, 52, 22, '#8fcdf2'); r(10, 28, 12, 2, '#c6e8fb'); r(36, 36, 14, 2, '#c6e8fb');
    r(4, 46, 56, 6, '#d8cdef');
    blob(26, 12, 12, 18, '#f4f0ff'); r(27, 14, 3, 14, '#ffffff');
    blob(22, 8, 20, 5, '#e9e1f7'); r(28, 2, 8, 6, '#8fcdf2');
  }),
  sign: obj(96, 32, [3, 1], (ctx, { r, blob }) => {
    blob(2, 2, 44, 10, '#c08a5a'); r(3, 3, 42, 8, '#e8c79c'); r(10, 12, 2, 3, '#7a5a3a'); r(36, 12, 2, 3, '#7a5a3a');
  }),
  // ---- interiors
  bookshelf: obj(64, 72, [2, 1], (ctx, { r, blob }) => {
    blob(1, 2, 30, 32, '#a8744a'); r(2, 3, 28, 30, '#8a5a3a');
    const R = rng(77);
    for (let s = 0; s < 4; s++) {
      let x = 3;
      while (x < 28) { const w = 2 + ((R() * 2) | 0); const h = 5 + ((R() * 2) | 0); r(x, 3 + s * 8 + (7 - h), w, h, BOOK[(R() * BOOK.length) | 0]); x += w; }
      r(2, 10 + s * 8, 28, 1, '#c08a5a');
    }
  }),
  desk: obj(64, 48, [2, 1], (ctx, { r, blob }) => {
    blob(1, 6, 30, 8, '#c08a5a'); r(2, 7, 28, 2, '#d9a06a'); r(3, 14, 2, 8, '#7a5a3a'); r(27, 14, 2, 8, '#7a5a3a');
    r(6, 4, 8, 3, '#ffffff'); r(7, 4, 6, 1, '#c9e4ff'); r(20, 3, 3, 4, '#ff9a85');
  }),
  computer: obj(64, 56, [2, 1], (ctx, { r, blob }) => {
    blob(1, 12, 30, 8, '#c9b8f0'); r(2, 13, 28, 2, '#ddd2f7'); r(3, 20, 2, 7, '#7a6ab8'); r(27, 20, 2, 7, '#7a6ab8');
    blob(8, 0, 16, 11, '#3d3354'); r(9, 1, 14, 9, '#7fd8f0'); r(10, 2, 6, 1, '#e0faff'); r(10, 4, 9, 1, '#bff0ff'); r(10, 6, 7, 1, '#bff0ff');
    r(15, 11, 2, 2, '#3d3354'); r(10, 14, 12, 2, '#ffffff');
  }),
  typewriter: obj(64, 48, [2, 1], (ctx, { r, blob }) => {
    blob(1, 8, 30, 8, '#c08a5a'); r(3, 16, 2, 7, '#7a5a3a'); r(27, 16, 2, 7, '#7a5a3a');
    blob(9, 3, 14, 6, '#ff9a85'); r(10, 0, 12, 4, '#ffffff'); r(11, 6, 10, 1, '#3d3354'); r(11, 8, 10, 1, '#3d3354');
  }),
  table: obj(64, 48, [2, 1], (ctx, { r, blob }) => {
    blob(2, 6, 28, 10, '#e8c79c'); r(3, 7, 26, 2, '#f6dcb8'); r(6, 16, 2, 6, '#a8744a'); r(24, 16, 2, 6, '#a8744a');
    r(8, 8, 5, 4, '#8fb8ff'); r(18, 9, 6, 3, '#ffffff');
  }),
  chair: obj(32, 40, [1, 1], (ctx, { r, blob }) => {
    blob(3, 2, 10, 8, '#ff9a85'); blob(3, 10, 10, 4, '#e77562'); r(4, 14, 2, 4, '#7a5a3a'); r(10, 14, 2, 4, '#7a5a3a');
  }),
  plant: obj(32, 56, [1, 1], (ctx, { r, blob }) => {
    blob(4, 18, 8, 8, '#e77562'); r(5, 18, 6, 2, '#ff9a85');
    blob(2, 6, 5, 10, '#6fae7c'); blob(9, 4, 5, 12, '#7fbe8a'); blob(6, 1, 4, 14, '#6fae7c'); r(7, 3, 1, 6, '#9fd8a8');
  }),
  cabinet: obj(32, 56, [1, 1], (ctx, { r, blob }) => {
    blob(2, 2, 12, 24, '#a9b8d8'); r(3, 3, 10, 7, '#c9d4ec'); r(3, 11, 10, 7, '#c9d4ec'); r(3, 19, 10, 6, '#c9d4ec');
    r(7, 6, 2, 1, OUT); r(7, 14, 2, 1, OUT); r(7, 21, 2, 1, OUT);
  }),
  counter: obj(96, 48, [3, 1], (ctx, { r, blob }) => {
    blob(1, 6, 46, 14, '#c9a7ff'); r(1, 6, 46, 3, '#e8ddff'); r(2, 12, 44, 1, '#a793dc');
    r(6, 3, 8, 4, '#ffffff'); r(30, 2, 6, 5, '#ffd36e'); r(40, 4, 4, 3, '#a8d5a2');
  }),
  sofa: obj(96, 48, [3, 1], (ctx, { r, blob }) => {
    blob(2, 4, 44, 8, '#8fb8ff'); blob(2, 11, 44, 7, '#7aa4ec'); blob(0, 8, 4, 11, '#6a94dc'); blob(44, 8, 4, 11, '#6a94dc');
    r(8, 13, 14, 1, '#9fc4ff'); r(26, 13, 14, 1, '#9fc4ff');
  }),
  podium: obj(32, 56, [1, 1], (ctx, { r, blob }) => {
    blob(2, 8, 12, 18, '#a8744a'); blob(1, 4, 14, 5, '#c08a5a'); r(5, 12, 6, 3, '#ffd36e');
  }),
  printer: obj(32, 40, [1, 1], (ctx, { r, blob }) => {
    blob(2, 6, 12, 8, '#e9e1f7'); r(3, 2, 10, 4, '#ffffff'); r(4, 9, 8, 1, OUT); r(11, 7, 1, 1, '#8fd19e');
    r(3, 14, 2, 4, '#7a6ab8'); r(11, 14, 2, 4, '#7a6ab8');
  }),
  bin: obj(32, 32, [1, 1], (ctx, { r, blob }) => {
    blob(4, 4, 8, 10, '#8fd19e'); r(5, 5, 6, 1, '#b7e6c2'); r(6, 7, 1, 6, '#6fae7c'); r(9, 7, 1, 6, '#6fae7c');
  }),
  board: obj(160, 72, [5, 1], (ctx, { r, blob }) => {
    blob(2, 2, 76, 26, '#a8744a'); r(4, 4, 72, 22, '#3f6b5a');
    for (let i = 0; i < 5; i++) r(8, 7 + i * 4, 20 + ((i * 13) % 30), 1, '#e8f5ee');
    r(48, 8, 22, 12, '#4f7b6a'); r(4, 26, 72, 2, '#c08a5a');
  }),
  rug: obj(160, 96, [5, 3], (ctx, { r }) => {
    ctx.fillStyle = '#ffd9a8'; ctx.beginPath(); ctx.roundRect(4, 4, 152, 88, 16); ctx.fill();
    ctx.strokeStyle = '#ff9a85'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(14, 14, 132, 68, 10); ctx.stroke();
    r(36, 22, 8, 8, '#c9a7ff'); r(36, 18, 8, 2, '#c9a7ff');
  }),
  clock: obj(32, 32, [0, 0], (ctx, { r, blob }) => {
    blob(3, 3, 10, 10, '#ffffff'); r(8, 5, 1, 4, OUT); r(8, 8, 3, 1, OUT);
  }),
  painting: obj(64, 40, [0, 0], (ctx, { r, blob }) => {
    blob(2, 2, 28, 16, '#ffd36e'); r(4, 4, 24, 12, '#a9d4f5'); r(4, 11, 24, 5, '#a8d5a2'); r(18, 5, 4, 4, '#fff6c8');
  }),
  stage: obj(192, 80, [6, 2], (ctx, { r }) => {
    ctx.fillStyle = '#c04a5a'; ctx.beginPath(); ctx.roundRect(4, 6, 184, 70, 10); ctx.fill();
    ctx.fillStyle = '#e06a7a'; ctx.beginPath(); ctx.roundRect(10, 12, 172, 58, 8); ctx.fill();
    r(10, 16, 76, 1, '#ffd36e'); r(10, 32, 76, 1, '#ffd36e');
  }),
  papers: obj(32, 24, [0, 0], (ctx, { r }) => {
    r(2, 3, 7, 5, '#ffffff'); r(7, 6, 7, 5, '#f4f0ff'); r(3, 4, 4, 1, '#c9b8f0'); r(8, 7, 4, 1, '#c9b8f0');
  }),
  // ---- glowing collectibles (vocab)
  'v-cardiac': obj(32, 32, [0, 0], (ctx, { r, blob }) => {
    blob(2, 2, 12, 12, '#ffffff'); r(4, 5, 3, 3, '#ff5a6e'); r(8, 5, 3, 3, '#ff5a6e'); r(4, 7, 7, 2, '#ff5a6e'); r(5, 9, 5, 2, '#ff5a6e'); r(7, 11, 1, 1, '#ff5a6e');
    r(3, 12, 3, 1, '#3d8a5a'); r(6, 11, 1, 1, '#3d8a5a'); r(7, 13, 1, 1, '#3d8a5a'); r(8, 12, 5, 1, '#3d8a5a');
  }),
  'v-doctorate': obj(32, 32, [0, 0], (ctx, { r, blob }) => {
    blob(1, 4, 14, 10, '#fff6e6'); r(3, 6, 10, 1, '#c9b8f0'); r(3, 8, 8, 1, '#c9b8f0'); r(10, 10, 3, 3, '#ff5a6e');
    r(3, 0, 10, 2, '#2f2a4a'); r(6, 2, 4, 2, '#2f2a4a'); r(12, 1, 1, 4, '#ffd36e');
  }),
  'v-enclose': obj(32, 32, [0, 0], (ctx, { r, blob }) => {
    blob(1, 5, 14, 9, '#fff1d6'); r(4, 2, 8, 6, '#ffffff'); r(5, 3, 6, 1, '#c9b8f0'); r(1, 6, 7, 1, '#e8c79c'); r(8, 6, 7, 1, '#e8c79c'); r(7, 7, 2, 1, '#e8c79c');
    r(7, 9, 2, 2, '#ff5a6e');
  }),
  'v-extensive': obj(32, 32, [0, 0], (ctx, { r, blob }) => {
    blob(2, 12, 12, 2, '#ff9a85'); blob(3, 9, 11, 2, '#8fb8ff'); blob(2, 6, 12, 2, '#ffd36e'); blob(4, 3, 10, 2, '#a8d5a2'); blob(3, 0, 11, 2, '#c9a7ff');
  }),
  'v-in-advance': obj(32, 32, [0, 0], (ctx, { r, blob }) => {
    blob(2, 2, 12, 12, '#ffffff'); r(2, 2, 12, 3, '#ff5a6e'); r(4, 1, 1, 2, OUT); r(11, 1, 1, 2, OUT);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) r(3 + j * 3, 6 + i * 3, 2, 2, '#e9e1f7');
    r(9, 9, 2, 2, '#3d8a5a');
  }),
  'v-attestation': obj(32, 32, [0, 0], (ctx, { r, blob }) => {
    blob(2, 1, 12, 14, '#ffffff'); r(4, 3, 8, 1, '#c9b8f0'); r(4, 5, 8, 1, '#c9b8f0'); r(4, 7, 6, 1, '#c9b8f0');
    blob(9, 10, 4, 4, '#7a6ab8'); r(10, 11, 2, 2, '#c9b8f0'); r(3, 12, 4, 1, '#3d3354');
  }),
  'v-reference': obj(32, 32, [0, 0], (ctx, { r, blob }) => {
    blob(1, 2, 14, 12, '#fff6e6'); r(3, 4, 10, 1, '#c9b8f0'); r(3, 6, 10, 1, '#c9b8f0'); r(3, 8, 7, 1, '#c9b8f0');
    r(3, 11, 2, 1, '#3d3354'); r(5, 10, 2, 1, '#3d3354'); r(7, 11, 3, 1, '#3d3354'); r(11, 10, 3, 3, '#ffd36e');
  }),
  // ---- documents (mission 4)
  'doc-certificate': obj(32, 32, [0, 0], (ctx, { r, blob }) => { blob(1, 3, 14, 10, '#fff6e6'); r(3, 5, 10, 1, '#ffd36e'); r(4, 7, 8, 1, '#c9b8f0'); r(11, 10, 3, 3, '#ff5a6e'); }),
  'doc-attestation': obj(32, 32, [0, 0], (ctx, { r, blob }) => { blob(2, 1, 12, 14, '#ffffff'); r(4, 3, 8, 1, '#c9b8f0'); r(4, 5, 8, 1, '#c9b8f0'); blob(9, 10, 4, 4, '#3f6bb8'); }),
  'doc-reference': obj(32, 32, [0, 0], (ctx, { r, blob }) => { blob(1, 4, 14, 9, '#fff1d6'); r(1, 5, 7, 1, '#e8c79c'); r(8, 5, 7, 1, '#e8c79c'); r(6, 8, 4, 3, '#ffd36e'); }),
  'doc-form': obj(32, 32, [0, 0], (ctx, { r, blob }) => { blob(2, 1, 12, 14, '#ffffff'); for (let i = 0; i < 5; i++) { r(4, 3 + i * 2, 2, 1, '#8fb8ff'); r(7, 3 + i * 2, 5, 1, '#c9b8f0'); } }),
  'doc-statement': obj(32, 32, [0, 0], (ctx, { r, blob }) => { blob(2, 1, 12, 14, '#fff6e6'); for (let i = 0; i < 6; i++) r(4, 3 + i * 2, 8 - (i % 3), 1, '#7a6ab8'); }),
  'decoy-comic': obj(32, 32, [0, 0], (ctx, { r, blob }) => { blob(2, 1, 12, 14, '#8fd19e'); r(4, 3, 8, 5, '#ffd36e'); r(6, 4, 3, 3, '#ff5a6e'); r(4, 10, 8, 1, '#ffffff'); }),
  'decoy-receipt': obj(32, 32, [0, 0], (ctx, { r, blob }) => { blob(4, 1, 8, 14, '#ffffff'); for (let i = 0; i < 5; i++) r(5, 3 + i * 2, 6, 1, '#b8b8c8'); }),
  folder: obj(64, 48, [2, 1], (ctx, { r, blob }) => {
    blob(1, 8, 30, 8, '#c08a5a'); r(3, 16, 2, 7, '#7a5a3a'); r(27, 16, 2, 7, '#7a5a3a');
    blob(8, 2, 16, 7, '#ffd36e'); r(8, 1, 6, 2, '#ffd36e'); r(9, 5, 14, 1, '#e8b84a');
  }),
};

// small textures
export function sparkTexture() {
  const { c, ctx } = makeCanvas(8, 8);
  const g = ctx.createRadialGradient(4, 4, 0, 4, 4, 4);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,240,180,0.8)');
  g.addColorStop(1, 'rgba(255,220,120,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 8, 8);
  return c;
}

export function glowTexture() {
  const { c, ctx } = makeCanvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,245,190,0.85)');
  g.addColorStop(0.4, 'rgba(255,230,150,0.35)');
  g.addColorStop(1, 'rgba(255,220,120,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return c;
}

export function bubbleTexture(label: string) {
  const { c, ctx } = makeCanvas(28, 30);
  ctx.fillStyle = OUT;
  ctx.beginPath(); ctx.roundRect(1, 1, 26, 22, 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(10, 22); ctx.lineTo(14, 29); ctx.lineTo(18, 22); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.roundRect(3, 3, 22, 18, 5); ctx.fill();
  ctx.fillStyle = OUT;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 14, 13);
  return c;
}

export function arrowTexture() {
  const { c, ctx } = makeCanvas(24, 24);
  ctx.fillStyle = OUT;
  ctx.beginPath(); ctx.moveTo(2, 4); ctx.lineTo(22, 4); ctx.lineTo(12, 22); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd36e';
  ctx.beginPath(); ctx.moveTo(6, 6); ctx.lineTo(18, 6); ctx.lineTo(12, 17); ctx.closePath(); ctx.fill();
  return c;
}

export function lockTexture() {
  const { c, ctx } = makeCanvas(20, 22);
  ctx.strokeStyle = OUT; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(10, 8, 5, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = OUT; ctx.fillRect(2, 8, 16, 13);
  ctx.fillStyle = '#ffd36e'; ctx.fillRect(4, 10, 12, 9);
  ctx.fillStyle = OUT; ctx.fillRect(9, 12, 2, 4);
  return c;
}

export function padTexture(color: string, w: number, h: number) {
  const { c, ctx } = makeCanvas(w, h);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.beginPath(); ctx.roundRect(2, 2, w - 4, h - 4, 14); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.setLineDash([10, 6]);
  ctx.beginPath(); ctx.roundRect(8, 8, w - 16, h - 16, 10); ctx.stroke();
  return c;
}
