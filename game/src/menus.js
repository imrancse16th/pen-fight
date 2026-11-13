import Phaser from 'phaser';
import { W, H, buildAssets } from './assets.js';
import { store, PENS, penById, ARENAS, arenaById } from './store.js';
import { api, buyPen, serverBase } from './api.js';
import { NET } from './net.js';
import { lan } from './lan.js';
import { APP_VERSION, checkForUpdate, installUpdate, currentVersion } from './updater.js';
import { fitCamera, coverBg, heroImg, txt, button, panel, banner, circleBtn, campusBg, logoImg, deskProps, currency, header, toast, askText, fadeTo, statBar, tag, FONT, FONT_LATIN } from './ui.js';
import { sfx } from './sfx.js';
import { panelTex, lg, rr } from './gfx.js';

const DAY = 86400000;
let UPDATE_ASKED = false;   // ask only once per app start

/** "New version available" dialog. res = result of checkForUpdate() with status 'new'. */
function updateDialog(scene, res) {
  const info = res.info, o = scene.add.container(0, 0).setDepth(200);
  o.add(scene.add.rectangle(W / 2, H / 2, 4000, 3000, 0x000a28, 0.75).setInteractive());
  o.add(scene.add.image(W / 2, 350, panelTex(scene, 660, 380, '#5ad8ff', 28, ['#143387', '#06103f'])));
  o.add(txt(scene, W / 2, 205, 'নতুন আপডেট এসেছে!', 40, '#ffd324'));
  o.add(txt(scene, W / 2, 262, `ভার্সন ${res.cur}  →  ${info.version}`, 28, '#fff', { fontFamily: FONT_LATIN }));
  if (info.notes) o.add(scene.add.text(W / 2, 330, info.notes, { fontFamily: FONT, fontSize: '22px', color: '#dfe8ff', align: 'center', wordWrap: { width: 580 } }).setOrigin(0.5));
  const bar = scene.add.graphics(); o.add(bar);
  const status = txt(scene, W / 2, 400, '', 22, '#7ae0ff'); o.add(status);
  const draw = (p) => { bar.clear().fillStyle(0x070a18, 1).fillRoundedRect(W / 2 - 250, 425, 500, 22, 11); if (p > 0) bar.fillStyle(0xffc61a, 1).fillRoundedRect(W / 2 - 248, 427, Math.max(10, 496 * p / 100), 18, 9); };
  const later = button(scene, W / 2 - 150, 495, 230, 62, 'পরে', 'd', () => o.destroy(), 26);
  const now = button(scene, info.mandatory ? W / 2 : W / 2 + 150, 495, 260, 62, 'এখনই আপডেট', 'g', async () => {
    now.disableInteractive(); later.disableInteractive(); status.setText('ডাউনলোড হচ্ছে...'); draw(2);
    try { await installUpdate(info, (p) => { draw(p); status.setText(Math.round(p) + '%'); }); status.setText('চালু হচ্ছে...'); }
    catch (e) { status.setText('আপডেট হয়নি — সার্ভার চেক করুন').setColor('#ff8a8a'); now.setInteractive(); later.setInteractive(); }
  }, 26, 'ic_up2');
  o.add(later); o.add(now);
  if (info.mandatory) later.setVisible(false).disableInteractive();
}

export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    const L = (k, f) => this.load.image(k, 'img/' + f);
    L('campus', 'bg_campus.jpg'); L('splash', 'bg_splash.jpg'); L('gamebg', 'bg_game.jpg');
    ARENAS.forEach((a) => L('play_' + a.id, 'play_' + a.id + '.jpg'));
    L('arena_classroom', 'bg_arena_classroom.jpg'); L('arena_library', 'bg_arena_library.jpg'); L('arena_rooftop', 'bg_arena_rooftop.jpg');
    L('hero', 'hero_boy.png'); L('hero_win', 'hero_boy_win.png'); L('hero_lose', 'hero_rival_lose.png'); L('logo', 'logo.png');
    ['boy', 'girl', 'glasses', 'cap', 'rafid'].forEach((n) => L('av_' + n, 'av_' + n + '.jpg'));
    ['blue', 'red', 'gold', 'green', 'silver', 'neon'].forEach((n) => L('penimg_' + n, 'pen_' + n + '.png'));
  }
  async create() {
    try {
      await Promise.all([document.fonts.load("800 30px 'Baloo Da 2'"), document.fonts.load("700 30px 'Hind Siliguri'"), document.fonts.load("30px 'Lilita One'"), document.fonts.load("700 30px 'Poppins'"), document.fonts.load("600 30px 'Caveat'")]);
    } catch {}
    await buildAssets(this);
    const [h, ar] = location.hash.slice(1).split(':');
    const list = ['Home', 'Login', 'RoomHub', 'OnlineRoom', 'Shop', 'RoomSetup', 'ArenaSelect', 'PenSelect', 'Settings', 'Game', 'Result', 'Profile'];
    this.scene.start(list.includes(h) ? h : 'Splash', h === 'Game' ? { mode: 'ai', arena: ar } : h === 'Result' ? { mode: 'ai', winner: 'p', names: { p: 'You', e: 'AI' }, left: { p: 2, e: 0 } } : undefined);
  }
}

function notepad(scene, x, y) {
  if (!scene.textures.exists('notepad')) {
    const t = scene.textures.createCanvas('notepad', 330, 300), c = t.getContext();
    c.save(); c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 14; c.shadowOffsetY = 10; c.fillStyle = lg(c, 0, 20, 0, 290, [[0, '#f6e4b0'], [1, '#e4c88a']]); rr(c, 14, 28, 300, 250, 8); c.fill(); c.restore();
    c.fillStyle = '#3a2a18'; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(36 + i * 31, 28, 7, 0, 7); c.fill(); }
    c.strokeStyle = '#555'; c.lineWidth = 4; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(36 + i * 31, 24, 11, 3.4, 6.1); c.stroke(); }
    c.fillStyle = '#2a1a08'; c.font = `700 30px 'Poppins'`; c.fillText('Rule:', 34, 78);
    c.font = `700 27px 'Baloo Da 2'`; ['১. পেন ফেলাও', '২. টেবিলে বাঁচাও', '৩. শেষ পেন, সেই জয়ী!'].forEach((s, i) => c.fillText(s, 40, 128 + i * 46));
    c.strokeStyle = '#3a2a18'; c.lineWidth = 3; c.beginPath(); c.moveTo(220, 90); c.lineTo(232, 60); c.lineTo(250, 78); c.lineTo(268, 56); c.lineTo(276, 90); c.closePath(); c.stroke();
    t.refresh();
  }
  return scene.add.image(x, y, 'notepad');
}

function chalk(scene) {
  const g = scene.add.graphics().setAlpha(0.75);
  g.lineStyle(6, 0xffffff, 0.85);
  for (let a = 0; a < 6.2; a += 0.55) { g.beginPath(); for (let k = 0; k < 8; k++) { const t = a + k * 0.05; g.lineTo(560 + Math.cos(t) * 360, 540 + Math.sin(t) * 120); } g.strokePath(); }
  g.lineStyle(3, 0xffffff, 0.4); g.strokeEllipse(560, 540, 500, 160);
  g.lineStyle(4, 0xffffff, 0.6); g.strokeCircle(112, 650, 18); g.lineBetween(112, 668, 112, 705); g.lineBetween(112, 680, 88, 698); g.lineBetween(112, 680, 140, 662); g.lineBetween(112, 705, 94, 720); g.lineBetween(112, 705, 134, 720);
  g.strokeRect(300, 650, 76, 48); g.fillStyle(0xc83232, 0.7).fillCircle(338, 674, 12);
}

