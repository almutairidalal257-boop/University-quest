import Phaser from 'phaser';
import { rooms, isSolidChar, type RoomDef, type Ent } from './maps';
import { LOOKS } from '../game/looks';
import {
  OBJECTS, characterSheet, drawTile, sparkTexture, glowTexture, bubbleTexture, arrowTexture, lockTexture, padTexture, makeCanvas, type Dir,
} from '../game/art';
import { game, ui, isBlocking } from '../game/state';
import { bus, touchInput } from '../game/store';
import { sfx } from '../game/audio';

const T = 32;
const DIRS: Dir[] = ['down', 'left', 'right', 'up'];

export class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }
  create() {
    const tx = this.textures;
    // characters
    Object.entries(LOOKS).forEach(([id, look]) => {
      const key = `char-${id}`;
      if (tx.exists(key)) return;
      const canvas = characterSheet(look);
      const t = tx.addCanvas(key, canvas)!;
      for (let row = 0; row < 4; row++) for (let f = 0; f < 3; f++) t.add(row * 3 + f, 0, f * 32, row * 48, 32, 48);
      DIRS.forEach((d, row) => {
        this.anims.create({ key: `${key}-walk-${d}`, frames: [1, 0, 2, 0].map((f) => ({ key, frame: row * 3 + f })), frameRate: 8, repeat: -1 });
      });
    });
    // objects
    Object.entries(OBJECTS).forEach(([key, def]) => {
      if (tx.exists(key)) return;
      const { c, ctx } = makeCanvas(def.w, def.h);
      def.draw(ctx);
      tx.addCanvas(key, c);
    });
    tx.addCanvas('spark', sparkTexture());
    tx.addCanvas('glow', glowTexture());
    tx.addCanvas('bubble-E', bubbleTexture('E'));
    tx.addCanvas('bubble-!', bubbleTexture('!'));
    tx.addCanvas('arrow', arrowTexture());
    tx.addCanvas('lock', lockTexture());
    tx.addCanvas('pad-good', padTexture('#7fcf8f', 128, 96));
    tx.addCanvas('pad-poor', padTexture('#ff8f7a', 128, 96));
    const petal = makeCanvas(6, 4);
    petal.ctx.fillStyle = '#ffc9d3'; petal.ctx.beginPath(); petal.ctx.ellipse(3, 2, 3, 2, 0, 0, Math.PI * 2); petal.ctx.fill();
    tx.addCanvas('petal', petal.c);
    const screen = makeCanvas(28, 18);
    screen.ctx.fillStyle = '#bff6ff'; screen.ctx.fillRect(0, 0, 28, 18);
    tx.addCanvas('screen-glow', screen.c);

    const s = game.get();
    this.scene.start('world', { room: s.room || 'campus', spawn: s.pos ? [s.pos.x, s.pos.y] : null });
  }
}

interface EntView { ent: Ent; sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image; extras: Phaser.GameObjects.GameObject[]; ix: number; iy: number; wanderT?: { x: number; y: number; wait: number } }

export class WorldScene extends Phaser.Scene {
  room!: RoomDef;
  player!: Phaser.GameObjects.Sprite;
  px = 0; py = 0;
  facing: Dir = 'up';
  views = new Map<string, EntView>();
  entSolid = new Set<string>();
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  bubble!: Phaser.GameObjects.Image;
  arrow!: Phaser.GameObjects.Image;
  nearest: EntView | null = null;
  inPad: string | null = null;
  transitioning = false;
  doorCooldown = 0;
  lastSave = 0;
  gateL?: Phaser.GameObjects.Image;
  gateR?: Phaser.GameObjects.Image;
  unsub: (() => void)[] = [];
  objective: { room: string; ent?: string } | null = null;
  attract = false;
  attractT = 0;
  unblockAt = 0;

  constructor() { super('world'); }

