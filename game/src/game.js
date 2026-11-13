import Phaser from 'phaser';
import { W, H } from './assets.js';
import { store, PENS, penById, arenaById } from './store.js';
import { NET } from './net.js';
import { toast, fitCamera, coverBg, heroImg, txt, button, banner, circleBtn, fadeTo, FONT, FONT_LATIN, FONT_LOGO } from './ui.js';
import { panelTex, lg, rr } from './gfx.js';
import { sfx, REACTIONS } from './sfx.js';

/*
  RULES
  - Each player has ONE pen. Players take turns flicking it.
  - A pen whose centre leaves the desk is "knocked out": the OTHER player scores +1 and the pen comes back to its start spot.
  - The match has a timer. When it ends, more knock-outs wins. A tie goes to sudden death (next knock-out wins).
  - The desk is "tight": flicks only slide a short way, so a pen must be pushed to the edge with several hits.
*/
const DESK = { x: 0, y: 0, w: 1000, h: 470 };
const TOP = { y: 290, w: 760 }, BOT = { y: 660, w: 1060 };
const OX = 140, OY = 175;
// The desk top of each photo, as fractions of the image: far edge (ty, tx0..tx1) and near edge (by, bx0..bx1).
const PLAY_CFG = {
  classroom: { ty: 0.32, tx0: 0.24, tx1: 0.76, by: 0.78, bx0: 0.19, bx1: 0.81, z: 1.25 },
  campus: { ty: 0.315, tx0: 0.255, tx1: 0.743, by: 0.71, bx0: 0.229, bx1: 0.771, z: 1.4 },
  library: { ty: 0.265, tx0: 0.262, tx1: 0.758, by: 0.70, bx0: 0.028, bx1: 0.976 },
  rooftop: { ty: 0.28, tx0: 0.373, tx1: 0.626, by: 0.755, bx0: 0.241, bx1: 0.759, z: 1.45 },
};
let VIEW = { flat: true, k: 1 };
const lerp = (a, b, t) => a + (b - a) * t;
const project = (x, y) => {
  if (VIEW.flat) return { x: OX + x, y: OY + y, s: 1 };
  const t = y / 470, c = VIEW.c, uL = lerp(c.tx0, c.bx0, t), uR = lerp(c.tx1, c.bx1, t), v = lerp(c.ty, c.by, t), u = uL + (x / 1000) * (uR - uL);
  return { x: VIEW.ax + VIEW.k * (u - VIEW.fu) * 1280, y: VIEW.ay + VIEW.k * (v - VIEW.fv) * 720, s: (VIEW.k * 1280 * (uR - uL)) / 1000 };
};
const unproject = (sx, sy) => {
  if (VIEW.flat) return { x: sx - OX, y: sy - OY };
  const c = VIEW.c, v = (sy - VIEW.ay) / (VIEW.k * 720) + VIEW.fv, t = (v - c.ty) / (c.by - c.ty), uL = lerp(c.tx0, c.bx0, t), uR = lerp(c.tx1, c.bx1, t), u = (sx - VIEW.ax) / (VIEW.k * 1280) + VIEW.fu;
  return { x: ((u - uL) / (uR - uL)) * 1000, y: t * 470 };
};
// every pen is drawn at ONE size wherever it lies on the desk (the position still follows the photo perspective)
const penScale = () => (VIEW.flat ? 1 : project(500, 235).s);
const SYF = () => (VIEW.flat ? 1 : (VIEW.k * 720 * (VIEW.c.by - VIEW.c.ty)) / 470);
const PEN_LEN = 240, PEN_H = 28, PULL_MAX = 170, V_MAX = 22, TEX_W = 520;
// start spots around the table for up to 5 players (th = direction the pen tip points)
const SLOTS = [{ x: 150, y: 235, th: 0 }, { x: 850, y: 235, th: Math.PI }, { x: 500, y: 60, th: 0 }, { x: 500, y: 410, th: Math.PI }, { x: 500, y: 235, th: 0 }];
const COLORS = [0x3a86ff, 0xff4a68, 0x4ae070, 0xb06aff, 0xffa63a];
const AVATARS = ['boy', 'rafid', 'girl', 'glasses', 'cap'];
const DIFF = [{ err: 0.5, think: 1100, pow: 0.7 }, { err: 0.24, think: 800, pow: 0.88 }, { err: 0.08, think: 600, pow: 1 }];

const PAL = { classroom: ['#d08f52', '#8c5428', 0], campus: ['#dba46a', '#a26c3a', 0], library: ['#8c502f', '#47250f', 0], rooftop: ['#aaa59d', '#6c6862', 1] };
function benchTex(scene, arena) {
  const key = 'bench_' + arena.id;
  if (scene.textures.exists(key)) return key;
  const t = scene.textures.createCanvas(key, W, H), c = t.getContext(), [a, b, conc] = PAL[arena.id] || PAL.classroom;
  c.fillStyle = conc ? '#2c2c30' : '#2a1b12'; c.fillRect(0, 0, W, H);
  const v = c.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 760); v.addColorStop(0, 'rgba(255,230,190,.10)'); v.addColorStop(1, 'rgba(0,0,0,.55)'); c.fillStyle = v; c.fillRect(0, 0, W, H);
  const x0 = OX - 14, y0 = OY - 14, w = 1000 + 28, h = 470 + 28;
  c.save(); c.shadowColor = 'rgba(0,0,0,.7)'; c.shadowBlur = 40; c.shadowOffsetY = 22; c.fillStyle = '#000'; c.fillRect(x0, y0 + 10, w, h); c.restore();
  c.fillStyle = conc ? '#3e3d3b' : '#5a3418'; c.fillRect(x0, y0 + h - 2, w, 20);                         // front edge thickness
  c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x0, y0 + h + 10, w, 8);
  const g1 = c.createLinearGradient(0, y0, 0, y0 + h); g1.addColorStop(0, a); g1.addColorStop(1, b); c.fillStyle = g1; c.fillRect(x0, y0, w, h);
  c.save(); c.beginPath(); c.rect(x0, y0, w, h); c.clip();
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  if (conc) { for (let i = 0; i < 2400; i++) { c.fillStyle = 'rgba(' + (rnd() > 0.5 ? '255,255,255' : '0,0,0') + ',' + (0.03 + rnd() * 0.07) + ')'; c.fillRect(x0 + rnd() * w, y0 + rnd() * h, 2 + rnd() * 5, 2 + rnd() * 5); } }
  else {
    for (let i = 0; i < 260; i++) { const y = y0 + rnd() * h, len = 120 + rnd() * 520, x = x0 + rnd() * w - 60; c.strokeStyle = 'rgba(' + (rnd() > 0.45 ? '50,22,6' : '255,220,170') + ',' + (0.05 + rnd() * 0.1) + ')'; c.lineWidth = 0.8 + rnd() * 2.2; c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + len * 0.3, y + (rnd() - 0.5) * 6, x + len * 0.7, y + (rnd() - 0.5) * 6, x + len, y + (rnd() - 0.5) * 4); c.stroke(); }
    for (let px = x0 + 205; px < x0 + w; px += 205) { c.fillStyle = 'rgba(40,18,4,.55)'; c.fillRect(px, y0, 3, h); c.fillStyle = 'rgba(255,230,190,.18)'; c.fillRect(px + 3, y0, 2, h); }
  }
  const sh = c.createLinearGradient(x0, y0, x0 + w, y0 + h); sh.addColorStop(0, 'rgba(255,240,210,.14)'); sh.addColorStop(1, 'rgba(0,0,0,.18)'); c.fillStyle = sh; c.fillRect(x0, y0, w, h);
  c.restore();
  c.strokeStyle = 'rgba(255,235,200,.55)'; c.lineWidth = 3; c.strokeRect(x0 + 1.5, y0 + 1.5, w - 3, h - 3);
  t.refresh();
  return key;
}