export class Splash extends Phaser.Scene {
  constructor() { super('Splash'); }
  create() {
    fitCamera(this);
    this.cameras.main.fadeIn(300);
    coverBg(this, 'splash');
    this.add.image(560, 560, 'pen_blue').setScale(0.62).setRotation(-0.2);
    this.add.image(700, 548, 'pen_red').setScale(0.62).setRotation(0.12);
    const lg2 = logoImg(this, W / 2, 215, 0.62);
    this.tweens.add({ targets: lg2, y: 209, yoyo: true, repeat: -1, duration: 1800, ease: 'sine.inOut' });
    const lab = txt(this, W / 2, 628, 'Loading...', 28, '#fff', { fontFamily: FONT_LATIN }); lab.setShadow(0, 2, '#000', 4, true, true);
    const pct = txt(this, W / 2 + 270, 672, '0%', 22, '#fff', { fontFamily: FONT_LATIN });
    const bar = this.add.graphics();
    const draw = (p) => {
      bar.clear().fillStyle(0x2a2630, 1).fillRoundedRect(W / 2 - 330, 654, 660, 36, 18).lineStyle(4, 0x3a3a48).strokeRoundedRect(W / 2 - 330, 654, 660, 36, 18);
      if (p > 0.02) { const w = 648 * p; bar.fillGradientStyle(0xffe45c, 0xffe45c, 0xf09000, 0xf09000, 1).fillRoundedRect(W / 2 - 324, 660, w, 24, 12).fillStyle(0xffffff, 0.4).fillRoundedRect(W / 2 - 318, 662, Math.max(0, w - 12), 7, 4); }
    };
    draw(0);
    const o = { p: 0 };
    this.tweens.add({ targets: o, p: 1, duration: 1500, onUpdate: () => { draw(o.p); pct.setText(Math.round(o.p * 100) + '%'); }, onComplete: () => {
      lab.setText('স্ক্রিনে ট্যাপ করে শুরু করুন').setFontFamily(FONT); pct.destroy();
      this.tweens.add({ targets: lab, alpha: 0.4, yoyo: true, repeat: -1, duration: 700 });
      this.input.once('pointerdown', () => { sfx.click(); if (!this.sys.game.device.os.desktop && !this.scale.isFullscreen) { try { this.scale.startFullscreen(); } catch (e) {} } fadeTo(this, 'Login'); });
    } });
  }
}