  init(data: { room: string; spawn: [number, number] | null }) {
    this.room = rooms()[data.room] || rooms().campus;
    const sp = data.spawn || this.room.spawn;
    this.px = sp[0] * T;
    this.py = sp[1] * T;
    this.views = new Map();
    this.entSolid = new Set();
    this.transitioning = false;
    this.inPad = null;
    this.facing = 'up';
    this.attract = ui.get().screen !== 'play';
  }

  create() {
    const R = this.room;
    // ground layer
    const key = `ground-${R.id}`;
    if (this.textures.exists(key)) this.textures.remove(key);
    const { c, ctx } = makeCanvas(R.w * T, R.h * T);
    for (let y = 0; y < R.h; y++) for (let x = 0; x < R.w; x++) {
      let ch = R.grid[y][x];
      if (ch === 'g' || ch === 'x') ch = ch === 'g' ? '#' : '=';
      drawTile(ctx, ch, x * T, y * T, x * 131 + y * 71, R.roofs[`${x},${y}`]);
    }
    this.textures.addCanvas(key, c);
    this.add.image(0, 0, key).setOrigin(0).setDepth(-1000);

    R.ents.forEach((e) => this.addEnt(e));

    // player
    const s = game.get();
    this.player = this.add.sprite(this.px, this.py, `char-${s.avatar}`, 9).setOrigin(0.5, 1).setVisible(!this.attract);
    this.bubble = this.add.image(0, 0, 'bubble-E').setDepth(100000).setVisible(false).setScale(1);
    this.tweens.add({ targets: this.bubble, scale: 1.12, yoyo: true, repeat: -1, duration: 450 });
    this.arrow = this.add.image(0, 0, 'arrow').setDepth(100001).setVisible(false);

    if (R.id === 'campus') this.setupGate();
    this.refresh();

    // camera
    const cam = this.cameras.main;
    cam.setBounds(0, 0, R.w * T, R.h * T);
    cam.setZoom(R.zoom);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setRoundPixels(true);
    cam.fadeIn(350, 43, 35, 80);

    // ambient particles
    if (R.id === 'campus') {
      this.add.particles(0, 0, 'petal', {
        x: { min: 0, max: R.w * T }, y: -10, lifespan: 14000, speedY: { min: 18, max: 40 }, speedX: { min: -25, max: 25 },
        rotate: { min: 0, max: 360 }, frequency: 500, alpha: { start: 0.9, end: 0.2 }, quantity: 1,
      }).setDepth(90000);
      const f = R.ents.find((e) => e.id === 'fountain')!;
      this.add.particles((f.x + 2) * T, (f.y + 0.2) * T, 'spark', {
        speedY: { min: -110, max: -70 }, speedX: { min: -35, max: 35 }, gravityY: 260, lifespan: 750, frequency: 40, tint: [0xbfe6ff, 0xffffff], scale: { start: 0.9, end: 0.3 },
      }).setDepth((f.y + 3) * T + 1);
    } else {
      this.add.particles(0, 0, 'spark', {
        x: { min: 0, max: R.w * T }, y: { min: 0, max: R.h * T }, lifespan: 4000, speedY: { min: -6, max: 6 }, speedX: { min: -6, max: 6 },
        alpha: { start: 0, end: 0.6, ease: 'Sine.easeInOut' }, scale: 0.5, frequency: 260, tint: 0xfff2c0,
      }).setDepth(90000);
    }

    // input
    const kb = this.input.keyboard!;
    kb.disableGlobalCapture();
    const add = (k: string) => kb.addKey(k, false);
    this.keys = {
      up: add('UP'), down: add('DOWN'), left: add('LEFT'), right: add('RIGHT'),
      w: add('W'), a: add('A'), s: add('S'), d: add('D'), e: add('E'), space: add('SPACE'), enter: add('ENTER'), shift: add('SHIFT'),
    };

    this.unsub.push(
      bus.on('refresh', () => this.refresh()),
      bus.on('gate-open', () => this.openGate()),
      bus.on('celebrate', () => this.celebrate()),
      bus.on('collect-fx', (id: string) => this.collectFx(id)),
      bus.on('objective', (o) => { this.objective = o; this.placeArrow(); }),
      bus.on('goto', (d: { room: string; spawn?: [number, number] }) => this.goto(d.room, d.spawn || rooms()[d.room].spawn)),
      bus.on('attract', (on: boolean) => { this.attract = on; this.player.setVisible(!on); }),
      bus.on('avatar', () => this.player.setTexture(`char-${game.get().avatar}`, 9)),
    );
    this.events.once('shutdown', () => { this.unsub.forEach((u) => u()); this.unsub = []; });
    bus.emit('room-entered', R.id);
    bus.emit('scene-ready');
  }