export class Game extends Phaser.Scene {
  constructor() { super('Game'); }
  init(data) {
    this.mode = data?.mode || 'ai';
    this.practice = !!data?.practice;
    this.arena = arenaById(data?.arena || store.get().arena);
    this.matchTime = data?.time || 120;
    this.level = data?.level ?? 1;
    this.online = data?.online || null;                         // {you, isHost} when playing in an online room
    this.you = this.online ? this.online.you : -1;
    this.host = !!(this.online && this.online.isHost);
    this.guest = !!(this.online && !this.online.isHost);      // AI level chosen before the match: 0 easy, 1 medium, 2 hard
    if (data?.players && data.players.length >= 2) this.cfg = data.players;
    else {
      // 1v1 against the AI. The AI never gets a pen far stronger than what the player owns.
      const me = penById(store.get().pen), pool = PENS.filter((p) => p.tier <= Math.min(PENS.length - 1, store.maxTier() + 1) && p.id !== me.id);
      const ai = pool.length ? pool[Phaser.Math.Between(0, pool.length - 1)] : PENS[1];
      this.cfg = [{ name: store.get().name, penId: me.id, ai: false, av: 'boy' }, { name: 'RafidPlays', penId: ai.id, ai: true, av: 'rafid' }];
    }
  }

  create() {
    fitCamera(this);
    this.cameras.main.fadeIn(200);
    this.add.rectangle(W / 2, H / 2, 4000, 3000, 0x120b07, 1).setDepth(-101);
    const id = this.arena.id;
    if (this.textures.exists('play_' + id) && PLAY_CFG[id]) {
      const c = PLAY_CFG[id], fv = (c.ty + c.by) / 2;
      VIEW = { flat: false, c, k: 1, fu: 0.5, fv, ax: 640, ay: fv * 720 };
      this.bg = this.add.image(0, 0, 'play_' + id).setDepth(-100);
      this.baseZ = c.z || 1; this.zoomK = this.baseZ * 1.35; this.viewIdx = 0;
      this.applyView();
      this.tweens.add({ targets: this, zoomK: this.baseZ, duration: 1500, ease: 'cubic.out', onUpdate: () => this.applyView() });   // camera dollies in to the table
      const rs = () => this.applyView();
      this.scale.on('resize', rs); this.events.once('shutdown', () => this.scale.off('resize', rs));
    } else {
      VIEW = { flat: true, k: 1 };
      this.add.image(W / 2, H / 2, benchTex(this, this.arena)).setDisplaySize(W, H);
    }
    this.matter.world.setGravity(0, 0);
    this.state = 'idle'; this.turn = 0; this.pens = []; this.calm = 0; this.aim = null; this.sudden = false; this.tied = null; this.timeUp = false; this.finished = false;
    this.timeLeft = this.matchTime;
    this.g = this.add.graphics().setDepth(20);
    const N = this.cfg.length;
    this.pl = this.cfg.map((c, i) => ({ i, name: c.name, ai: !!c.ai, av: c.av || AVATARS[i % AVATARS.length], def: penById(c.penId), score: 0, pen: null, color: COLORS[i % COLORS.length] }));
    this.pl.forEach((p) => { p.pen = this.spawn(p.i); });
    if (this.online) this.setupNet();
    const hudFrom = this.children.list.length;
    this.buildHud();
    this.children.list.slice(hudFrom).forEach((o) => o.setDepth && o.setDepth(40));
    this.add.text(W / 2, N > 2 ? 150 : 148, this.arena.name, { fontFamily: FONT, fontSize: '20px', color: '#fff', fontStyle: '700', backgroundColor: 'rgba(5,10,40,.7)', padding: { x: 14, y: 3 } }).setOrigin(0.5).setDepth(41);
    this.matter.world.on('collisionstart', (ev) => {
      let best = 0;
      ev.pairs.forEach((q) => {
        const a = this.pens.find((pp) => pp.alive && pp.body.body === q.bodyA), b = this.pens.find((pp) => pp.alive && pp.body.body === q.bodyB);
        if (a) a.spinHit = true; if (b) b.spinHit = true;
        if (a && b && q.bodyA.speed > 4 && q.bodyB.speed > 4) this.say('both', true);
        if (a && b) { a.lastTouch = { by: b.player, t: this.time.now }; b.lastTouch = { by: a.player, t: this.time.now }; }
        const s = (q.bodyA.speed || 0) + (q.bodyB.speed || 0); if (s > best) best = s;
      });
      if (best > 1.2 && this.time.now - (this.lastHit || 0) > 90) { this.lastHit = this.time.now; sfx.hit(Math.min(1, best / 20)); const sp = ev.pairs[0].collision.supports[0]; if (sp) { const q = project(sp.x, sp.y); this.sparks(q.x, q.y, best); } }
    });
    this.input.on('pointerdown', this.onDown, this); this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this); this.input.on('pointerupoutside', this.onUp, this);
    this.auto = location.search.includes('auto'); sfx.preload(); sfx.start();
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tick() });
    if (this.guest) { this.state = 'remote'; this.turn = 0; this.hint.setText('খেলা শুরু হচ্ছে...'); } else this.startTurn(0);
  }

  spawn(i) {
    const P = this.pl[i], def = P.def, s = SLOTS[i], mass = 0.4 + (def.dur / 100) * 1.6;
    const body = this.matter.add.image(s.x, s.y, 'dot', null, { shape: { type: 'rectangle', width: PEN_LEN - 10, height: PEN_H - 4 }, frictionAir: (0.082 - def.speed * 0.00035) * this.arena.air, friction: 0.12, frictionStatic: 0.04, restitution: 0.6, density: 0.0016 * mass });
    body.setVisible(false).setRotation(s.th - Math.PI);
    const shadow = this.add.image(0, 0, 'pen_' + def.id).setTint(0x000000).setAlpha(0.5).setDepth(5);
    const spr = this.add.image(0, 0, 'pen_' + def.id).setDepth(10);
    const hex = '#' + P.color.toString(16).padStart(6, '0');
    const tag = this.add.text(0, 0, P.name.replace(' (AI)', '').slice(0, 9), { fontFamily: FONT_LATIN, fontSize: '19px', color: '#fff', fontStyle: '700', backgroundColor: hex, padding: { x: 8, y: 2 } }).setOrigin(0.5).setDepth(12);
    const pen = { body, spr, shadow, tag, player: i, def, alive: true, spin: 0, spinHit: false, lastTouch: null };
    this.pens.push(pen); this.place(pen);
    spr.setAlpha(0); shadow.setAlpha(0); this.tweens.add({ targets: [spr, shadow], alpha: (t, k, v, idx) => (idx ? 0.5 : 1), duration: 450 });
    return pen;
  }

  applyView() {
    if (VIEW.flat || !this.bg) return;
    const cam = this.cameras.main, vw = cam.width / cam.zoom, vh = cam.height / cam.zoom;
    VIEW.k = Math.max(this.zoomK, vw / 1280, vh / 720);
    this.bg.setScale((VIEW.k * 1280) / this.bg.width);
    this.bg.setPosition(VIEW.ax + VIEW.k * (0.5 - VIEW.fu) * 1280, VIEW.ay + VIEW.k * (0.5 - VIEW.fv) * 720);
  }
  // several camera views of the same table
  cycleView() {
    if (VIEW.flat) return;
    const z = this.baseZ, views = [[z, 'স্বাভাবিক ভিউ'], [z * 1.18, 'কাছের ভিউ'], [Math.max(1, z * 0.82), 'দূরের ভিউ']];
    this.viewIdx = (this.viewIdx + 1) % views.length;
    this.tweens.add({ targets: this, zoomK: views[this.viewIdx][0], duration: 600, ease: 'sine.inOut', onUpdate: () => this.applyView() });
    const t = txt(this, W / 2, 190, views[this.viewIdx][1], 26, '#fff', { backgroundColor: 'rgba(5,10,40,.75)', padding: { x: 14, y: 6 } }).setDepth(70);
    this.tweens.add({ targets: t, alpha: 0, delay: 900, duration: 400, onComplete: () => t.destroy() });
  }

  // The pen lies ON the desk: a pen pointing towards the camera is foreshortened (shorter), like in real life.
  place(p) {
    const b = p.body, q = project(b.x, b.y), S = penScale(), th = b.rotation + Math.PI, base = PEN_LEN / TEX_W, sy = SYF();
    const dx = Math.cos(th) * S, dy = Math.sin(th) * sy, len = Math.hypot(dx, dy), rot = Math.atan2(dy, dx) + Math.PI;
    p.spr.setPosition(q.x, q.y - 4 * S).setScale(base * len, base * S).setRotation(rot);
    p.shadow.setPosition(q.x + 4 * S, q.y + 3 * S).setScale(base * len * 1.03, base * S * 1.25).setRotation(rot);
    if (p.tag) p.tag.setPosition(q.x, q.y - 46 * S).setScale(Math.max(0.75, Math.min(1.1, S)));
  }

  // ------------------------------------------------------------------ HUD
  buildHud() {
    const N = this.pl.length;
    this.chips = [];
    if (N === 2) {
      const side = (i, x) => {
        const P = this.pl[i], col = i === 0 ? '#3a86ff' : '#ff4a68', fill = i === 0 ? ['#12378f', '#06164a'] : ['#8a1636', '#40081c'];
        this.add.image(x + 190, 62, panelTex(this, 380, 100, col, 20, fill));
        const ax = i === 0 ? x + 58 : x + 322;
        this.add.image(ax, 62, 'av_' + P.av).setDisplaySize(90, 90);
        this.add.rectangle(ax, 62, 90, 90).setStrokeStyle(4, i === 0 ? 0x7ab6ff : 0xff8aa0);
        const tx = i === 0 ? x + 120 : x + 262, o = i === 0 ? 0 : 1;
        this.add.text(tx, 38, P.name, { fontFamily: FONT_LATIN, fontSize: '24px', color: '#fff', fontStyle: '700' }).setOrigin(o, 0.5);
        this.add.text(tx, 70, P.def.name, { fontFamily: FONT, fontSize: '20px', color: '#ffd324', fontStyle: '700' }).setOrigin(o, 0.5);
      };
      side(0, 20); side(1, W - 400);
      const g = this.add.graphics();
      g.fillGradientStyle(0x3a86ff, 0x3a86ff, 0x1a44c8, 0x1a44c8, 1).fillPoints([{ x: 510, y: 14 }, { x: 640, y: 14 }, { x: 626, y: 100 }, { x: 516, y: 86 }], true);
      g.fillGradientStyle(0xff4a60, 0xff4a60, 0xc0162c, 0xc0162c, 1).fillPoints([{ x: 640, y: 14 }, { x: 770, y: 14 }, { x: 764, y: 86 }, { x: 654, y: 100 }], true);
      g.fillStyle(0x15172e, 1).fillRoundedRect(560, 6, 160, 130, 14).lineStyle(3, 0xffc61a, 1).strokeRoundedRect(560, 6, 160, 130, 14);
      this.sc = [txt(this, 520, 56, '0', 62, '#fff', { fontFamily: FONT_LATIN }).setStroke('#0a1a52', 6).setDepth(2), txt(this, 760, 56, '0', 62, '#fff', { fontFamily: FONT_LATIN }).setStroke('#5a0010', 6).setDepth(2)];
      txt(this, 640, 26, '1v1 Pen Fight', 20, '#ffd324', { fontFamily: FONT_LATIN });
      txt(this, 640, 52, 'নক-আউট', 18, '#fff');
      this.add.graphics().fillStyle(0x070a18, 0.95).fillRoundedRect(576, 68, 128, 38, 19);
      this.add.image(596, 87, 'ic_clock').setDisplaySize(24, 24);
      this.timerTxt = txt(this, 652, 88, this.fmt(this.matchTime), 28, '#fff', { fontFamily: FONT_LATIN });
      this.turnTxt = txt(this, 640, 122, '', 19, '#7ab6ff');
    } else {
      // free-for-all (3-5 players): a row of score chips
      const cw = 210, gap = 8, total = N * cw + (N - 1) * gap, x0 = (W - total) / 2;
      this.sc = [];
      this.pl.forEach((P, i) => {
        const x = x0 + i * (cw + gap) + cw / 2, hex = '#' + P.color.toString(16).padStart(6, '0');
        this.add.image(x, 40, panelTex(this, cw, 62, hex, 16, ['#10163a', '#080b22']));
        this.add.image(x - cw / 2 + 36, 40, 'av_' + P.av).setDisplaySize(46, 46);
        this.add.rectangle(x - cw / 2 + 36, 40, 46, 46).setStrokeStyle(3, P.color);
        this.add.text(x - cw / 2 + 66, 28, P.name, { fontFamily: FONT_LATIN, fontSize: '17px', color: '#fff', fontStyle: '700' }).setOrigin(0, 0.5);
        this.add.text(x - cw / 2 + 66, 52, P.def.name, { fontFamily: FONT, fontSize: '14px', color: '#ffd324', fontStyle: '700' }).setOrigin(0, 0.5);
        this.sc.push(txt(this, x + cw / 2 - 26, 40, '0', 32, '#fff', { fontFamily: FONT_LATIN }).setStroke('#000', 4));
        this.chips.push(this.add.rectangle(x, 40, cw + 4, 66).setStrokeStyle(4, 0xffe45c).setAlpha(0));
      });
      this.add.graphics().fillStyle(0x070a18, 0.95).fillRoundedRect(W / 2 - 230, 80, 460, 44, 22);
      this.add.image(W / 2 - 200, 102, 'ic_clock').setDisplaySize(26, 26);
      this.timerTxt = txt(this, W / 2 - 150, 103, this.fmt(this.matchTime), 26, '#fff', { fontFamily: FONT_LATIN });
      this.turnTxt = txt(this, W / 2 + 50, 103, '', 20, '#ffd324');
    }
    this.hint = txt(this, W / 2, H - 50, '', 24, '#fff', { maxW: 1100 }).setStroke('#2a1000', 5);
    circleBtn(this, 40, 168, 28, 'ic_pause', () => this.pause());
    this.sndBtn = circleBtn(this, 40, 238, 28, 'ic_speaker', () => { store.set({ sound: !store.get().sound }); this.sndBtn.setAlpha(store.get().sound ? 1 : 0.4); });
    this.sndBtn.setAlpha(store.get().sound ? 1 : 0.4);
    if (!VIEW.flat) circleBtn(this, 40, 308, 28, 'ic_eye', () => this.cycleView());
    // voice reactions: one 😜 button opens a 3x3 grid of funny Bangla voices
    this.rxPanel = null;
    const rxBtn = circleBtn(this, 1236, 238, 28, 'ic_chat', () => this.toggleReactions());
    this.refreshHud();
  }
  // emoji reaction + funny sound; in an online room everybody sees/hears it
  toggleReactions() {
    if (this.rxPanel) { this.rxPanel.destroy(); this.rxPanel = null; return; }
    const o = this.rxPanel = this.add.container(0, 0).setDepth(80);
    o.add(this.add.image(1085, 345, panelTex(this, 360, 350, '#7a90d8', 24, ['#10152c', '#0a0e22'])));
    REACTIONS.forEach(([e, label], i) => {
      const x = 975 + (i % 3) * 110, y = 232 + Math.floor(i / 3) * 112;
      const z = this.add.zone(x, y, 104, 106).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => { if (this.react(i, true) !== false) { o.destroy(); this.rxPanel = null; } });
      o.add([this.add.text(x, y - 16, e, { fontSize: '40px', padding: { top: 12, bottom: 8, left: 4, right: 4 } }).setOrigin(0.5), txt(this, x, y + 32, label, 17, '#fff', { maxW: 100 }), z]);
    });
  }
  // short Bangla speech bubble + voice for a game situation (max one every few seconds, so it never spams)
  say(key, force) {
    return;   // automatic voices are off: reactions play only when the player taps a button
    const now = this.time.now; if (!force && now - (this.lastSay || 0) < 9000) return;
    this.lastSay = now; this.bubble(sfx.say(key));
  }
  bubble(text) {
    if (!text) return;
    const t = txt(this, W / 2, 600, text, 34, '#fff', { stroke: '#2a1000', strokeThickness: 6, backgroundColor: 'rgba(5,10,40,.7)', padding: { x: 20, y: 12 }, maxW: 1000 }).setDepth(70), full = t.scaleX; t.setScale(full * 0.6);
    this.tweens.add({ targets: t, scaleX: full, scaleY: full, duration: 260, ease: 'back.out' });
    this.tweens.add({ targets: t, alpha: 0, y: 580, delay: 1800, duration: 500, onComplete: () => t.destroy() });
  }
  react(i, mine) {
    const r = REACTIONS[i]; if (!r) return;
    if (mine) { const now = this.time.now; if (now - (this.lastReact || 0) < 1500) return false; this.lastReact = now; }
    const f = this.add.text(Phaser.Math.Between(560, 720), 300, r[0], { fontSize: '64px', padding: { top: 20, bottom: 12, left: 8, right: 8 } }).setOrigin(0.5).setDepth(60);
    this.tweens.add({ targets: f, y: 150, alpha: 0, scale: 1.5, duration: 1100, onComplete: () => f.destroy() });
    this.bubble(r[1]);
    sfx.react(i);
    if (mine && this.online) NET.send({ t: 'relay', to: this.host ? 'all' : 'host', d: { k: 'rx', i } });
  }
  fmt(s) { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
  refreshHud() { this.pl.forEach((P, i) => this.sc[i].setText(String(P.score))); }

  tick() {
    if (this.guest) return;
    if (this.state === 'paused' || this.state === 'over' || this.sudden) return;
    this.timeLeft = Math.max(0, this.timeLeft - 1);
    this.timerTxt.setText(this.fmt(this.timeLeft)).setColor(this.timeLeft <= 10 ? '#ff5a5a' : '#ffffff');
    if (this.timeLeft <= 10 && this.timeLeft > 0) sfx.tick();
    if (this.timeLeft === 0) { this.timeUp = true; if (this.state !== 'moving') this.decide(); }
  }

  decide() {
    const top = Math.max(...this.pl.map((P) => P.score)), leaders = this.pl.filter((P) => P.score === top);
    if (leaders.length === 1) return this.finish(leaders[0].i);
    this.sudden = true; this.timeUp = false; this.tied = leaders.map((P) => P.i); this.timerTxt.setText('SD').setColor('#ff5a5a');
    this.hint.setText('সমান! আকস্মিক মৃত্যু — পরের নক-আউটে জয়!'); sfx.sudden();
    const t = txt(this, W / 2, 330, 'SUDDEN DEATH', 54, '#ff5a5a', { fontFamily: FONT_LOGO, stroke: '#2a0008', strokeThickness: 10 }).setDepth(60);
    this.tweens.add({ targets: t, alpha: 0, y: 290, duration: 1800, onComplete: () => t.destroy() });
    if (this.state !== 'idle' && this.state !== 'ai') return;
    this.startTurn(this.turn);
  }

  // ------------------------------------------------------------------ turns
  startTurn(i) {
    this.turn = i; this.calm = 0;
    const P = this.pl[i], mine = !this.online || i === this.you, human = !this.auto && !P.ai && mine, remote = !!this.online && !P.ai && !mine, multi = this.pl.length > 2;
    this.turnTxt.setText(multi || !this.cfg.some((c) => c.ai) ? `${P.name} এর পালা` : human ? 'আপনার পালা' : 'AI এর পালা').setColor('#' + P.color.toString(16).padStart(6, '0'));
    if (!this.sudden) this.hint.setText(human ? 'পেনের গায়ে আঙুল রেখে পেছনে টানুন — পাশে ধরলে পেন ঘুরবে' : `${P.name} ভাবছে...`);
    this.chips.forEach((c, k) => c.setAlpha(k === i ? 1 : 0));
    this.state = human ? 'idle' : remote ? 'remote' : 'ai';
    if (human && !this.sudden) {                                   // situation voices at the start of my turn
      const mp = P.pen, edge = mp.alive ? Math.min(mp.body.x, DESK.w - mp.body.x, mp.body.y, DESK.h - mp.body.y) : 999, top = Math.max(...this.pl.map((q) => q.score));
      if (edge < 70) this.say('danger');
      else if (this.timeLeft <= 20 && P.score === top && top > 0 && this.pl.filter((q) => q.score === top).length === 1) this.say('closewin');
      else if (top - P.score >= 3) this.say('ask');
      else if ((this.myFalls || 0) >= 3 && !(this.myFalls % 3)) this.say('losing');
    }
    if (!human && !remote) this.time.delayedCall(this.auto ? 200 : DIFF[this.practice ? 0 : this.level].think, () => this.aiMove(i));
  }

  pointer(ptr) { return unproject(ptr.worldX, ptr.worldY); }
  // The grab point must be ON the pen. Pens never turn while aiming (like a real flick).
  hitPen(pen, w) {
    const b = pen.body, th = b.rotation + Math.PI, dx = w.x - b.x, dy = w.y - b.y;
    const lx = dx * Math.cos(th) + dy * Math.sin(th), ly = -dx * Math.sin(th) + dy * Math.cos(th);
    return Math.abs(lx) < PEN_LEN / 2 + 24 && Math.abs(ly) < 48;
  }
  onDown(ptr) {
    if (this.state !== 'idle') return;
    const w = this.pointer(ptr), pen = this.pl[this.turn].pen;
    if (!pen.alive || !this.hitPen(pen, w)) return;
    this.aim = { pen, grab: { x: w.x, y: w.y }, pull: new Phaser.Math.Vector2(0, 0) }; this.state = 'aiming'; this.hint.setText('পেছনে টানুন, তারপর ছেড়ে দিন!');
  }
  onMove(ptr) {
    if (this.state !== 'aiming') return;
    const w = this.pointer(ptr), v = new Phaser.Math.Vector2(w.x - this.aim.grab.x, w.y - this.aim.grab.y);
    if (v.length() > PULL_MAX) v.setLength(PULL_MAX);
    this.aim.pull = v;
  }
  onUp() {
    if (this.state !== 'aiming') return;
    const { pen, pull, grab } = this.aim, len = pull.length(); this.aim = null;
    if (len < 24) { this.state = 'idle'; this.hint.setText('আরও একটু টানুন'); return; }
    const angle = Math.atan2(-pull.y, -pull.x), power = len / PULL_MAX;
    if (this.guest) { this.kick(pen, angle, power, grab); NET.send({ t: 'relay', to: 'host', d: { k: 'flick', angle, power, grab } }); this.state = 'gwait'; this.gwaitAt = this.time.now; this.hint.setText(''); this.g.clear(); return; }
    this.launch(pen, angle, power, grab);
  }
  // A flick is an impulse applied at the grab point: hit the middle and the pen slides straight,
  // hit near an end or the side and it spins for a long time, like a real pen on a desk.
  // the physics part of a flick (also used by guests to predict what the host is doing)
  kick(pen, angle, power, grab) {
    const sp = Math.min(25, V_MAX * power * Math.min(1.1, 0.79 + (pen.def.power - 62) * 0.0086)), vx = Math.cos(angle) * sp, vy = Math.sin(angle) * sp, b = pen.body;
    const rx = grab.x - b.x, ry = grab.y - b.y;
    const spin = Phaser.Math.Clamp((((rx * vy - ry * vx) * 12) / (PEN_LEN * PEN_LEN + PEN_H * PEN_H)) * 0.8, -0.6, 0.6);
    b.setVelocity(vx, vy); b.setAngularVelocity(spin); pen.spin = spin; pen.spinHit = false;
    this.gKickAt = this.time.now;
    sfx.flick(power);
  }
  launch(pen, angle, power, grab) {
    this.kick(pen, angle, power, grab); this.moveStartAt = this.time.now;
    if (this.host) NET.send({ t: 'relay', to: 'all', d: { k: 'fl', p: pen.player, a: Math.round(angle * 1000) / 1000, w: Math.round(power * 1000) / 1000, g: { x: Math.round(grab.x), y: Math.round(grab.y) } } });
    this.state = 'moving'; this.calm = 0; this.movingFor = 0; this.hint.setText(''); this.g.clear();
  }

  aiMove(i) {
    if (this.state !== 'ai' || this.turn !== i) return;
    const me = this.pl[i].pen, foes = this.pl.filter((P) => P.i !== i && P.pen.alive).map((P) => P.pen);
    if (!me.alive || !foes.length) return this.time.delayedCall(400, () => this.aiMove(i));
    const diff = DIFF[this.practice ? 0 : this.level], def = this.pl[i].def;
    // go for the pen that is closest to an edge (easiest to knock out)
    const edge = (p) => Math.min(p.body.x, DESK.w - p.body.x, p.body.y, DESK.h - p.body.y);
    const foe = foes.slice().sort((a, b) => edge(a) - edge(b))[0];
    const dx = foe.body.x - me.body.x, dy = foe.body.y - me.body.y, dist = Math.hypot(dx, dy);
    const noise = Phaser.Math.FloatBetween(-1, 1) * diff.err * (1.25 - (def.acc / 100) * 0.5);
    const angle = Math.atan2(dy, dx) + noise;
    const power = Phaser.Math.Clamp((dist / 520 + 0.45) * diff.pow * Phaser.Math.FloatBetween(0.85, 1), 0.4, 1);
    const th = me.body.rotation + Math.PI, off = Phaser.Math.FloatBetween(-70, 70), side2 = Phaser.Math.FloatBetween(-6, 6);
    const grab = { x: me.body.x + Math.cos(th) * off - Math.sin(th) * side2, y: me.body.y + Math.sin(th) * off + Math.cos(th) * side2 };
    this.aiAim = { pen: me, grab, angle, power: power * PULL_MAX * 0.8 };
    this.time.delayedCall(550, () => { this.aiAim = null; if (this.state === 'ai' && this.turn === i) this.launch(me, angle, power, grab); });
  }

  // ------------------------------------------------------------------ loop
  update(_, dt) {
    if (this.state === 'paused' || this.state === 'over') return;
    if (this.guest) { this.guestUpdate(dt); return; }
    this.pens.forEach((p) => {
      if (!p.alive) return;
      this.place(p);
      if (p.spin) { if (p.spinHit) { p.spin = p.body.body.angularVelocity; p.spinHit = false; } else { p.spin *= 0.985; if (Math.abs(p.spin) < 0.004) p.spin = 0; p.body.setAngularVelocity(p.spin); } }
      const b = p.body, m = 10 + p.def.hold;           // strong pens "hold on": the centre must go further past the edge
      if (b.x < DESK.x - m || b.x > DESK.x + DESK.w + m || b.y < DESK.y - m || b.y > DESK.y + DESK.h + m) this.knockOut(p);
    });
    this.drawGuides();
    if (this.host) this.sendSnap(dt);
    if (this.state === 'moving') {
      this.movingFor += dt;
      const fastest = Math.max(0, ...this.pens.filter((p) => p.alive).map((p) => Math.max(p.body.body.speed, Math.abs(p.body.body.angularSpeed) * 12)));
      this.calm = fastest < 0.25 ? this.calm + 1 : 0;
      if ((this.calm > 25 && this.movingFor > 350) || this.movingFor > 9000) this.endMove();
    }
  }

  drawGuides() {
    const g = this.g; g.clear();
    const cur = this.pl[this.turn].pen;
    this.pl.forEach((P) => { const pn = P.pen; if (!pn || !pn.alive) return; const q = project(pn.body.x, pn.body.y); g.lineStyle(3, P.color, 0.6).strokeEllipse(q.x, q.y + 4 * penScale(), (PEN_LEN + 12) * penScale(), 40 * penScale()); });
    if ((this.state === 'idle' || this.state === 'aiming') && cur.alive) {
      const t = (Math.sin(this.time.now / 260) + 1) / 2, q = project(cur.body.x, cur.body.y);
      g.lineStyle(4, this.pl[this.turn].color, 0.35 + 0.5 * t).strokeEllipse(q.x, q.y + 4, (PEN_LEN + 30) * penScale(), 64 * penScale());
    }
    const a = this.aim ? { grab: this.aim.grab, len: this.aim.pull.length(), ang: Math.atan2(-this.aim.pull.y, -this.aim.pull.x) } : this.aiAim ? { grab: this.aiAim.grab, len: this.aiAim.power, ang: this.aiAim.angle } : null;
    if (a) { const G = project(a.grab.x, a.grab.y); g.fillStyle(0xffe45c, 1).fillCircle(G.x, G.y - 8 * penScale(), 9).lineStyle(3, 0x1a2a6a).strokeCircle(G.x, G.y - 8 * penScale(), 9); }
    if (a && a.len > 8) {
      const bx0 = a.grab.x, by0 = a.grab.y, f = a.len / PULL_MAX;
      const A = project(bx0, by0), B = project(bx0 - Math.cos(a.ang) * a.len, by0 - Math.sin(a.ang) * a.len);
      g.lineStyle(8, 0x1a2a6a, 0.6).lineBetween(A.x, A.y - 8 * penScale(), B.x, B.y);
      g.fillStyle(0xffffff, 0.95).fillCircle(B.x, B.y, 12).lineStyle(3, 0x1a2a6a).strokeCircle(B.x, B.y, 12);
      const col = Phaser.Display.Color.Interpolate.ColorWithColor(new Phaser.Display.Color(255, 230, 90), new Phaser.Display.Color(255, 60, 60), 100, Math.floor(f * 100));
      const c = Phaser.Display.Color.GetColor(col.r, col.g, col.b);
      const dots = Math.round(2 + cur.def.acc * 0.08);   // accurate pens show a longer aim guide
      for (let i = 1; i <= dots; i++) { const d = i * (24 + f * 14), q = project(bx0 + Math.cos(a.ang) * d, by0 + Math.sin(a.ang) * d); g.fillStyle(c, Math.max(0.15, 1 - i * 0.09)).fillCircle(q.x, q.y, (8 - i * 0.5) * penScale()); }
    }
  }

  // ------------------------------------------------------------------ online rooms
  // The room creator (host) runs the physics and sends snapshots; guests send their flicks to the host.
  setupNet() {
    const off = [];
    if (this.host) { off.push(NET.on('relay', (m) => { if (m.d && m.d.k === 'flick') this.onRemoteFlick(m.from, m.d); else if (m.d && m.d.k === 'rx') { const i = m.d.i | 0; this.react(i, false); NET.send({ t: 'relay', to: 'all', d: { k: 'rx', i, f: m.from } }); } })); off.push(NET.on('left', (m) => this.playerLeft(m.i))); }
    else off.push(NET.on('relay', (m) => this.guestRelay(m.d)));
    off.push(NET.on('closed', () => { if (this.finished) return; this.finished = true; this.state = 'over'; toast(this, 'রুম বন্ধ হয়ে গেছে'); this.time.delayedCall(1300, () => fadeTo(this, 'Home')); }));
    this.events.once('shutdown', () => off.forEach((f) => f()));
  }
  onRemoteFlick(from, d) {
    const P = this.pl[from];
    if (!P || P.ai || this.state !== 'remote' || this.turn !== from || !P.pen.alive) return;
    const pen = P.pen, power = Phaser.Math.Clamp(+d.power || 0, 0.05, 1), grab = d.grab && isFinite(d.grab.x) ? d.grab : { x: pen.body.x, y: pen.body.y };
    if (Phaser.Math.Distance.Between(grab.x, grab.y, pen.body.x, pen.body.y) > 170) return;
    this.launch(pen, +d.angle || 0, power, grab);
  }
  playerLeft(i) {
    const P = this.pl[i]; if (!P || P.ai) return;
    P.ai = true; P.name += ' (AI)'; this.cfg[i].ai = true; toast(this, P.name.replace(' (AI)', '') + ' বেরিয়ে গেছে — AI খেলবে');
    if (this.turn === i && this.state === 'remote') { this.state = 'ai'; this.startTurn(i); }
  }
  sendSnap(dt) {
    // while pens move: a snapshot every few frames. While everything is still: only on change + a slow heartbeat (cuts most of the traffic).
    this.snapT = (this.snapT || 0) + dt; this.idleT = (this.idleT || 0) + dt;
    const moving = this.state === 'moving', key = this.turn + '|' + this.state + '|' + this.timeLeft + '|' + this.pl.map((P) => P.score).join(',');
    if (moving ? this.snapT < NET.snapEvery : (key === this.snapKey && this.idleT < 1500) || this.snapT < 150) return;
    this.snapT = 0; this.idleT = 0; this.snapKey = key;
    const p = this.pl.map((P) => { const b = P.pen.body, v = b.body ? b.body.velocity : { x: 0, y: 0 }; return [Math.round(b.x * 10) / 10, Math.round(b.y * 10) / 10, Math.round(b.rotation * 1000) / 1000, Math.round(v.x * 100) / 100, Math.round(v.y * 100) / 100]; });
    NET.send({ t: 'relay', to: 'all', d: { k: 'snap', p, s: this.pl.map((P) => P.score), turn: this.turn, st: this.state, tl: this.timeLeft, sd: this.sudden ? 1 : 0 } });
  }
  guestRelay(d) {
    if (!d) return;
    if (d.k === 'snap') return this.applySnap(d);
    if (d.k === 'rx') return d.f === this.you ? undefined : this.react(d.i | 0, false);
    if (d.k === 'fl') {                                   // somebody flicked: play it here at once (our own flick was already played)
      const P = this.pl[d.p]; if (d.p === this.you || !P || !P.pen.alive || !d.g) return;
      this.kick(P.pen, +d.a || 0, Phaser.Math.Clamp(+d.w || 0, 0.05, 1), d.g); return;
    }
    if (d.k === 'ev') { const p = this.pl[d.p]; if (p && p.pen.alive) { this.koFx(p.pen, d.label, d.col); this.time.delayedCall(900, () => { if (!this.finished) p.pen = this.spawn(d.p); }); } return; }
    if (d.k === 'fin') {
      if (this.finished) return; this.finished = true; this.state = 'over';
      this.time.delayedCall(700, () => fadeTo(this, 'Result', { mode: 'multi', online: true, arena: this.arena.id, time: this.matchTime, players: this.cfg, winner: d.winner, ranking: d.ranking, scores: d.scores, level: this.level }));
    }
  }
  applySnap(d) {
    this.snap = d; this.snapAt = performance.now(); this.turn = d.turn;
    d.s.forEach((v, i) => { if (this.pl[i]) this.pl[i].score = v; });
    this.refreshHud();
    this.timerTxt.setText(d.sd ? 'SD' : this.fmt(d.tl)).setColor(d.sd || d.tl <= 10 ? '#ff5a5a' : '#ffffff');
    const P = this.pl[d.turn], mine = d.turn === this.you && d.st === 'remote';
    if (this.state !== 'aiming') {
      if (this.state === 'gwait') { if (d.turn !== this.you || d.st !== 'remote') this.state = mine ? 'idle' : 'remote'; }
      else this.state = mine ? 'idle' : 'remote';
    }
    if (P) this.turnTxt.setText(d.turn === this.you ? 'আপনার পালা' : P.name + ' এর পালা').setColor('#' + P.color.toString(16).padStart(6, '0'));
    this.chips.forEach((c, k) => c.setAlpha(k === d.turn ? 1 : 0));
    if (this.state === 'idle') this.hint.setText('পেনের গায়ে আঙুল রেখে পেছনে টানুন — পাশে ধরলে পেন ঘুরবে');
    else if (this.state !== 'gwait' && this.state !== 'aiming') this.hint.setText(d.sd ? 'আকস্মিক মৃত্যু!' : '');
  }
  guestUpdate() {
    const s = this.snap, now = this.time.now, age = s ? Math.min(12, (performance.now() - (this.snapAt || 0)) / 16.7) : 0;   // frames since the last snapshot
    const justKicked = now - (this.gKickAt || -9999) < 900;          // a flick just started here: snapshots from before it must not pull the pen back
    const settled = !!s && s.st !== 'moving' && !justKicked;         // host says nothing moves any more: copy its exact positions
    this.pl.forEach((P, i) => {
      const p = P.pen; if (!p || !p.alive) return;
      const b = p.body, bd = b.body, t = s && s.p[i];
      if (p.spin) { if (p.spinHit) { p.spin = bd.angularVelocity; p.spinHit = false; } else { p.spin *= 0.985; if (Math.abs(p.spin) < 0.004) p.spin = 0; b.setAngularVelocity(p.spin); } }   // same spin rules as the host
      if (t && bd && !(justKicked && s.st !== 'moving')) {
        const ex = t[0] + (t[3] || 0) * age * 0.9, ey = t[1] + (t[4] || 0) * age * 0.9, err = Math.hypot(ex - b.x, ey - b.y);
        let dr = t[2] - b.rotation; dr = Math.atan2(Math.sin(dr), Math.cos(dr));
        const k = settled ? 0.5 : err > 140 ? 0.6 : 0.12;               // while pens move: only a gentle nudge, so motion stays smooth
        b.setPosition(b.x + (ex - b.x) * k, b.y + (ey - b.y) * k); b.setRotation(b.rotation + dr * (settled ? 0.5 : 0.1));
        if (settled) { b.setVelocity(0, 0); b.setAngularVelocity(0); p.spin = 0; }
        else b.setVelocity(bd.velocity.x + ((t[3] || 0) - bd.velocity.x) * 0.2, bd.velocity.y + ((t[4] || 0) - bd.velocity.y) * 0.2);
      }
      this.place(p);
    });
    if (this.state === 'gwait' && this.time.now - this.gwaitAt > 2500) this.state = 'remote';   // flick got lost: let the player try again
    this.drawGuides();
  }
  confirmLeave() {
    if (this.leaveDlg) return;
    const o = this.leaveDlg = this.add.container(0, 0).setDepth(100), close = () => { o.destroy(); this.leaveDlg = null; };
    o.add(this.add.rectangle(W / 2, H / 2, 4000, 3000, 0x000a28, 0.7).setInteractive());
    o.add(this.add.image(W / 2, 360, panelTex(this, 620, 300, '#ff4a68', 28, ['#143387', '#06103f'])));
    o.add(txt(this, W / 2, 270, 'ম্যাচ ছাড়বেন?', 40, '#ffd324'));
    o.add(txt(this, W / 2, 330, this.host ? 'আপনি হোস্ট — বেরোলে রুম সবার জন্য বন্ধ হয়ে যাবে' : 'আপনি বেরোলে আপনার পেন AI চালাবে', 22, '#fff'));
    o.add(button(this, W / 2 - 140, 420, 240, 62, 'থাকুন', 'g', close, 26));
    o.add(button(this, W / 2 + 140, 420, 240, 62, 'ছাড়ুন', 'r', () => { this.finished = true; NET.close(); fadeTo(this, 'Home'); }, 26));
  }
  // the knock-out animation (same on every device)
  koFx(p, label, color) {
    p.alive = false; sfx.fall();
    const q = project(p.body.x, p.body.y), v = p.body.body ? p.body.body.velocity : { x: 0, y: 0 };
    if (p.body.body) { p.body.setStatic(true); p.body.setSensor(true); }
    if (p.tag) { const tg = p.tag; p.tag = null; this.tweens.add({ targets: tg, alpha: 0, duration: 300, onComplete: () => tg.destroy() }); }
    this.tweens.add({ targets: [p.spr, p.shadow], x: '+=' + v.x * 8, y: '+=' + (v.y * 8 + 60), scale: 0.05, alpha: 0, duration: 700, ease: 'quad.in', onComplete: () => { p.spr.destroy(); p.shadow.destroy(); if (p.body.body) p.body.destroy(); } });
    const t = txt(this, Phaser.Math.Clamp(q.x, 140, W - 140), Phaser.Math.Clamp(q.y, 170, H - 100), label, 42, '#fff', { stroke: '#' + color.toString(16).padStart(6, '0'), strokeThickness: 9 }).setDepth(40);
    this.tweens.add({ targets: t, y: t.y - 60, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
    this.cameras.main.shake(180, 0.004);
  }

  knockOut(p) {
    p.alive = false; sfx.fall(); sfx.ko();
    const N = this.pl.length, victim = this.pl[p.player];
    // 1v1: the other player scores. Free-for-all: the player who touched this pen last (within 4 s) scores; a lone fall costs a point.
    let scorer = -1;
    if (N === 2) scorer = 1 - p.player;
    else if (this.state === 'moving' && p.player !== this.turn && p.lastTouch && p.lastTouch.t >= (this.moveStartAt || 0)) scorer = this.turn;   // chain hits: everything knocked out by this flick (even via another pen) counts for the player who flicked
    else if (p.lastTouch && this.time.now - p.lastTouch.t < 4000 && p.lastTouch.by !== p.player) scorer = p.lastTouch.by;
    let label;
    if (scorer >= 0) { this.pl[scorer].score++; label = N === 2 ? 'নক-আউট! +1' : `${this.pl[scorer].name} +1`; }
    else { victim.score = Math.max(0, victim.score - 1); label = `${victim.name} −1`; }
    this.refreshHud();
    if (p.player === (this.you >= 0 ? this.you : 0)) { this.myFalls = (this.myFalls || 0) + 1; this.say('fall', true); }
    const col = scorer >= 0 ? this.pl[scorer].color : 0xc0162c;
    this.koFx(p, label, col);
    if (this.host) NET.send({ t: 'relay', to: 'all', d: { k: 'ev', e: 'ko', p: p.player, label, col } });
    if (this.sudden && scorer >= 0 && this.tied.includes(scorer)) { this.state = 'over'; this.g.clear(); return this.time.delayedCall(900, () => this.finish(scorer)); }
    this.time.delayedCall(900, () => { if (this.state !== 'over') victim.pen = this.spawn(p.player); });
  }

  sparks(x, y, power) {
    const e = this.add.particles(x, y, 'spark', { speed: { min: 60, max: 80 + power * 8 }, lifespan: 320, scale: { start: 1, end: 0 }, quantity: 8, emitting: false }).setDepth(30);
    e.explode(8); this.time.delayedCall(400, () => e.destroy());
  }

  endMove() {
    { const me = this.you >= 0 ? this.you : 0; if (this.turn === me) { const near = this.pl.some((P) => P.i !== me && P.pen.alive && Math.min(P.pen.body.x, DESK.w - P.pen.body.x, P.pen.body.y, DESK.h - P.pen.body.y) < 60); if (near) this.say('edge'); } }
    if (this.timeUp) return this.decide();
    this.startTurn((this.turn + 1) % this.pl.length);
  }
  finish(winner) {
    if (this.finished) return; this.finished = true;
    this.state = 'over'; this.g.clear(); this.turnTxt.setText('ম্যাচ শেষ!');
    const ranking0 = this.pl.slice().sort((a, b) => b.score - a.score || (a.i === winner ? -1 : b.i === winner ? 1 : 0)).map((P) => ({ i: P.i, name: P.name, score: P.score, av: P.av, penId: P.def.id }));
    const ranking = ranking0;
    if (this.host) NET.send({ t: 'relay', to: 'all', d: { k: 'fin', winner, ranking, scores: this.pl.map((P) => P.score) } });
    this.time.delayedCall(900, () => fadeTo(this, 'Result', { online: !!this.online, mode: this.mode, practice: this.practice, arena: this.arena.id, time: this.matchTime, players: this.cfg, winner, ranking, scores: this.pl.map((P) => P.score), level: this.level }));
  }

  pause() {
    if (this.online) return this.confirmLeave();
    if (this.state === 'paused' || this.state === 'over') return;
    this.prev = this.state; this.state = 'paused'; this.matter.world.pause();
    const o = this.add.container(0, 0).setDepth(100);
    const again = () => fadeTo(this, 'Game', { mode: this.mode, practice: this.practice, arena: this.arena.id, time: this.matchTime, level: this.level, players: this.cfg });
    const close = () => { o.destroy(); this.matter.world.resume(); this.state = this.prev; };
    o.add(this.add.rectangle(W / 2, H / 2, 4000, 3000, 0x000a28, 0.6).setInteractive());
    o.add(this.add.image(W / 2, 390, panelTex(this, 860, 480, '#3b92ff', 34, ['#143387', '#06103f'])));
    o.add(banner(this, W / 2, 168, 460, 80, 'গেম পজ', 'ic_pause', 46));
    o.add(button(this, 330, 270, 300, 66, 'চালিয়ে যান', 'y', close, 30, 'ic_play'));
    o.add(button(this, 330, 350, 300, 62, 'আবার শুরু', 'b', again, 28, 'ic_refresh'));
    o.add(button(this, 330, 428, 300, 62, 'ম্যাচ শেষ করুন', 'r', () => { o.destroy(); this.matter.world.resume(); this.state = 'idle'; const top = Math.max(...this.pl.map((P) => P.score)); const w = this.pl.length === 2 && this.cfg.some((c) => c.ai) ? 1 : this.pl.find((P) => P.score === top).i; this.finish(w); }, 26, 'ic_flag'));
    o.add(button(this, 330, 506, 300, 62, 'হোমে ফিরুন', 'd', () => fadeTo(this, 'Home'), 28, 'ic_exit'));
    o.add(this.add.image(850, 390, panelTex(this, 460, 360, '#4aa0ff', 22, ['#0f2a78', '#06113f'])));
    const d = store.get();
    o.add(txt(this, 850, 245, 'সেটিংস', 32, '#fff'));
    o.add(txt(this, 700, 310, 'সাউন্ড', 28).setOrigin(0, 0.5));
    const sb = button(this, 960, 310, 150, 54, d.sound ? 'চালু' : 'বন্ধ', d.sound ? 'g' : 'd', () => { store.set({ sound: !store.get().sound }); sb.setLabel(store.get().sound ? 'চালু' : 'বন্ধ'); }, 24); o.add(sb);
    if (this.cfg.some((c) => c.ai)) o.add(txt(this, 850, 400, 'AI লেভেল: ' + ['সহজ', 'মধ্যম', 'কঠিন'][this.practice ? 0 : this.level], 28, '#ffd324'));
  }
}

export class Result extends Phaser.Scene {
  constructor() { super('Result'); }
  init(d) { this.d = d; }
  create() {
    const { mode, winner, practice, arena, time, players, ranking, level, online } = this.d;
    if (online) NET.close();
    fitCamera(this);
    this.cameras.main.fadeIn(250);
    coverBg(this, 'campus'); this.add.rectangle(W / 2, H / 2, 4000, 3000, 0x04103c, 0.35).setDepth(-99);
    this.add.rectangle(W / 2, H / 2, 4000, 3000, 0x2a1a6a, 0.25).setDepth(-98);
    const again0 = online ? () => fadeTo(this, 'OnlineRoom') : () => fadeTo(this, 'Game', { mode, practice, arena, time, players, level }), again = () => { sfx.say('rematch'); again0(); };
    banner(this, W / 2, 50, 620, 76, 'ম্যাচ ফলাফল', 'ic_trophy', 42);
    txt(this, W / 2, 112, (players.length > 2 ? `${players.length} জনের রুম` : '1v1 Match') + '  •  ' + arenaById(arena).name, 22, '#fff');
    const vsAi = players.length === 2 && players[1].ai;
    if (players.length > 2 || !vsAi) {
      // free-for-all / two humans: ranking table
      const win = ranking[0];
      sfx.win();
      heroImg(this, 190, 640, 520, 'hero_win');
      txt(this, W / 2 + 90, 190, `${win.name} জিতেছে!`, 56, '#ffd324', { stroke: '#7a3a00', strokeThickness: 10 }).setShadow(0, 6, '#000', 6, true, true);
      ranking.forEach((r, k) => {
        const y = 270 + k * 66, medal = ['🥇', '🥈', '🥉'][k] || String(k + 1);
        this.add.image(W / 2 + 90, y, panelTex(this, 640, 56, k === 0 ? '#ffc61a' : '#4aa0ff', 16, ['#10206a', '#08124a']));
        txt(this, W / 2 - 190, y, medal, 30, '#fff');
        this.add.image(W / 2 - 130, y, 'av_' + r.av).setDisplaySize(44, 44);
        txt(this, W / 2 - 90, y, r.name, 26, '#fff', { fontFamily: FONT_LATIN }).setOrigin(0, 0.5);
        this.add.image(W / 2 + 190, y, 'pen_' + r.penId).setScale(0.16).setRotation(-0.3);
        txt(this, W / 2 + 350, y, r.score + ' নক-আউট', 24, '#ffd324');
      });
      button(this, 470, 650, 230, 66, 'হোম', 'd', () => fadeTo(this, 'Home'), 28, 'ic_home');
      button(this, 710, 650, 230, 66, online ? 'নতুন রুম' : 'আবার খেলুন', 'y', again, 28, 'ic_refresh');
      button(this, 950, 650, 230, 66, online ? 'নতুন রুম' : 'রুম বদলান', 'b', () => fadeTo(this, online ? 'OnlineRoom' : 'RoomSetup'), 26, 'ic_users');
      return;
    }
    // 1v1 against the AI
    const win = winner === 0;
    let reward = null;
    if (!practice) reward = store.reward(win, [1, 1.5, 2][level] || 1);
    (win ? sfx.win : sfx.lose)();
    { const t = sfx.say(win ? 'win' : 'lose'); if (t) txt(this, W / 2, 440, t, 28, '#fff', { stroke: '#2a1000', strokeThickness: 6 }).setDepth(70); }
    const rays = this.add.image(200, 260, 'rays').setScale(0.9).setAlpha(win ? 0.28 : 0).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: rays, angle: 360, duration: 14000, repeat: -1 });
    const left = heroImg(this, 190, 640, 560, win ? 'hero_win' : 'hero');
    if (!win) left.setTint(0x9999aa);
    if (win) heroImg(this, 1090, 520, 360, 'hero_lose').setTint(0xaaaaaa); else this.add.image(1090, 340, 'av_rafid').setDisplaySize(250, 250);
    const tt = this.add.text(W / 2, 205, win ? 'VICTORY' : 'DEFEAT', { fontFamily: FONT_LOGO, fontSize: '112px', color: win ? '#ffd324' : '#ff6a78', stroke: win ? '#7a3a00' : '#5a0010', strokeThickness: 14 }).setOrigin(0.5).setScale(0.3).setShadow(0, 8, '#000', 6, true, true);
    this.tweens.add({ targets: tt, scale: 1, duration: 520, ease: 'back.out' });
    const g = this.add.graphics();
    g.fillGradientStyle(0x3a86ff, 0x3a86ff, 0x1a44c8, 0x1a44c8, 1).fillPoints([{ x: 520, y: 300 }, { x: 640, y: 300 }, { x: 628, y: 366 }, { x: 520, y: 366 }], true);
    g.fillGradientStyle(0xff4a60, 0xff4a60, 0xc0162c, 0xc0162c, 1).fillPoints([{ x: 640, y: 300 }, { x: 760, y: 300 }, { x: 760, y: 366 }, { x: 652, y: 366 }], true);
    txt(this, 575, 333, String(this.d.scores[0]), 52, '#fff', { fontFamily: FONT_LATIN }); txt(this, 705, 333, String(this.d.scores[1]), 52, '#fff', { fontFamily: FONT_LATIN });
    txt(this, 640, 335, 'VS', 34, '#ffd324', { fontFamily: FONT_LOGO, stroke: '#7a1a00', strokeThickness: 5 });
    txt(this, 640, 384, 'নক-আউট সংখ্যা', 20, '#fff');
    this.add.image(190, 585, panelTex(this, 300, 70, '#3a86ff', 18, ['#12378f', '#06164a'])); txt(this, 190, 585, players[0].name, 28, '#fff', { fontFamily: FONT_LATIN });
    this.add.image(1090, 560, panelTex(this, 280, 70, '#ff4a68', 18, ['#8a1636', '#40081c'])); txt(this, 1090, 560, players[1].name, 28, '#fff', { fontFamily: FONT_LATIN });
    this.add.image(640, 495, panelTex(this, 520, 150, '#4aa0ff', 24, ['#0f2a78', '#06113f']));
    txt(this, 640, 442, reward ? 'আপনার পুরস্কার (Rewards)' : 'অনুশীলন ম্যাচে পুরস্কার নেই', 26, '#ffd324');
    if (reward) {
      [['ic_trophy', (reward.trophies > 0 ? '+' : '') + reward.trophies, 'Trophy'], ['ic_star', '+' + reward.xp, 'XP'], ['ic_coin', '+' + reward.coins, 'Coins']].forEach(([ic, v, n], i) => {
        const x = 500 + i * 140;
        this.add.image(x, 488, ic).setDisplaySize(48, 48); txt(this, x, 526, v, 24, reward.trophies < 0 && i === 0 ? '#ff6a6a' : '#fff', { fontFamily: FONT_LATIN }); txt(this, x, 548, n, 16, '#cfe', { fontFamily: FONT_LATIN });
      });
    }
    if (win) for (let i = 0; i < 50; i++) { const c = this.add.rectangle(Phaser.Math.Between(0, W), -20, 10, 18, Phaser.Utils.Array.GetRandom([0xffc61a, 0xff4a60, 0x3a86ff, 0x4ae070]), 1).setRotation(Math.random() * 6).setDepth(5); this.tweens.add({ targets: c, y: H + 30, x: c.x + Phaser.Math.Between(-80, 80), rotation: c.rotation + 6, duration: Phaser.Math.Between(1800, 3600), delay: Phaser.Math.Between(0, 1400), repeat: -1 }); }
    button(this, 470, 650, 230, 66, 'হোম', 'd', () => fadeTo(this, 'Home'), 28, 'ic_home');
    button(this, 710, 650, 230, 66, 'আবার খেলুন', 'y', again, 28, 'ic_refresh');
    button(this, 950, 650, 230, 66, 'পেন বদলান', 'b', () => fadeTo(this, 'PenSelect'), 26, 'ic_pencil');
  }
}