const EMAIL_RE = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,100}\.[A-Za-z]{2,20}$/;
const LOGIN_ERR = { name_taken: 'এই ইউজারনেম আগেই নেওয়া — অন্য নাম দিন', bad_login: 'আইডি/ইমেইল বা পাসওয়ার্ড ভুল', email_taken: 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট আছে', no_password: 'এই আইডিতে পাসওয়ার্ড দেওয়া নেই, তাই অন্য ফোনে ঢোকা যাবে না। যে ফোনে খেলেন সেখানে প্রোফাইল → "পাসওয়ার্ড দিন" চাপুন', offline: 'ইন্টারনেট নেই — সংযোগ দেখুন', banned: 'এই অ্যাকাউন্ট বন্ধ করা আছে — এডমিনকে জানান', rate_limited: 'অনেকবার চেষ্টা হয়েছে — একটু পরে আবার দিন', invalid: 'নাম / ইমেইল / পাসওয়ার্ড ঠিক নেই (ইমেইল সঠিক হতে হবে, পাসওয়ার্ড ৪+ অক্ষর)', server_error: 'সার্ভারে সমস্যা — পরে চেষ্টা করুন' };
// ---- Login: guest / new account / log in with ID + password ----
export class Login extends Phaser.Scene {
  constructor() { super('Login'); }
  create() {
    fitCamera(this); this.cameras.main.fadeIn(200);
    coverBg(this, 'splash');
    this.add.rectangle(W / 2, H / 2, 4000, 3000, 0x000a28, 0.35);
    logoImg(this, 330, 300, 0.7);
    const d = store.get(), has = !!(d.playerToken || d.guest);
    if (has) {
      // already signed in before: one tap continues with that account, or switch to another ID
      this.add.image(930, 400, panelTex(this, 500, 520, '#ffc61a', 30, ['#2a1c0a', '#120a02']));
      txt(this, 930, 190, 'স্বাগতম!', 34, '#ffd324');
      this.add.image(930, 270, 'av_boy').setDisplaySize(84, 84);
      txt(this, 930, 335, d.name, 32, '#fff', { fontFamily: FONT_LATIN });
      txt(this, 930, 372, d.playerId ? 'আইডি: ' + d.playerId : 'গেস্ট', 22, '#ffd324', { fontFamily: FONT_LATIN });
      button(this, 930, 440, 420, 70, 'চালিয়ে যান', 'g', () => this.cont(), 30, 'ic_play');
      txt(this, 930, 510, 'অন্য অ্যাকাউন্টে খেলতে চান?', 20, '#fff');
      button(this, 790, 565, 200, 56, 'অন্য আইডি', 'b', () => this.login(), 22);
      button(this, 1070, 565, 200, 56, 'নতুন', 'y', () => this.create2(), 22);
    } else {
    this.add.image(930, 400, panelTex(this, 500, 520, '#ffc61a', 30, ['#2a1c0a', '#120a02']));
    txt(this, 930, 190, 'গেমে লগইন করুন', 34, '#ffd324');
    button(this, 930, 280, 420, 66, 'গেস্ট হিসেবে খেলুন', 'g', () => this.guest(), 28, 'ic_play');
    txt(this, 930, 352, 'অথবা', 20, '#fff');
    button(this, 930, 420, 420, 66, 'অ্যাকাউন্ট তৈরি করুন', 'y', () => this.create2(), 28, 'ic_user');
    txt(this, 930, 505, 'ইতিমধ্যে অ্যাকাউন্ট আছে?', 20, '#fff');
    button(this, 930, 565, 420, 62, 'আইডি দিয়ে লগইন', 'b', () => this.login(), 26, 'ic_exit');
    }
  }
  async cont() { await api.sync(); fadeTo(this, 'Home'); }
  async guest() { await api.guest(); toast(this, 'গেস্ট হিসেবে ঢুকলেন — পরে সেটিংসে পাসওয়ার্ড দিতে পারবেন'); this.time.delayedCall(500, () => fadeTo(this, 'Home')); }
  create2() {
    askText('ইউজারনেম (এটা দিয়েই লগইন করবেন)', store.get().name, (n) => {
      if (!n || !n.trim()) return;
      askText('ইমেইল', '', (em) => {
        if (em === null) return;
        em = em.trim().toLowerCase();
        if (!EMAIL_RE.test(em)) return toast(this, 'সঠিক ইমেইল দিন (যেমন name@gmail.com)');
        askText('পাসওয়ার্ড দিন', '', async (p) => {
          if (p === null) return;
          if (p.length < 4) return toast(this, 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষর');
          const r = await api.createAccount(n.trim().slice(0, 14), p, em);
          if (!r.ok) return toast(this, LOGIN_ERR[r.error] || 'অ্যাকাউন্ট হয়নি');
          toast(this, 'অ্যাকাউন্ট হয়েছে! আপনার আইডি: ' + r.id + ' (মনে রাখুন)'); this.time.delayedCall(2200, () => fadeTo(this, 'Home'));
        }, { password: true, max: 40, hint: 'কমপক্ষে ৪ অক্ষর' });
      }, { max: 120, email: true, hint: 'এই ইমেইল দিয়েও লগইন করা যাবে' });
    }, { max: 14, hint: 'ইংরেজি বা বাংলা নাম, সর্বোচ্চ ১৪ অক্ষর' });
  }
  login() {
    askText('ইমেইল / ইউজারনেম / আইডি', '', (id) => {   // the password is always asked next: nobody can open another player's ID without it
      if (!id || !id.trim()) return;
      askText('পাসওয়ার্ড', '', async (p) => {
        if (p === null) return;
        const r = await api.login(id, p);
        if (!r.ok) return toast(this, LOGIN_ERR[r.error] || 'লগইন হয়নি');
        toast(this, 'স্বাগতম, ' + store.get().name + '!'); this.time.delayedCall(900, () => fadeTo(this, 'Home'));
      }, { password: true, max: 40 });
    }, { max: 120, hint: 'ইমেইল, ইউজারনেম, অথবা ৬ সংখ্যার আইডি' });
  }
}


export class Home extends Phaser.Scene {
  constructor() { super('Home'); }
  create() {
    fitCamera(this);
    this.cameras.main.fadeIn(200);
    const d = store.get();
    campusBg(this, 0.08);
    heroImg(this, 370, 725, 640);
    logoImg(this, 170, 190, 0.3);
    this.add.image(170, 55, panelTex(this, 300, 80, '#ffc61a', 18, ['#1c2448', '#0a0f26']));
    this.add.image(60, 55, 'av_boy').setDisplaySize(62, 62);
    txt(this, 222, 38, d.name, 23, '#fff', { fontFamily: FONT_LATIN });
    txt(this, 112, 70, 'Lv. ' + store.level(), 20, '#fff', { fontFamily: FONT_LATIN }).setOrigin(0, 0.5);
    this.add.graphics().fillStyle(0x070a18, 1).fillRoundedRect(176, 62, 124, 15, 7).fillStyle(0xffc61a, 1).fillRoundedRect(178, 64, Math.max(8, 120 * store.levelProgress()), 11, 5);
    this.add.image(468, 55, panelTex(this, 240, 80, '#4a68c8', 18, ['#1c2448', '#0a0f26']));
    this.add.image(380, 55, 'ic_star').setDisplaySize(44, 44);
    txt(this, 468, 40, store.rank() + ' III', 22, '#fff', { fontFamily: FONT_LATIN });
    txt(this, 468, 70, '🏆 ' + d.trophies, 20, '#ffd324', { fontFamily: FONT_LATIN });
    const cur = currency(this, 16);
    api.sync().then(() => { if (this.sys && this.sys.isActive() && cur.gem && cur.gem.active) cur.gem.setText(String(store.get().gems)); });
    if (!UPDATE_ASKED) { UPDATE_ASKED = true; checkForUpdate().then((r) => { if (r.status === 'new' && this.sys && this.sys.isActive()) updateDialog(this, r); }); }
    const quick = (y, ic, label, cb) => {
      this.add.image(70, y, panelTex(this, 100, 112, '#5a78d8', 16, ['#2a3150', '#10152c']));
      this.add.image(70, y - 24, ic).setDisplaySize(46, 46);
      txt(this, 70, y + 28, label, 15, '#fff', { maxW: 88, align: 'center', lineSpacing: -4 });
      const z = this.add.zone(70, y, 100, 112).setInteractive({ useHandCursor: true }); z.on('pointerup', () => { sfx.click(); cb(); });
    };
    const canClaim = Date.now() - (d.lastClaim || 0) > DAY;
    quick(330, 'ic_gift', 'দৈনিক\nপুরস্কার', () => this.claim());
    if (canClaim) this.add.circle(112, 282, 9, 0xe8283a).setStrokeStyle(2, 0xffffff);
    quick(450, 'ic_user', 'প্রোফাইল', () => fadeTo(this, 'Profile'));
    quick(570, 'ic_gem', 'ডায়মন্ড\nশপ', () => fadeTo(this, 'Shop'));
    const card = (y, w, h, fill, border, title, sub, kind, cb, art) => {
      const x = W - 20 - w;
      this.add.image(x + w / 2, y + h / 2, panelTex(this, w, h, border, 28, fill));
      art(x, y, w, h);
      this.add.text(x + w * 0.4, y + h * 0.36, title, { fontFamily: FONT, fontSize: Math.min(46, Math.round(h * 0.22)) + 'px', color: kind === 'y' ? '#2a1000' : '#fff', fontStyle: '800', wordWrap: { width: w * 0.6 - 90 } }).setOrigin(0, 0.5);
      this.add.text(x + w * 0.4, y + h * 0.7, sub, { fontFamily: FONT, fontSize: Math.round(h * 0.12) + 'px', color: kind === 'y' ? '#2a1000' : '#e8eeff', fontStyle: '700', lineSpacing: 2 }).setOrigin(0, 0.5);
      circleBtn(this, x + w - 56, y + h / 2, Math.min(40, h * 0.3), 'ic_play', cb, kind === 'y' ? 'c' : 'y');
      const z = this.add.zone(x + (w - 100) / 2, y + h / 2, w - 100, h).setInteractive({ useHandCursor: true }); z.on('pointerup', () => { sfx.click(); cb(); });
    };
    card(150, 600, 190, ['#ffe46a', '#f09a00'], '#ffe9a0', 'র‍্যান্ডম ম্যাচ', 'AI-এর সাথে খেলুন', 'y', () => fadeTo(this, 'ArenaSelect', { mode: 'ai' }), (x, y, w, h) => {
      this.add.image(x + 120, y + h / 2, 'pen_blue').setScale(0.5).setRotation(0.7); this.add.image(x + 120, y + h / 2, 'pen_red').setScale(0.5).setRotation(-0.7);
      txt(this, x + 120, y + h / 2 + 18, 'VS', 52, '#ffd324', { fontFamily: "'Lilita One'", stroke: '#7a1a00', strokeThickness: 7 });
    });
    card(360, 580, 140, ['#3a90ff', '#1146c0'], '#bfe0ff', 'রুমে খেলুন', 'ইন্টারনেট বা কাছাকাছি', 'b', () => fadeTo(this, 'RoomHub'), (x, y, w, h) => {
      this.add.image(x + 64, y + h - 56, 'av_boy').setDisplaySize(112, 112); this.add.image(x + 150, y + h - 56, 'av_glasses').setDisplaySize(112, 112);
    });
    card(516, 560, 120, ['#8a4aea', '#4c1fb0'], '#c9a8ff', 'এক ফোনে', '২–৫ জন একসাথে', 'p', () => fadeTo(this, 'RoomSetup'), (x, y, w, h) => {
      this.add.image(x + 90, y + h / 2, 'ic_users').setDisplaySize(84, 84);
    });
    this.add.image(800, 682, panelTex(this, 880, 62, '#7a90d8', 20, ['#1c2340', '#0b0f24']));
    const nav = (x, w, ic, label, on, cb) => {
      if (on) this.add.image(x, 682, panelTex(this, w, 58, '#fff1a0', 18, ['#ffe45c', '#e69500']));
      this.add.image(x - 62, 682, ic).setDisplaySize(34, 34).setTint(on ? 0x3a1d00 : 0xffffff);
      txt(this, x + 16, 683, label, 23, on ? '#3a1d00' : '#fff');
      if (cb) { const z = this.add.zone(x, 682, w, 58).setInteractive({ useHandCursor: true }); z.on('pointerup', () => { sfx.click(); cb(); }); }
    };
    nav(480, 200, 'ic_home', 'হোম', true);
    nav(690, 200, 'ic_pencil', 'পেন', false, () => fadeTo(this, 'PenSelect'));
    nav(900, 200, 'ic_user', 'প্রোফাইল', false, () => fadeTo(this, 'Profile'));
    nav(1110, 200, 'ic_gear', 'সেটিংস', false, () => fadeTo(this, 'Settings'));
  }
  claim() {
    const d = store.get();
    if (Date.now() - (d.lastClaim || 0) < DAY) return toast(this, 'আজকের পুরস্কার নেওয়া হয়ে গেছে। কাল আবার আসুন!');
    store.set({ coins: d.coins + 100, lastClaim: Date.now() });
    sfx.win(); toast(this, '+100 কয়েন পেয়েছেন!'); this.time.delayedCall(900, () => this.scene.restart());
  }
}

export class PenSelect extends Phaser.Scene {
  constructor() { super('PenSelect'); }
  create() { fitCamera(this); this.idx = Math.max(0, PENS.findIndex((p) => p.id === store.get().pen)); this.build(); }
  build() {
    this.children.removeAll(true); this.tweens.killAll();
    this.cameras.main.fadeIn(150);
    header(this, 'পেন নির্বাচন', 'ic_pencil', () => fadeTo(this, 'Home'), 'শক্তিশালী পেন ডায়মন্ড দিয়ে কিনতে হয়');
    const d = store.get(), p = PENS[this.idx], owned = d.owned.includes(p.id);
    heroImg(this, 120, 725, 520);
    this.add.image(755, 345, panelTex(this, 1020, 440, '#3b92ff', 28, ['#143387', '#06103f']));
    txt(this, 640, 182, p.name, 40, '#fff');
    tag(this, 880, 184, p.rarity, p.rarity);
    const g = this.add.graphics();
    for (let i = 5; i > 0; i--) g.fillStyle(0x3ab0ff, 0.07 * (6 - i)).fillEllipse(640, 345, 180 + i * 50, 40 + i * 12);
    g.lineStyle(4, 0x7ae8ff, 0.9).strokeEllipse(640, 345, 300, 52);
    this.add.image(640, 300, 'rays').setScale(0.55).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD);
    const big = this.add.image(640, 292, 'pen_' + p.id).setScale(0.72).setRotation(-0.4);
    this.tweens.add({ targets: big, y: 280, yoyo: true, repeat: -1, duration: 1500, ease: 'sine.inOut' });
    circleBtn(this, 300, 285, 26, 'ic_back', () => { this.idx = (this.idx + PENS.length - 1) % PENS.length; this.build(); });
    circleBtn(this, 910, 285, 26, 'ic_fwd', () => { this.idx = (this.idx + 1) % PENS.length; this.build(); });
    // price of a pen that is not owned yet
    if (!owned) {
      const price = p.gems > 0 ? p.gems : p.coins;
      this.add.image(640, 392, panelTex(this, 190, 40, p.gems > 0 ? '#5ad8ff' : '#ffc61a', 20, ['#0a1440', '#050a28']));
      this.add.image(588, 392, p.gems > 0 ? 'ic_gem' : 'ic_coin').setDisplaySize(30, 30);
      txt(this, 650, 392, String(price), 26, '#fff', { fontFamily: FONT_LATIN });
    }
    this.add.image(1110, 290, panelTex(this, 330, 270, '#4aa0ff', 22, ['#0f2a78', '#06113f']));
    txt(this, 1110, 170, 'পেন স্ট্যাটাস', 26, '#fff');
    [['ic_fist', 'পাওয়ার', p.power], ['ic_target', 'অ্যাকুরেসি', p.acc], ['ic_bolt', 'স্পিড', p.speed], ['ic_shield', 'ওজন', p.dur], ['ic_lock', 'টিকে থাকা', Math.min(100, 30 + p.hold * 2)]].forEach(([ic, n, v], i) => {
      const y = 197 + i * 40;
      this.add.image(970, y + 9, ic).setDisplaySize(28, 28);
      this.add.text(992, y + 9, n, { fontFamily: FONT, fontSize: '17px', color: '#fff', fontStyle: '700' }).setOrigin(0, 0.5);
      statBar(this, 1108, y, 100, v / 100, 18);
      this.add.text(1222, y + 9, String(v), { fontFamily: FONT_LATIN, fontSize: '20px', color: '#fff', fontStyle: '700' }).setOrigin(0, 0.5);
    });
    PENS.forEach((q, i) => {
      const x = 345 + i * 158, y = 480, sel = i === this.idx, own = d.owned.includes(q.id);
      const bd = sel ? '#ffc61a' : q.rarity === 'Epic' ? '#a06aff' : q.rarity === 'Rare' ? '#3a8aff' : q.rarity === 'Legendary' ? '#ff9a3a' : '#8a96b0';
      this.add.image(x, y, panelTex(this, 144, 142, bd, 16, ['#15246a', '#08104a']));
      this.add.image(x, y - 22, 'pen_' + q.id).setScale(0.26).setRotation(-0.5).setAlpha(own ? 1 : 0.5);
      txt(this, x, y + 28, q.name, 16, '#fff');
      if (own) tag(this, x, y + 56, q.rarity, q.rarity);
      else {
        this.add.image(x - 26, y + 56, q.gems > 0 ? 'ic_gem' : 'ic_coin').setDisplaySize(24, 24);
        txt(this, x + 8, y + 56, String(q.gems > 0 ? q.gems : q.coins), 20, '#fff', { fontFamily: FONT_LATIN });
        this.add.image(x + 48, y - 54, 'ic_lock').setDisplaySize(26, 26);
      }
      if (d.pen === q.id) this.add.image(x + 54, y - 52, 'ic_check').setDisplaySize(26, 26);
      const z = this.add.zone(x, y, 144, 142).setInteractive({ useHandCursor: true }); z.on('pointerup', () => { sfx.click(); this.idx = i; this.build(); });
    });
    if (d.pen === p.id) button(this, 640, 640, 420, 74, '✔ ব্যবহার হচ্ছে', 'g', null, 34);
    else if (owned) button(this, 640, 640, 420, 74, 'এই পেন ব্যবহার করো', 'y', () => { store.set({ pen: p.id }); this.build(); }, 34, 'ic_check');
    else button(this, 640, 640, 420, 74, `কিনুন  ${p.gems > 0 ? p.gems : p.coins}`, 'b', () => this.buy(p), 34, p.gems > 0 ? 'ic_gem' : 'ic_coin');
  }
  async buy(p) {
    const r = await buyPen(p.id);
    if (r.ok) { store.set({ pen: p.id }); sfx.win(); this.build(); toast(this, p.name + ' কেনা হয়েছে!'); return; }
    if (r.error === 'not_enough') { toast(this, 'ডায়মন্ড কম পড়ছে! শপ থেকে ডায়মন্ড নিন'); this.time.delayedCall(1100, () => fadeTo(this, 'Shop')); }
    else if (r.error === 'no_coins') toast(this, 'কয়েন কম পড়ছে!');
    else toast(this, 'সার্ভার পাওয়া যায়নি — সেটিংসে সার্ভার ঠিকানা দেখুন');
  }
}

export class Profile extends Phaser.Scene {
  constructor() { super('Profile'); }
  create() {
    fitCamera(this);
    this.cameras.main.fadeIn(150);
    header(this, 'প্লেয়ার প্রোফাইল', 'ic_user', () => fadeTo(this, 'Home'));
    const d = store.get(), tot = d.wins + d.losses;
    this.add.image(280, 345, panelTex(this, 440, 420, '#3b92ff', 28, ['#143387', '#06103f']));
    this.add.image(150, 265, 'av_boy').setDisplaySize(170, 170);
    this.add.rectangle(150, 265, 170, 170).setStrokeStyle(6, 0x3a8aff);
    txt(this, 360, 215, d.name, 32, '#fff', { fontFamily: FONT_LATIN });
    txt(this, 360, 262, 'Lv. ' + store.level() + '  •  ' + store.rank(), 26, '#ffd324', { fontFamily: FONT_LATIN });
    txt(this, 360, 305, '🏆 ' + d.trophies, 30, '#fff', { fontFamily: FONT_LATIN });
    this.add.graphics().fillStyle(0x070a18, 1).fillRoundedRect(90, 380, 380, 22, 11).fillStyle(0xffc61a, 1).fillRoundedRect(92, 382, Math.max(10, 376 * store.levelProgress()), 18, 9);
    txt(this, 280, 425, `XP ${d.xp % 100} / 100`, 22, '#fff', { fontFamily: FONT_LATIN });
    button(this, 280, 510, 340, 64, 'নাম পরিবর্তন', 'd', () => askText('আপনার নাম লিখুন', d.name, (n) => { if (n && n.trim()) { store.set({ name: n.trim().slice(0, 14) }); this.scene.restart(); } }), 28);
    this.add.image(870, 250, panelTex(this, 600, 190, '#4aa0ff', 24, ['#0f2a78', '#06113f']));
    txt(this, 870, 175, 'পরিসংখ্যান', 30, '#fff');
    [['মোট ম্যাচ', tot], ['জয়', d.wins], ['পরাজয়', d.losses], ['জয়ের হার', tot ? Math.round((d.wins * 100) / tot) + '%' : '0%']].forEach(([n, v], i) => {
      const x = 620 + i * 150;
      txt(this, x, 225, String(v), 40, '#ffd324', { fontFamily: FONT_LATIN }); txt(this, x, 270, n, 22, '#fff');
    });
    this.add.image(870, 470, panelTex(this, 600, 220, '#4aa0ff', 24, ['#0f2a78', '#06113f']));
    txt(this, 870, 390, 'আমার পেন', 28, '#fff');
    d.owned.slice(0, 5).forEach((id, i) => { this.add.image(620 + i * 120, 470, 'pen_' + id).setScale(0.2).setRotation(-0.5); });
    button(this, 870, 540, 300, 56, 'পেন সংগ্রহ দেখুন', 'y', () => fadeTo(this, 'PenSelect'), 26);
  }
}



export class Settings extends Phaser.Scene {
  constructor() { super('Settings'); }
  create() { fitCamera(this); this.cameras.main.fadeIn(150); this.build(); }
  build() {
    this.children.removeAll(true);
    header(this, 'সেটিংস', 'ic_gear', () => fadeTo(this, 'Home'), 'গেমের অভিজ্ঞতা নিজের মতো করে সাজাও');
    this.add.image(W / 2, 420, panelTex(this, 860, 520, '#3b92ff', 28, ['#143387', '#06103f']));
    const d = store.get();
    txt(this, 280, 200, 'সাউন্ড', 30).setOrigin(0, 0.5);
    button(this, 940, 200, 200, 56, d.sound ? 'চালু' : 'বন্ধ', d.sound ? 'g' : 'd', () => { store.set({ sound: !d.sound }); this.build(); }, 26);
    txt(this, 280, 272, 'পূর্ণ স্ক্রিন', 30).setOrigin(0, 0.5);
    button(this, 940, 272, 200, 56, this.scale.isFullscreen ? 'বন্ধ করুন' : 'চালু (F)', 'b', () => { this.scale.toggleFullscreen(); this.time.delayedCall(400, () => this.build()); }, 24);
    txt(this, 280, 344, 'আপনার প্লেয়ার আইডি', 28).setOrigin(0, 0.5);
    txt(this, 940, 344, d.playerId || 'সংযুক্ত নয়', 34, d.playerId ? '#ffd324' : '#ff8a8a', { fontFamily: FONT_LATIN });
    txt(this, 280, 396, 'এই আইডি এডমিনকে দিলে আপনার অ্যাকাউন্টে ডায়মন্ড যোগ করে দিতে পারে', 20, '#cfe').setOrigin(0, 0.5);
    txt(this, 280, 458, 'অ্যাকাউন্ট', 28).setOrigin(0, 0.5);
    if (!d.hasPass) button(this, 620, 458, 280, 56, 'পাসওয়ার্ড দিন', 'y', () => askText('ইউজারনেম', d.name, (u) => { if (!u || !u.trim()) return; askText('ইমেইল', '', (em) => { if (em === null) return; em = em.trim().toLowerCase(); if (!EMAIL_RE.test(em)) return toast(this, 'সঠিক ইমেইল দিন (যেমন name@gmail.com)'); askText('নতুন পাসওয়ার্ড', '', async (p) => { if (p === null) return; if (p.length < 4) return toast(this, 'কমপক্ষে ৪ অক্ষর'); const r = await api.setPassword(p, u.trim(), em); toast(this, r.ok ? 'হয়ে গেছে — এখন ইউজারনেম/আইডি দিয়ে অন্য ফোনেও ঢোকা যাবে' : (LOGIN_ERR[r.error] || 'ইন্টারনেট নেই')); this.build(); }, { password: true, max: 40 }); }, { max: 120, email: true }); }, { max: 14 }), 22);
    else txt(this, 620, 458, 'পাসওয়ার্ড দেওয়া ✔', 22, '#9fef9f').setOrigin(0.5);
    button(this, 940, 458, 200, 56, 'লগআউট', 'r', () => { api.logout(); fadeTo(this, 'Login'); }, 24);
    txt(this, 280, 524, 'অ্যাপ ভার্সন', 28).setOrigin(0, 0.5);
    const vt = txt(this, 520, 524, 'v' + APP_VERSION, 24, '#ffd324', { fontFamily: FONT_LATIN }).setOrigin(0, 0.5);
    currentVersion().then((v) => { if (vt.active) vt.setText('v' + v); });
    button(this, 940, 524, 200, 52, 'আপডেট খুঁজুন', 'g', async () => {
      toast(this, 'খোঁজা হচ্ছে...');
      const r = await checkForUpdate();
      if (r.status === 'new') updateDialog(this, r);
      else if (r.status === 'latest') toast(this, 'আপনার অ্যাপ সর্বশেষ ভার্সনে আছে ✔');
      else if (r.status === 'noserver') toast(this, 'আগে সার্ভার ঠিকানা দিন');
      else toast(this, 'সার্ভার পাওয়া যায়নি');
    }, 21);
    button(this, W / 2, 604, 420, 52, 'সব ডেটা রিসেট করুন', 'r', () => { localStorage.removeItem('penfight.v1'); location.reload(); }, 24);
  }
}

const LEVELS = [{ name: 'সহজ', mult: 1 }, { name: 'মধ্যম', mult: 1.5 }, { name: 'কঠিন', mult: 2 }];
export const levelMult = (i) => (LEVELS[i] || LEVELS[0]).mult;

export class ArenaSelect extends Phaser.Scene {
  constructor() { super('ArenaSelect'); }
  init(d) { this.mode = d?.mode || 'ai'; this.practice = !!d?.practice; this.players = d?.players; this.tsel = undefined; this.lsel = this.practice ? 0 : undefined; }
  create() {
    fitCamera(this);
    this.cameras.main.fadeIn(150);
    const d = store.get();
    this.sel = Math.max(0, ARENAS.findIndex((a) => a.id === d.arena));
    this.build();
  }
  build() {
    this.children.removeAll(true);
    header(this, 'অ্যারিনা নির্বাচন', 'ic_globe', () => fadeTo(this, this.mode === 'multi' ? 'RoomSetup' : 'Home'), 'যেকোনো অ্যারিনায় খেলা যাবে — পছন্দ করে বেছে নাও!');
    const needLevel = this.mode === 'ai' && !this.practice;
    const cw = 286, ch = 330, gap = 22, x0 = (W - (4 * cw + 3 * gap)) / 2, y0 = 138;
    ARENAS.forEach((a, i) => {
      const x = x0 + i * (cw + gap), on = i === this.sel;
      this.add.image(x + cw / 2, y0 + ch / 2, panelTex(this, cw, ch, on ? '#ffc61a' : a.col, 28, ['#1a1a3a', '#0a0a22']));
      const ph = 214, pw = cw - 16, px = x + 8, py = y0 + 8;
      const im = this.add.image(px + pw / 2, py + ph / 2, a.bg);
      im.setScale(Math.max(pw / im.width, ph / im.height));
      const mg = this.make.graphics({ x: 0, y: 0, add: false }); mg.fillStyle(0xffffff).fillRoundedRect(px, py, pw, ph, 20);
      im.setMask(mg.createGeometryMask());
      if (on) this.add.image(x + cw - 34, py + 34, 'ic_check').setDisplaySize(30, 30);
      txt(this, x + cw / 2, y0 + 246, a.name, 26, on ? '#ffd324' : '#fff');
      this.add.text(x + cw / 2, y0 + 292, a.desc, { fontFamily: FONT, fontSize: '17px', color: '#dfe8ff', fontStyle: '600', align: 'center', wordWrap: { width: cw - 30 } }).setOrigin(0.5);
      const z = this.add.zone(x + cw / 2, y0 + ch / 2, cw, ch).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => { sfx.click(); this.sel = i; this.build(); });
    });
    // level (only when playing against the AI) and match time — chosen every time, no default
    let y = 520;
    if (needLevel) {
      txt(this, 250, y, 'AI লেভেল:', 26, '#fff').setOrigin(0, 0.5).setShadow(0, 2, '#000', 4, true, true);
      LEVELS.forEach((l, i) => button(this, 600 + i * 190, y, 176, 50, `${l.name}  ×${l.mult}`, this.lsel === i ? 'y' : 'd', () => { this.lsel = i; this.build(); }, 21));
      txt(this, 1155, y, 'পুরস্কার', 16, '#ffd324');
      y += 62;
    }
    txt(this, 250, y, 'ম্যাচের সময়:', 26, '#fff').setOrigin(0, 0.5).setShadow(0, 2, '#000', 4, true, true);
    [[60, '১ মিনিট'], [120, '২ মিনিট'], [180, '৩ মিনিট'], [300, '৫ মিনিট']].forEach(([sec, label], i) => button(this, 540 + i * 160, y, 148, 50, label, this.tsel === sec ? 'y' : 'd', () => { this.tsel = sec; this.build(); }, 21));
    const a = ARENAS[this.sel], ready = this.tsel && (!needLevel || this.lsel !== undefined);
    if (ready) button(this, W / 2, 662, 560, 70, 'খেলা শুরু করুন', 'y', () => { store.set({ arena: a.id }); fadeTo(this, 'Game', { mode: this.mode, practice: this.practice, arena: a.id, time: this.tsel, level: this.lsel ?? 1, players: this.players }); }, 34, 'ic_swords');
    else button(this, W / 2, 662, 560, 70, needLevel ? 'আগে লেভেল ও সময় বেছে নিন' : 'আগে ম্যাচের সময় বেছে নিন', 'd', () => toast(this, needLevel ? 'প্রথমে AI লেভেল ও ম্যাচের সময় বেছে নিন' : 'প্রথমে ম্যাচের সময় বেছে নিন'), 28, 'ic_clock');
  }
}