  // ------------------------------------------------------------ entities
  addEnt(e: Ent) {
    const extras: Phaser.GameObjects.GameObject[] = [];
    let sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
    let ix: number, iy: number;
    if (e.kind === 'npc') {
      const key = `char-${e.tex}`;
      const row = DIRS.indexOf(e.face || 'down');
      sprite = this.add.sprite((e.x + 0.5) * T, (e.y + 1) * T - 4, key, row * 3).setOrigin(0.5, 1);
      ix = (e.x + 0.5) * T; iy = (e.y + 1) * T - 8;
      if (!e.wander) this.entSolid.add(`${e.x},${e.y}`);
      // idle breathing
      this.tweens.add({ targets: sprite, scaleY: 1.03, yoyo: true, repeat: -1, duration: 900 + Math.random() * 400, ease: 'Sine.easeInOut' });
    } else if (e.kind === 'pad') {
      sprite = this.add.image(e.x * T, e.y * T, e.tex!).setOrigin(0).setDepth(-700);
      const label = this.add.text((e.x + 2) * T, (e.y + 1.5) * T, e.label || '', { fontFamily: 'Nunito, Trebuchet MS, sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#ffffff', align: 'center', stroke: '#3d3354', strokeThickness: 4, wordWrap: { width: 110 } }).setOrigin(0.5).setDepth(-690).setResolution(3);
      extras.push(label);
      this.tweens.add({ targets: sprite, alpha: 0.75, yoyo: true, repeat: -1, duration: 1100 });
      ix = (e.x + 2) * T; iy = (e.y + 1.5) * T;
    } else {
      const def = OBJECTS[e.tex!];
      const fw = Math.max(1, def.foot[0]), fh = Math.max(1, def.foot[1]);
      sprite = this.add.image((e.x + fw / 2) * T, (e.y + fh) * T, e.tex!).setOrigin(0.5, 1);
      ix = (e.x + fw / 2) * T; iy = (e.y + fh) * T - 8;
      if (e.solid) for (let j = 0; j < def.foot[1]; j++) for (let i = 0; i < def.foot[0]; i++) this.entSolid.add(`${e.x + i},${e.y + j}`);
      if (e.kind === 'item') {
        sprite.setPosition((e.x + 0.5) * T, (e.y + 1) * T - 6);
        ix = (e.x + 0.5) * T; iy = (e.y + 1) * T - 10;
        const glow = this.add.image(ix, iy - 8, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(iy - 1);
        this.tweens.add({ targets: glow, scale: 1.35, alpha: 0.55, yoyo: true, repeat: -1, duration: 800 });
        this.tweens.add({ targets: sprite, y: sprite.y - 6, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.easeInOut' });
        const em = this.add.particles(ix, iy - 10, 'spark', { speed: { min: 8, max: 30 }, lifespan: 900, frequency: 220, scale: { start: 0.8, end: 0 }, alpha: { start: 1, end: 0 } }).setDepth(iy + 1);
        extras.push(glow, em);
      }
      if (['tree', 'blossom', 'palm'].includes(e.tex!)) {
        this.tweens.add({ targets: sprite, angle: { from: -1.2, to: 1.2 }, yoyo: true, repeat: -1, duration: 1800 + Math.random() * 1200, ease: 'Sine.easeInOut', delay: Math.random() * 1000 });
      }
      if (e.tex === 'computer') {
        const g = this.add.image(sprite.x, sprite.y - 40, 'screen-glow').setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.15).setDepth(sprite.y + 1);
        this.tweens.add({ targets: g, alpha: 0.45, yoyo: true, repeat: -1, duration: 600 + Math.random() * 600 });
        extras.push(g);
      }
      if (e.tex === 'sign' && e.label) {
        extras.push(this.add.text(sprite.x, sprite.y - 17, e.label, { fontFamily: 'Nunito, Trebuchet MS, sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#3d3354' }).setOrigin(0.5).setDepth(-490).setResolution(3));
      }
    }
    sprite.setDepth(e.depth ?? (e.kind === 'pad' ? -700 : sprite.y));
    if (e.interact) {
      sprite.setInteractive({ useHandCursor: true });
      sprite.on('pointerdown', () => this.clickEnt(e.id));
      sprite.on('pointerover', () => this.showName(e));
      sprite.on('pointerout', () => this.hideName());
    }
    const view: EntView = { ent: e, sprite, extras, ix, iy };
    if (e.wander) view.wanderT = { x: sprite.x, y: sprite.y, wait: 1000 };
    this.views.set(e.id, view);
  }

  nameText?: Phaser.GameObjects.Text;
  showName(e: Ent) {
    const v = this.views.get(e.id);
    if (!v || !e.name) return;
    this.hideName();
    this.nameText = this.add.text(v.sprite.x, v.sprite.y - (v.sprite.displayHeight + 26), e.name, { fontFamily: 'Nunito, sans-serif', fontSize: '12px', color: '#fff', backgroundColor: '#3d3354cc', padding: { x: 6, y: 3 } }).setOrigin(0.5).setDepth(100002).setResolution(3);
  }
  hideName() { this.nameText?.destroy(); this.nameText = undefined; }

  refresh() {
    const s = game.get();
    this.views.forEach((v) => {
      const vis = v.ent.visible ? v.ent.visible(s) : true;
      v.sprite.setVisible(vis);
      v.extras.forEach((x) => (x as any).setVisible?.(vis));
      if (v.sprite.input) v.sprite.input.enabled = vis;
      if (v.ent.kind === 'npc' && !v.ent.wander) {
        if (vis) this.entSolid.add(`${v.ent.x},${v.ent.y}`); else this.entSolid.delete(`${v.ent.x},${v.ent.y}`);
      }
    });
    // locks on campus doors
    if (this.room.id === 'campus') {
      this.children.getAll().filter((o) => (o as any).getData?.('lock')).forEach((o) => o.destroy());
      this.room.doors.forEach((d) => {
        if (d.locked && d.locked(s)) {
          const l = this.add.image((d.x + 0.5) * T, d.y * T + 14, 'lock').setDepth(-400).setData('lock', true);
          this.tweens.add({ targets: l, y: l.y - 3, yoyo: true, repeat: -1, duration: 900 });
        }
      });
      if (s.flags.m1_done && this.gateL && this.gateL.x === 21.5 * T) this.openGate(true);
    }
    this.placeArrow();
  }

  // ------------------------------------------------------------ gate
  setupGate() {
    this.gateL = this.add.image(21.5 * T, 24 * T, 'gateL').setOrigin(0.5, 1).setDepth(24 * T);
    this.gateR = this.add.image(22.5 * T, 24 * T, 'gateL').setOrigin(0.5, 1).setDepth(24 * T).setFlipX(true);
    if (game.get().flags.m1_done) this.openGate(true);
  }
  gateOpen() { return !!game.get().flags.m1_done; }
  openGate(instant = false) {
    if (!this.gateL || !this.gateR) return;
    if (instant) { this.gateL.setX(20.6 * T).setScale(0.35, 1); this.gateR.setX(23.4 * T).setScale(0.35, 1); return; }
    this.cameras.main.pan(22 * T, 23.5 * T, 600, 'Sine.easeInOut');
    this.time.delayedCall(700, () => {
      sfx('unlock');
      this.cameras.main.shake(300, 0.004);
      this.tweens.add({ targets: this.gateL, x: 20.6 * T, scaleX: 0.35, duration: 1200, ease: 'Cubic.easeInOut' });
      this.tweens.add({ targets: this.gateR, x: 23.4 * T, scaleX: 0.35, duration: 1200, ease: 'Cubic.easeInOut' });
      this.add.particles(22 * T, 23 * T, 'spark', { speed: { min: 60, max: 220 }, lifespan: 1200, quantity: 60, scale: { start: 1.6, end: 0 }, tint: [0xffd36e, 0xffffff, 0xc9a7ff, 0xff9a85], emitting: false }).setDepth(100000).explode(80);
      this.time.delayedCall(1600, () => this.cameras.main.startFollow(this.player, true, 0.12, 0.12));
    });
  }

  celebrate() {
    this.add.particles(this.px, this.py - 30, 'spark', { speed: { min: 80, max: 200 }, lifespan: 1000, scale: { start: 1.4, end: 0 }, tint: [0xffd36e, 0xffffff, 0xc9a7ff, 0x8fd19e, 0xff9a85], emitting: false }).setDepth(100000).explode(50);
  }

  // ------------------------------------------------------------ collision
  solidAt(tx: number, ty: number) {
    const R = this.room;
    if (tx < 0 || ty < 0 || tx >= R.w || ty >= R.h) return true;
    const ch = R.grid[ty][tx];
    if (ch === 'g') return !this.gateOpen();
    if (isSolidChar(ch)) return true;
    const k = `${tx},${ty}`;
    return R.solidExtra.has(k) || this.entSolid.has(k);
  }
  blocked(x: number, y: number) {
    const hw = 9, top = y - 10, bot = y - 1;
    const pts = [[x - hw, top], [x + hw, top], [x - hw, bot], [x + hw, bot], [x, top], [x, bot]];
    return pts.some(([px, py]) => this.solidAt(Math.floor(px / T), Math.floor(py / T)));
  }

  // ------------------------------------------------------------ loop
  update(time: number, delta: number) {
    if (this.attract) {
      this.attractT += delta / 1000;
      const cam = this.cameras.main;
      cam.stopFollow();
      const W = this.room.w * T;
      cam.centerOn(W / 2 + Math.sin(this.attractT * 0.12) * W * 0.3, 24 * T + Math.cos(this.attractT * 0.09) * 6 * T);
      return;
    }
    if (!(this.cameras.main as any)._follow && !this.transitioning) this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.updateWanderers(delta);
    const blockedUI = isBlocking() || this.transitioning;
    if (blockedUI) this.unblockAt = time + 250;
    const k = this.keys;
    let dx = 0, dy = 0;
    if (!blockedUI) {
      if (k.left.isDown || k.a.isDown || touchInput.left) dx -= 1;
      if (k.right.isDown || k.d.isDown || touchInput.right) dx += 1;
      if (k.up.isDown || k.w.isDown || touchInput.up) dy -= 1;
      if (k.down.isDown || k.s.isDown || touchInput.down) dy += 1;
    }
    const key = `char-${game.get().avatar}`;
    if (dx || dy) {
      const len = Math.hypot(dx, dy);
      const speed = (k.shift.isDown ? 210 : 145) * (delta / 1000);
      const mx = (dx / len) * speed, my = (dy / len) * speed;
      if (!this.blocked(this.px + mx, this.py)) this.px += mx;
      if (!this.blocked(this.px, this.py + my)) this.py += my;
      this.facing = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
      this.player.anims.play(`${key}-walk-${this.facing}`, true);
    } else {
      this.player.anims.stop();
      this.player.setFrame(DIRS.indexOf(this.facing) * 3);
    }
    this.player.setPosition(Math.round(this.px), Math.round(this.py));
    this.player.setDepth(this.py);

    if (!blockedUI) {
      this.checkDoors(delta);
      this.checkPads();
      if (time > this.unblockAt) this.checkItemsTouch();
    }
    this.updateNearest(blockedUI);
    const act = Phaser.Input.Keyboard.JustDown(k.e) || Phaser.Input.Keyboard.JustDown(k.space) || Phaser.Input.Keyboard.JustDown(k.enter) || touchInput.action;
    touchInput.action = false;
    if (act && !blockedUI && time > this.unblockAt && this.nearest) this.interact(this.nearest);

    if (time - this.lastSave > 1500) {
      this.lastSave = time;
      const p = { x: +(this.px / T).toFixed(2), y: +(this.py / T).toFixed(2) };
      const cur = game.get();
      if (cur.room !== this.room.id || !cur.pos || cur.pos.x !== p.x || cur.pos.y !== p.y) game.set({ room: this.room.id, pos: p });
    }
  }

  updateWanderers(delta: number) {
    this.views.forEach((v) => {
      if (!v.ent.wander || !v.sprite.visible || !v.wanderT) return;
      const sp = v.sprite as Phaser.GameObjects.Sprite;
      const w = v.wanderT;
      if (isBlocking() && this.nearest === v) { sp.anims.stop(); return; }
      if (w.wait > 0) { w.wait -= delta; sp.anims.stop(); return; }
      const ddx = w.x - sp.x, ddy = w.y - sp.y;
      const dist = Math.hypot(ddx, ddy);
      if (dist < 2) {
        const [x0, y0, x1, y1] = v.ent.wander;
        w.x = (x0 + Math.random() * (x1 - x0) + 0.5) * T;
        w.y = (y0 + Math.random() * (y1 - y0) + 1) * T - 4;
        w.wait = 800 + Math.random() * 2500;
        return;
      }
      const step = Math.min(dist, 45 * (delta / 1000));
      sp.x += (ddx / dist) * step; sp.y += (ddy / dist) * step;
      const dir: Dir = Math.abs(ddx) > Math.abs(ddy) ? (ddx < 0 ? 'left' : 'right') : ddy < 0 ? 'up' : 'down';
      sp.anims.play(`char-${v.ent.tex}-walk-${dir}`, true);
      sp.setDepth(sp.y);
      v.ix = sp.x; v.iy = sp.y - 4;
    });
  }

  updateNearest(blockedUI: boolean) {
    let best: EntView | null = null;
    let bd = 58;
    if (!blockedUI) {
      this.views.forEach((v) => {
        if (!v.ent.interact || !v.sprite.visible) return;
        const d = Phaser.Math.Distance.Between(this.px, this.py - 8, v.ix, v.iy);
        const reach = v.ent.kind === 'obj' ? 58 + Math.max(0, (OBJECTS[v.ent.tex!]?.foot[0] || 1) - 1) * 16 : 58;
        if (d < reach && d < bd + 16) { bd = d; best = v; }
      });
    }
    this.nearest = best;
    if (best) {
      const b = best as EntView;
      const topY = b.sprite.y - b.sprite.displayHeight - 14;
      this.bubble.setPosition(b.sprite.x, topY).setVisible(true);
    } else this.bubble.setVisible(false);
  }

  interact(v: EntView) {
    if (v.ent.kind === 'npc') {
      const sp = v.sprite as Phaser.GameObjects.Sprite;
      const dx = this.px - sp.x, dy = this.py - sp.y;
      const dir: Dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
      sp.anims.stop();
      sp.setFrame(DIRS.indexOf(dir) * 3);
      if (v.wanderT) v.wanderT.wait = 4000;
    }
    sfx('select');
    bus.emit('interact', v.ent.id);
  }

  clickEnt(id: string) {
    if (isBlocking() || this.transitioning) return;
    const v = this.views.get(id);
    if (!v) return;
    const d = Phaser.Math.Distance.Between(this.px, this.py - 8, v.ix, v.iy);
    if (d < 90) this.interact(v);
    else this.floatText(v.sprite.x, v.sprite.y - v.sprite.displayHeight - 10, 'Walk closer!');
  }

  floatText(x: number, y: number, msg: string, color = '#ffffff') {
    const t = this.add.text(x, y, msg, { fontFamily: 'Nunito, sans-serif', fontSize: '13px', fontStyle: 'bold', color, stroke: '#3d3354', strokeThickness: 4 }).setOrigin(0.5).setDepth(100003).setResolution(3);
    this.tweens.add({ targets: t, y: y - 26, alpha: 0, duration: 1300, onComplete: () => t.destroy() });
  }

  checkItemsTouch() {
    this.views.forEach((v) => {
      if (v.ent.kind !== 'item' || !v.sprite.visible) return;
      if (Phaser.Math.Distance.Between(this.px, this.py - 6, v.ix, v.iy) < 22) this.interact(v);
    });
  }

  collectFx(id: string) {
    const v = this.views.get(id);
    if (!v) return;
    this.add.particles(v.ix, v.iy - 10, 'spark', { speed: { min: 50, max: 160 }, lifespan: 800, scale: { start: 1.2, end: 0 }, tint: [0xffd36e, 0xffffff, 0xc9a7ff], emitting: false }).setDepth(100000).explode(30);
  }

  checkPads() {
    let now: string | null = null;
    const tx = Math.floor(this.px / T), ty = Math.floor((this.py - 4) / T);
    this.views.forEach((v) => {
      if (v.ent.kind !== 'pad') return;
      if (tx >= v.ent.x && tx < v.ent.x + 4 && ty >= v.ent.y && ty < v.ent.y + 3) now = v.ent.id;
    });
    if (now && now !== this.inPad) bus.emit('zone', now);
    this.inPad = now;
  }

  checkDoors(delta: number) {
    if (this.doorCooldown > 0) { this.doorCooldown -= delta; return; }
    const tx = Math.floor(this.px / T), ty = Math.floor((this.py - 4) / T);
    const door = this.room.doors.find((d) => d.x === tx && d.y === ty);
    if (!door) return;
    const msg = door.locked?.(game.get());
    if (msg) {
      this.doorCooldown = 900;
      this.py += 10;
      sfx('wrong');
      bus.emit('locked', msg);
      this.floatText(this.px, this.py - 60, '🔒 Locked');
      return;
    }
    this.goto(door.to, door.spawn);
  }

  goto(room: string, spawn: [number, number]) {
    if (this.transitioning) return;
    this.transitioning = true;
    sfx('door');
    this.cameras.main.fadeOut(300, 43, 35, 80);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      game.set((s) => ({ room, pos: { x: spawn[0], y: spawn[1] }, visited: s.visited.includes(room) ? s.visited : [...s.visited, room] }));
      this.scene.restart({ room, spawn });
    });
  }