const PACKS = [
  { pack: 100, gems: 100, price: '৳49', bonus: '' },
  { pack: 500, gems: 550, price: '৳199', bonus: '+10%' },
  { pack: 1200, gems: 1440, price: '৳399', bonus: '+20%' },
  { pack: 3000, gems: 3750, price: '৳799', bonus: '+25%' },
  { pack: 6500, gems: 8450, price: '৳1599', bonus: '+30%' },
];

export class Shop extends Phaser.Scene {
  constructor() { super('Shop'); }
  create() { fitCamera(this); this.cameras.main.fadeIn(150); this.build(); }
  build() {
    this.children.removeAll(true);
    header(this, 'ডায়মন্ড শপ', 'ic_gem', () => fadeTo(this, 'Home'), 'কিনতে এডমিনকে মেসেজ দিন');
    const d = store.get();
    this.add.image(W / 2, 205, panelTex(this, 1000, 78, '#5ad8ff', 22, ['#0f2a78', '#06113f']));
    txt(this, 330, 205, 'আপনার প্লেয়ার আইডি:', 24, '#fff');
    txt(this, 560, 205, d.playerId || 'সংযুক্ত নয়', 40, d.playerId ? '#ffd324' : '#ff8a8a', { fontFamily: FONT_LATIN });
    txt(this, 910, 205, 'এই আইডি এডমিনকে দিন', 17, '#cfe').setWordWrapWidth?.(300);
    PACKS.forEach((p, i) => {
      const x = 90 + i * 232, y = 270, w = 212, h = 330;
      this.add.image(x + w / 2, y + h / 2, panelTex(this, w, h, i === 3 ? '#ffc61a' : '#3b92ff', 24, ['#14327f', '#071247']));
      if (p.bonus) { this.add.image(x + w - 40, y + 16, panelTex(this, 80, 34, '#ff4a68', 12, ['#c0162c', '#800a18'])); txt(this, x + w - 40, y + 16, p.bonus, 18, '#fff', { fontFamily: FONT_LATIN }); }
      const sz = 70 + i * 14;
      this.add.image(x + w / 2, y + 112, 'ic_gem').setDisplaySize(sz, sz);
      txt(this, x + w / 2, y + 205, String(p.gems), 38, '#fff', { fontFamily: FONT_LATIN });
      txt(this, x + w / 2, y + 240, 'ডায়মন্ড', 20, '#7ae0ff');
      button(this, x + w / 2, y + 288, 168, 54, p.price, 'y', () => this.confirm(p), 26);
    });
    txt(this, W / 2, 640, 'প্যাক বেছে নিন → এডমিন WhatsApp-এ ডায়মন্ড যোগ করে দেবে', 18, '#ffffffaa');
  }
  confirm(p) {
    const d = store.get(), ADMIN = '8801945546218';
    const o = this.add.container(0, 0).setDepth(100);
    o.add(this.add.rectangle(W / 2, H / 2, 4000, 3000, 0x000a28, 0.7).setInteractive());
    o.add(this.add.image(W / 2, 360, panelTex(this, 700, 400, '#ffc61a', 28, ['#143387', '#06103f'])));
    o.add(txt(this, W / 2, 200, 'এডমিনের কাছ থেকে নিন', 36, '#ffd324'));
    o.add(txt(this, W / 2, 262, `${p.gems} ডায়মন্ড — ${p.price}`, 32, '#fff'));
    o.add(txt(this, W / 2, 312, 'এডমিনকে মেসেজ দিন, সে আপনার আইডিতে যোগ করে দেবে', 20, '#cfe'));
    o.add(txt(this, W / 2, 358, 'আপনার আইডি: ' + (d.playerId || '—'), 30, '#ffd324', { fontFamily: FONT_LATIN }));
    o.add(txt(this, W / 2, 400, '+' + ADMIN, 28, '#fff', { fontFamily: FONT_LATIN }));
    o.add(button(this, W / 2 - 160, 480, 290, 60, 'বন্ধ করুন', 'd', () => o.destroy(), 24));
    o.add(button(this, W / 2 + 160, 480, 290, 60, 'WhatsApp-এ মেসেজ', 'g', () => {
      const msg = `PEN FIGHT: আমার আইডি ${d.playerId || ''} — ${p.gems} ডায়মন্ড (${p.price}) চাই`;
      try { navigator.clipboard.writeText(String(d.playerId || '')); } catch (e) {}
      window.open('https://wa.me/' + ADMIN + '?text=' + encodeURIComponent(msg), '_blank');
    }, 22));
  }
}

// ---- Room: 2 to 5 players on one device (humans and/or AI) ----
let ROOM = null;
export class RoomSetup extends Phaser.Scene {
  constructor() { super('RoomSetup'); }
  create() {
    fitCamera(this);
    this.cameras.main.fadeIn(150);
    const d = store.get();
    if (!ROOM) ROOM = [{ name: d.name, ai: false, pen: d.pen }, { name: 'খেলোয়াড় ২', ai: false, pen: d.owned.find((id) => id !== d.pen) || d.pen }];
    this.build();
  }
  build() {
    this.children.removeAll(true);
    header(this, 'রুম তৈরি করুন', 'ic_users', () => fadeTo(this, 'Home'), '২ থেকে ৫ জন একসাথে খেলো — মানুষ বা AI');
    const d = store.get(), owned = PENS.filter((p) => d.owned.includes(p.id));
    const names = ['boy', 'rafid', 'girl', 'glasses', 'cap'], cols = ['#3a86ff', '#ff4a68', '#4ae070', '#b06aff', '#ffa63a'];
    for (let i = 0; i < 5; i++) {
      const y = 190 + i * 76, s = ROOM[i];
      if (!s) {
        if (i === ROOM.length) button(this, W / 2, y + 30, 460, 56, '+ খেলোয়াড় যোগ করুন', 'b', () => { ROOM.push({ name: 'খেলোয়াড় ' + (i + 1), ai: false, pen: owned[i % owned.length].id }); this.build(); }, 24);
        continue;
      }
      this.add.image(W / 2, y + 30, panelTex(this, 1040, 64, cols[i], 18, ['#10206a', '#08124a']));
      this.add.circle(170, y + 30, 14, parseInt(cols[i].slice(1), 16)).setStrokeStyle(3, 0xffffff);
      this.add.image(230, y + 30, 'av_' + names[i]).setDisplaySize(48, 48);
      const nt = txt(this, 275, y + 30, s.name, 26, '#fff', { fontFamily: FONT_LATIN }).setOrigin(0, 0.5);
      nt.setInteractive({ useHandCursor: true }).on('pointerup', () => askText('খেলোয়াড়ের নাম', s.name, (v) => { if (v && v.trim()) { s.name = v.trim().slice(0, 12); this.build(); } }));
      button(this, 640, y + 30, 150, 46, s.ai ? 'AI (কম্পিউটার)' : 'মানুষ', s.ai ? 'p' : 'g', () => { s.ai = !s.ai; if (s.ai && s.name.startsWith('খেলোয়াড়')) s.name = 'AI ' + (i + 1); this.build(); }, 17);
      const pi = Math.max(0, owned.findIndex((p) => p.id === s.pen));
      circleBtn(this, 790, y + 30, 22, 'ic_back', () => { s.pen = owned[(pi + owned.length - 1) % owned.length].id; this.build(); });
      this.add.image(900, y + 30, 'pen_' + s.pen).setScale(0.3).setRotation(-0.2);
      txt(this, 900, y + 52, penById(s.pen).name, 14, '#ffd324');
      circleBtn(this, 1010, y + 30, 22, 'ic_fwd', () => { s.pen = owned[(pi + 1) % owned.length].id; this.build(); });
      if (i >= 2) circleBtn(this, 1120, y + 30, 22, 'ic_x', () => { ROOM.splice(i, 1); this.build(); }, 'c');
    }
    button(this, W / 2, 640, 520, 70, `রুম শুরু করুন (${ROOM.length} জন)`, 'y', () => fadeTo(this, 'ArenaSelect', { mode: 'multi', players: ROOM.map((s, i) => ({ name: s.name, ai: s.ai, penId: s.pen, av: names[i] })) }), 32, 'ic_play');
  }
}