  // ------------------------------------------------------------ objective arrow
  placeArrow() {
    if (!this.arrow) return;
    this.tweens.killTweensOf(this.arrow);
    const o = this.objective;
    if (!o || this.attract) { this.arrow.setVisible(false); return; }
    let x = 0, y = 0;
    if (o.room === this.room.id && o.ent) {
      const v = this.views.get(o.ent);
      if (!v || !v.sprite.visible) { this.arrow.setVisible(false); return; }
      x = v.sprite.x; y = v.sprite.y - v.sprite.displayHeight - 30;
    } else if (o.room !== this.room.id) {
      const door = this.room.id === 'campus' ? this.room.doors.find((d) => d.to === o.room) : this.room.doors[0];
      if (!door) { this.arrow.setVisible(false); return; }
      x = (door.x + (this.room.id === 'campus' ? 0.5 : 1)) * T; y = door.y * T - (this.room.id === 'campus' ? 40 : 12);
    } else { this.arrow.setVisible(false); return; }
    this.arrow.setPosition(x, y).setVisible(true);
    this.tweens.add({ targets: this.arrow, y: y - 10, yoyo: true, repeat: -1, duration: 500, ease: 'Sine.easeInOut' });
  }
}

export function createGame(parent: HTMLElement) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 1280,
    height: 720,
    backgroundColor: '#2b2350',
    pixelArt: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, WorldScene],
    input: { activePointers: 3 },
    audio: { noAudio: true },
  });
}