// ---- Online rooms: create a room (ID + password) or join with an ID. Needs server/room-server.js running on the PC. ----
const AV5 = ['boy', 'rafid', 'girl', 'glasses', 'cap'];
const ROOM_ERR = { no_room: 'এই আইডির কোনো রুম নেই', bad_pass: 'পাসওয়ার্ড ভুল', full: 'রুম ভরে গেছে', started: 'খেলা শুরু হয়ে গেছে', no_server: 'আগে সেটিংসে সার্ভার ঠিকানা দিন', offline: 'সংযোগ হয়নি — ইন্টারনেট/ওয়াইফাই দেখুন', rate_limited: 'অনেক বেশি চেষ্টা — একটু পরে', invalid: 'তথ্য ঠিক নেই', server_error: 'সার্ভারে সমস্যা', no_host: 'আগে হোস্টের আইপি দিন', no_lan: 'হোস্ট করতে অ্যান্ড্রয়েড অ্যাপ লাগবে', busy: 'হোস্ট এখন ব্যস্ত' };

// ---- Room hub: pick how to play with friends ----
export class RoomHub extends Phaser.Scene {
  constructor() { super('RoomHub'); }
  create() {
    fitCamera(this); this.cameras.main.fadeIn(150);
    header(this, 'রুমে খেলুন', 'ic_users', () => fadeTo(this, 'Home'), 'বন্ধুদের সাথে খেলার পদ্ধতি বেছে নিন');
    const card = (x, title, sub, ic, kind, mode) => {
      this.add.image(x, 400, panelTex(this, 460, 360, kind === 'y' ? '#ffc61a' : '#3a90ff', 30, kind === 'y' ? ['#4a3a10', '#1c1404'] : ['#143387', '#06103f']));
      this.add.image(x, 290, ic).setDisplaySize(120, 120);
      txt(this, x, 390, title, 40, kind === 'y' ? '#ffd324' : '#fff');
      this.add.text(x, 458, sub, { fontFamily: FONT, fontSize: '22px', color: '#dfe8ff', align: 'center' }).setOrigin(0.5);
      button(this, x, 540, 300, 62, 'খেলুন', kind, () => fadeTo(this, 'OnlineRoom', { mode }), 28, 'ic_play');
    };
    card(370, 'ইন্টারনেট', 'যেকোনো জায়গা থেকে\nআইডি ও পাসওয়ার্ড', 'ic_globe', 'b', 'internet');
    card(910, 'কাছাকাছি', 'ইন্টারনেট ছাড়া\nএক ওয়াইফাই/হটস্পটে', 'ic_users', 'y', 'nearby');
  }
}

export class OnlineRoom extends Phaser.Scene {
  constructor() { super('OnlineRoom'); }
  init(data) { this.mode = (data && data.mode) || 'internet'; this.hostIp = ''; this.scanTimer = null; this.found = []; this.scanning = false; this.view = 'menu'; this.f = { max: undefined, time: undefined, arena: store.get().arena, pass: '' }; this.j = { id: '', pass: '', ip: store.get().lastHost || '' }; this.room = null; this.busy = false; }
  create() {
    fitCamera(this);
    this.cameras.main.fadeIn(150);
    const off = [];
    off.push(NET.on('created', (m) => { if (m.ips && m.ips.length && !this.hostIp) this.hostIp = m.ips[0]; }));   // a PC host tells us its Wi-Fi/hotspot IP
    off.push(NET.on('lobby', (m) => { this.room = m; this.view = 'lobby'; this.busy = false; this.build(); }));
    off.push(NET.on('err', (m) => { this.busy = false;
      if (m.code === 'bad_pass' && this.view !== 'lobby') {   // the room has a password: ask for it and try again
        askText('এই রুমে পাসওয়ার্ড আছে', '', (v) => { if (v === null) return; this.j.pass = v.trim().slice(0, 12); this.busy = true; const d = store.get(); NET.send({ t: 'join', id: this.mode === 'nearby' ? '' : this.j.id, pass: this.j.pass, name: d.name, penId: d.pen, av: 'girl' }); }, { max: 12, hint: 'হোস্টের কাছ থেকে পাসওয়ার্ড জেনে নিন' });
        return;
      } toast(this, ROOM_ERR[m.code] || 'সমস্যা হয়েছে'); }));
    off.push(NET.on('closed', (m) => { if (this.starting) return; if (this.view === 'lobby') { toast(this, m.reason === 'host_left' ? 'হোস্ট রুম বন্ধ করে দিয়েছেন' : 'সংযোগ বিচ্ছিন্ন হয়েছে'); this.room = null; this.view = 'menu'; this.build(); } }));
    off.push(NET.on('start', (m) => {
      this.starting = true;
      const players = m.players.map((p, i) => ({ name: p.name, penId: p.penId, av: AV5[i % 5], ai: false }));
      fadeTo(this, 'Game', { mode: 'multi', online: { you: m.you, isHost: m.you === 0 }, players, arena: m.arena, time: m.time, level: m.level });
    }));
    this.events.once('shutdown', () => off.forEach((f) => f()));
    this.build();
  }
  async connect(host) {
    try { NET.setMode(this.mode, host || ''); await NET.connect(); return true; } catch (e) { toast(this, ROOM_ERR[e.code] || ROOM_ERR.offline); return false; }
  }
  build() {
    this.children.removeAll(true);
    const d = store.get();
    const back = this.view === 'menu' ? () => fadeTo(this, 'Home') : this.view === 'lobby' ? () => this.leave() : () => { this.view = 'menu'; this.build(); };
    header(this, this.view === 'lobby' ? 'রুম লবি' : (this.mode === 'nearby' ? 'কাছাকাছি খেলা' : 'অনলাইন রুম'), 'ic_users', back, this.view === 'menu' ? (this.mode === 'nearby' ? 'ইন্টারনেট ছাড়াই — এক ওয়াইফাই/হটস্পটে' : 'রুম বানান, বন্ধুরা আইডি দিয়ে ঢুকবে') : '');
    if (this.view === 'menu') return this.buildMenu();
    if (this.view === 'create') return this.buildCreate();
    if (this.view === 'join') return this.buildJoin();
    return this.buildLobby();
  }
  buildMenu() {
    const card = (x, title, sub, ic, kind, cb) => {
      this.add.image(x, 400, panelTex(this, 460, 330, kind === 'y' ? '#ffc61a' : '#3a90ff', 30, kind === 'y' ? ['#4a3a10', '#1c1404'] : ['#143387', '#06103f']));
      this.add.image(x, 300, ic).setDisplaySize(120, 120);
      txt(this, x, 395, title, 40, kind === 'y' ? '#ffd324' : '#fff');
      this.add.text(x, 450, sub, { fontFamily: FONT, fontSize: '21px', color: '#dfe8ff', align: 'center', wordWrap: { width: 400 } }).setOrigin(0.5);
      button(this, x, 520, 280, 62, title, kind, cb, 26);
    };
    const NB = this.mode === 'nearby';
    card(380, NB ? 'হোস্ট হোন' : 'রুম তৈরি করুন', NB ? 'আপনার ফোনই সার্ভার\nবন্ধুরা আইপি দিয়ে ঢুকবে' : '২–৫ জন, নিজের ফোনে\nআইডি ও পাসওয়ার্ড', 'ic_plus', 'y', () => { this.view = 'create'; this.build(); });
    card(900, 'যোগ দিন', NB ? 'হোস্টের আইপি দিন' : 'বন্ধুর রুম আইডি দিন', 'ic_exit', 'b', () => { this.view = 'join'; this.build(); });
    txt(this, W / 2, 650, NB ? 'দুই ফোন একই ওয়াইফাই বা একজনের হটস্পটে থাকলেই চলবে' : 'ইন্টারনেট লাগবে', 18, '#bfe0ff');
  }
  buildCreate() {
    const f = this.f;
    this.add.image(W / 2, 400, panelTex(this, 940, 470, '#3b92ff', 28, ['#143387', '#06103f']));
    txt(this, 230, 230, 'সর্বোচ্চ খেলোয়াড়:', 26).setOrigin(0, 0.5);
    [2, 3, 4, 5].forEach((n, i) => button(this, 640 + i * 130, 230, 116, 50, n + ' জন', f.max === n ? 'y' : 'd', () => { f.max = n; this.build(); }, 22));
    txt(this, 230, 305, 'ম্যাচের সময়:', 26).setOrigin(0, 0.5);
    [[60, '১ মিনিট'], [120, '২ মিনিট'], [180, '৩ মিনিট'], [300, '৫ মিনিট']].forEach(([s, l], i) => button(this, 640 + i * 130, 305, 120, 50, l, f.time === s ? 'y' : 'd', () => { f.time = s; this.build(); }, 20));
    txt(this, 230, 380, 'অ্যারিনা:', 26).setOrigin(0, 0.5);
    ARENAS.forEach((a, i) => button(this, 640 + i * 130, 380, 120, 50, a.name.replace(' অ্যারিনা', ''), f.arena === a.id ? 'y' : 'd', () => { f.arena = a.id; this.build(); }, 20));
    txt(this, 230, 455, 'পাসওয়ার্ড (ঐচ্ছিক):', 26).setOrigin(0, 0.5);
    button(this, 700, 455, 260, 50, f.pass ? '•'.repeat(f.pass.length) : 'নেই — চাপলে দাও', 'd', () => askText('রুমের পাসওয়ার্ড (খালি রাখলে পাসওয়ার্ড ছাড়াই ঢোকা যাবে)', f.pass, (v) => { if (v !== null) { f.pass = v.trim().slice(0, 12); this.build(); } }), 20);
    const ready = f.max && f.time;
    if (ready) button(this, W / 2, 570, 520, 70, 'রুম তৈরি করুন', 'y', () => this.create2(), 32, 'ic_plus');
    else button(this, W / 2, 570, 520, 70, 'আগে খেলোয়াড় সংখ্যা ও সময় বেছে নিন', 'd', () => toast(this, 'সংখ্যা ও সময় বেছে নিন'), 24);
  }
  async create2() {
    if (this.busy) return; this.busy = true;
    let host = '';
    if (this.mode === 'nearby') {
      if (lan.available()) {                       // phone app: the phone itself is the host
        try { this.hostIp = await lan.start(); } catch (e) { this.busy = false; return toast(this, 'হোস্ট চালু হয়নি'); }
        if (!this.hostIp) { this.busy = false; lan.stop(); return toast(this, 'আগে ওয়াইফাই/হটস্পট চালু করুন'); }
        host = '127.0.0.1';
      } else {                                      // PC: the room server (start-room-server.bat) runs on this PC; the PC can be the hotspot
        host = location.hostname || '127.0.0.1'; this.hostIp = (/^[d.]+$/.test(host) && host !== '127.0.0.1') ? host : '';
      }
    }
    if (!(await this.connect(host))) { this.busy = false; lan.stop(); if (this.mode === 'nearby' && !lan.available()) toast(this, 'PC-তে server\start-room-server.bat চালু করুন (কালো উইন্ডো খোলা থাকবে)'); return; }
    const d = store.get(), f = this.f;
    NET.send({ t: 'create', name: d.name, pass: f.pass, max: f.max, time: f.time, arena: f.arena, level: 1, penId: d.pen, av: 'boy' });
  }
  buildJoin() {
    if (this.mode === 'nearby') return this.buildNearbyJoin();
    const j = this.j;
    this.add.image(W / 2, 390, panelTex(this, 760, 360, '#3b92ff', 28, ['#143387', '#06103f']));
    txt(this, 330, 270, 'রুম আইডি:', 28).setOrigin(0, 0.5);
    const askId = (then) => askText('রুম আইডি', j.id, (v) => { if (v !== null) { j.id = v.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 5); this.build(); if (then && j.id.length === 5) then(); } }, { max: 8, upper: true, hint: 'হোস্টের লবিতে ৫ অক্ষরের যে আইডি দেখায়, যেমন K7M2Q' });
    button(this, 760, 270, 300, 60, j.id || 'আইডি লিখুন', j.id ? 'y' : 'd', () => askId(), 28);
    txt(this, 330, 360, 'রুমের পাসওয়ার্ড:', 26, '#fff', { maxW: 400 }).setOrigin(0, 0.5);
    button(this, 760, 360, 300, 60, j.pass ? '•'.repeat(j.pass.length) : 'থাকলে দিন (ঐচ্ছিক)', 'd', () => askText('রুমের পাসওয়ার্ড (রুমে পাসওয়ার্ড থাকলে তবেই দিন)', j.pass, (v) => { if (v !== null) { j.pass = v.trim().slice(0, 12); this.build(); } }), 22);
    const NBj = this.mode === 'nearby', okj = NBj ? j.ip.length >= 7 : j.id.length === 5;
    const go = async () => {
      if (this.busy) return; this.busy = true;
      if (!(await this.connect(NBj ? j.ip : ''))) { this.busy = false; return; }
      if (NBj) store.set({ lastHost: j.ip });
      const d = store.get(); NET.send({ t: 'join', id: NBj ? '' : j.id, pass: j.pass, name: d.name, penId: d.pen, av: 'girl' });
      this.time.delayedCall(9000, () => { if (this.busy && this.view !== 'lobby') { this.busy = false; toast(this, 'সাড়া পাওয়া যায়নি — আবার চেষ্টা করুন'); } });   // never stay stuck
    };
    button(this, W / 2, 480, 460, 70, 'যোগ দিন', okj ? 'g' : 'd', () => {
      if (!okj) { if (NBj) return toast(this, 'আগে হোস্টের আইপি দিন'); return askId(go); }
      go();
    }, 30, 'ic_exit');
  }
  // Nearby: rooms announced on this Wi-Fi / hotspot show up by themselves.
  buildNearbyJoin() {
    const j = this.j, found = this.found || [];
    this.add.image(W / 2, 410, panelTex(this, 900, 400, '#3b92ff', 28, ['#143387', '#06103f']));
    txt(this, W / 2, 245, this.scanning ? 'কাছাকাছি রুম খোঁজা হচ্ছে...' : (found.length ? 'পাওয়া রুম — চাপ দিয়ে ঢুকুন' : 'কোনো রুম পাওয়া যায়নি'), 26, '#ffd324');
    if (!lan.available()) txt(this, W / 2, 330, 'অটো খোঁজা শুধু অ্যাপে চলে — নিচে আইপি দিন', 22, '#bfe0ff');
    found.slice(0, 3).forEach((h, i) => {
      const y = 320 + i * 72;
      button(this, W / 2, y, 800, 62, (h.host || 'Host') + '  •  ' + h.n + '/' + h.max + ' জন' + (h.pass ? '  🔒' : ''), 'y', () => this.joinNearby(h.ip, h.pass), 26, 'ic_exit');
    });
    button(this, 440, 590, 330, 56, 'আবার খুঁজুন', 'b', () => this.scan(), 24);
    button(this, 840, 590, 330, 56, j.ip ? 'আইপি: ' + j.ip : 'আইপি দিয়ে ঢুকুন', 'd', () => askText('হোস্টের আইপি', j.ip, (v) => { if (v && v.trim().length >= 7) { j.ip = v.trim().slice(0, 40); this.joinNearby(j.ip, true); } }, { max: 40, hint: 'হোস্টের লবিতে যে আইপি দেখাবে' }), 22);
    if (!this.scanTimer) { this.scan(); this.scanTimer = this.time.addEvent({ delay: 3500, loop: true, callback: () => { if (this.view === 'join' && !this.busy) this.scan(true); } }); }
  }
  async scan(quiet) {
    if (this.scanning || !lan.available()) return;
    this.scanning = true; if (!quiet) this.build();
    let hosts = [];
    try { hosts = (await lan.discover(2200)).filter((h) => h.open && !h.started); } catch (e) {}
    this.scanning = false;
    const sig = (a) => a.map((h) => h.ip + h.n).join();
    const changed = sig(hosts) !== sig(this.found || []); this.found = hosts;
    if (this.view === 'join' && this.scene.isActive() && (changed || !quiet)) this.build();
  }
  joinNearby(ip, hasPass) {
    const go = async (pass) => {
      if (this.busy) return; this.busy = true;
      if (!(await this.connect(ip))) { this.busy = false; return; }
      store.set({ lastHost: ip });
      const d = store.get(); NET.send({ t: 'join', id: '', pass, name: d.name, penId: d.pen, av: 'girl' });
    };
    if (hasPass) askText('রুমের পাসওয়ার্ড', '', (v) => { if (v !== null) go(v.trim()); }, { max: 12, hint: 'না থাকলে খালি রেখে ঠিক আছে চাপুন' });
    else go('');
  }
  buildLobby() {
    const r = this.room, d = store.get(), me = r.you, isHost = me === 0;
    this.add.image(W / 2, 205, panelTex(this, 940, 96, '#ffc61a', 24, ['#2a2208', '#120d02']));
    const showIp = this.mode === 'nearby' && this.hostIp, code = showIp ? this.hostIp : r.id;
    txt(this, 330, 205, showIp ? 'আইপি' : 'রুম আইডি', 22, '#ffd324');
    txt(this, 560, 205, code, showIp ? 40 : 56, '#fff', { fontFamily: FONT_LATIN }).setLetterSpacing?.(6);
    txt(this, 880, 190, r.hasPass ? '🔒 পাসওয়ার্ড দেওয়া' : 'পাসওয়ার্ড নেই', 20, '#cfe');
    txt(this, 880, 222, `${r.players.length} / ${r.max} জন  •  ${Math.round(r.time / 60)} মিনিট`, 20, '#ffd324');
    button(this, 1075, 205, 120, 52, 'কপি', 'b', () => { try { navigator.clipboard.writeText(code); } catch (e) {} toast(this, 'কপি হয়েছে'); }, 20, 'ic_copy');
    for (let i = 0; i < r.max; i++) {
      const y = 300 + i * 64, p = r.players[i];
      this.add.image(W / 2, y, panelTex(this, 940, 54, p ? (i === me ? '#ffc61a' : '#3b92ff') : '#4a5a8a', 16, p ? ['#10206a', '#08124a'] : ['#141a30', '#0a0e1c']));
      if (!p) { txt(this, W / 2, y, 'খালি — অপেক্ষা করছে...', 20, '#8a98c0'); continue; }
      this.add.image(260, y, 'av_' + AV5[i % 5]).setDisplaySize(42, 42);
      txt(this, 300, y, p.name + (i === me ? ' (আপনি)' : ''), 24, '#fff', { fontFamily: FONT_LATIN }).setOrigin(0, 0.5);
      if (p.host) this.add.image(650, y, 'ic_crown').setDisplaySize(30, 30);
      this.add.image(820, y, 'pen_' + p.penId).setScale(0.22).setRotation(-0.2);
      txt(this, 940, y, penById(p.penId).name, 17, '#ffd324');
    }
    // my pen
    const owned = PENS.filter((q) => d.owned.includes(q.id)), idx = Math.max(0, owned.findIndex((q) => q.id === (r.players[me] && r.players[me].penId)));
    txt(this, 215, 640, 'আমার পেন:', 20).setOrigin(0, 0.5);
    circleBtn(this, 360, 640, 22, 'ic_back', () => NET.send({ t: 'setpen', penId: owned[(idx + owned.length - 1) % owned.length].id }));
    circleBtn(this, 415, 640, 22, 'ic_fwd', () => NET.send({ t: 'setpen', penId: owned[(idx + 1) % owned.length].id }));
    if (isHost) {
      if (r.players.length >= 2) button(this, 840, 640, 380, 66, 'খেলা শুরু করুন', 'y', () => NET.send({ t: 'start' }), 30, 'ic_play');
      else button(this, 840, 640, 380, 66, 'আরেকজনের জন্য অপেক্ষা...', 'd', () => toast(this, 'কমপক্ষে ২ জন লাগবে — আইডি/আইপি বন্ধুকে দিন'), 22);
    } else txt(this, 840, 640, 'হোস্ট শুরু করলে খেলা শুরু হবে...', 24, '#ffd324');
  }
  leave() { NET.leave(); this.room = null; this.view = 'menu'; this.build(); }
}
