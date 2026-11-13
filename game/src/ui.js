import Phaser from 'phaser';
import { W, H } from './assets.js';
import { FONT, FONT_LATIN, FONT_LOGO, buttonTex, panelTex, bannerTex, pillTex, orbTex, paperStripTex, btnTextColor } from './gfx.js';
import { store } from './store.js';
import { sfx } from './sfx.js';

export { FONT, FONT_LATIN, FONT_LOGO };

/** Text centred at x,y. extra.maxW = widest it may be (shrinks to fit the box instead of spilling out). */
export function txt(scene, x, y, s, size = 28, color = '#fff', extra = {}) {
  const { maxW, ...style } = extra;
  const t = scene.add.text(x, y, s, { fontFamily: FONT, fontSize: size + 'px', color, fontStyle: '800', padding: { top: 4, bottom: 6, left: 2, right: 2 }, ...style }).setOrigin(0.5);
  if (maxW && t.width > maxW) t.setScale(maxW / t.width);
  return t;
}
export const outlined = (t, c = '#0a1a52', n = 6) => t.setStroke(c, n).setShadow(0, 3, '#000', 4, true, true);

/** Glossy 3D button. icon = texture key (e.g. 'ic_play'). */
export function button(scene, x, y, w, h, label, kind, onClick, size = 30, icon) {
  const up = buttonTex(scene, w, h, kind, false), dn = buttonTex(scene, w, h, kind, true);
  const img = scene.add.image(0, 0, up);
  const kids = [img];
  const col = btnTextColor(kind);
  const t = scene.add.text(0, -2, label, { fontFamily: FONT, fontSize: size + 'px', color: col, fontStyle: '800' }).setOrigin(0.5);
  if (kind === 'y') t.setShadow(0, 1, 'rgba(255,255,255,.6)', 0);
  else t.setShadow(0, 2, 'rgba(0,0,0,.55)', 2);
  if (icon) {
    const ic = scene.add.image(0, -2, icon).setDisplaySize(size * 1.15, size * 1.15);
    if (kind === 'y') ic.setTint(0x3a1d00);
    const tw = t.width + ic.displayWidth + 12;
    ic.x = -tw / 2 + ic.displayWidth / 2; t.x = ic.x + ic.displayWidth / 2 + 12 + t.width / 2; kids.push(ic);
  }
  kids.push(t);
  const c = scene.add.container(x, y, kids).setSize(w, h);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => { img.setTexture(dn); kids.slice(1).forEach((k) => (k.y += 3)); c.pressed = true; });
  const rel = () => { if (!c.pressed) return; c.pressed = false; img.setTexture(up); kids.slice(1).forEach((k) => (k.y -= 3)); };
  c.on('pointerout', rel);
  c.on('pointerup', () => { const was = c.pressed; rel(); if (was) { sfx.click(); onClick && onClick(); } });
  c.label = t; c.setLabel = (s) => t.setText(s);
  return c;
}

export function panel(scene, x, y, w, h, o = {}) {
  const key = panelTex(scene, w, h, o.border ? '#' + o.border.toString(16).padStart(6, '0') : '#3b92ff', o.radius ?? 26, o.fill);
  return scene.add.image(x + w / 2, y + h / 2, key).setAlpha(o.alpha ?? 1);
}

export function banner(scene, x, y, w, h, title, icon, size = 46) {
  const c = scene.add.container(x, y);
  c.add(scene.add.image(0, 0, bannerTex(scene, w, h)));
  const t = scene.add.text(icon ? 28 : 0, 0, title, { fontFamily: FONT, fontSize: size + 'px', color: '#ffd324', fontStyle: '800', stroke: '#5a3300', strokeThickness: 5 }).setOrigin(0.5).setShadow(0, 4, '#000', 4, true, true);
  c.add(t);
  if (icon) { const ic = scene.add.image(-t.width / 2 + 0, 0, icon).setDisplaySize(size, size); ic.x = t.x - t.width / 2 - size * 0.7; c.add(ic); }
  return c;
}

export function circleBtn(scene, x, y, r, icon, onClick, kind = 'd') {
  const img = scene.add.image(0, 0, orbTex(scene, r, kind));
  const ic = typeof icon === 'string' && icon.startsWith('ic_') ? scene.add.image(0, -1, icon).setDisplaySize(r * 1.05, r * 1.05) : scene.add.text(0, -2, icon, { fontFamily: FONT_LATIN, fontSize: r * 1.1 + 'px', color: '#fff', fontStyle: '800' }).setOrigin(0.5);
  const c = scene.add.container(x, y, [img, ic]).setSize(r * 2, r * 2).setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => c.setScale(0.93)); c.on('pointerout', () => c.setScale(1));
  c.on('pointerup', () => { c.setScale(1); sfx.click(); onClick && onClick(); });
  return c;
}

/** Full campus scene with optional dark tint (all code-drawn). */
/** Scale the 1280x720 design area to fit the screen, centred. Anything outside it is just extra background. */
export function fitCamera(scene) {
  const c = scene.cameras.main;
  const apply = () => { const z = Math.min(scene.scale.width / W, scene.scale.height / H); c.setZoom(z); c.centerOn(W / 2, H / 2); };
  apply();
  scene.scale.on('resize', apply);
  scene.events.once('shutdown', () => scene.scale.off('resize', apply));
}

/** A background image that always covers the WHOLE screen (no black bars). */
export function coverBg(scene, key) {
  const im = scene.add.image(W / 2, H / 2, key).setDepth(-100);
  const fit = () => { const c = scene.cameras.main, vw = c.width / c.zoom, vh = c.height / c.zoom; im.setScale(Math.max(vw / im.width, vh / im.height)); };
  fit();
  scene.scale.on('resize', fit);
  scene.events.once('shutdown', () => scene.scale.off('resize', fit));
  return im;
}

export function campusBg(scene, dim = 0) {
  coverBg(scene, 'campus');
  if (dim) scene.add.rectangle(W / 2, H / 2, 4000, 3000, 0x04103c, dim).setDepth(-99);
}

export function logoImg(scene, x, y, scale = 1) {
  const im = scene.add.image(0, 0, 'logo');
  im.setScale((760 * scale) / im.width);
  return scene.add.container(x, y, [im]);
}

/** Cut-out character standing on a baseline (origin bottom-centre). */
export function heroImg(scene, x, bottom, h, key = 'hero') {
  const im = scene.add.image(x, bottom, key).setOrigin(0.5, 1);
  im.setScale(h / im.height);
  return im;
}

export function deskProps(scene, opt = {}) {
  const items = [];
  if (opt.books !== false) items.push(scene.add.image(opt.bx ?? 110, opt.by ?? 590, 'books').setScale(opt.bs ?? 0.8));
  if (opt.paper !== false) items.push(scene.add.image(opt.px ?? 1190, opt.py ?? 620, 'crumple').setScale(opt.ps ?? 0.8).setAngle(10));
  return items;
}

export function currency(scene, y = 14, withHome) {
  const d = store.get(), refs = {};
  const pill = (x, w, ic, val, key) => {
    scene.add.image(x + w / 2, y + 29, pillTex(scene, w, 54));
    scene.add.image(x + 30, y + 29, ic).setDisplaySize(38, 38);
    refs[key] = scene.add.text(x + w / 2 + 8, y + 29, val, { fontFamily: FONT_LATIN, fontSize: '26px', color: '#fff', fontStyle: '700' }).setOrigin(0.5);
    scene.add.image(x + w - 26, y + 29, orbTex(scene, 20, 'y'));
    scene.add.image(x + w - 26, y + 28, 'ic_plus').setDisplaySize(20, 20).setTint(0x3a2200);
    const z = scene.add.zone(x + w / 2, y + 29, w, 54).setInteractive({ useHandCursor: true });
    z.on('pointerup', () => { sfx.click(); scene.scene.start('Shop'); });
  };
  pill(W - 480, 186, 'ic_coin', String(d.coins), 'coin');
  pill(W - 286, 176, 'ic_gem', String(d.gems ?? 0), 'gem');
  if (withHome) circleBtn(scene, W - 50, y + 30, 32, 'ic_home', withHome);
  window.__cur = refs;   // so api.refresh() can update the numbers live
  return refs;
}

export function header(scene, title, icon, back, sub) {
  campusBg(scene, 0.35);
  scene.add.image(0, 0, 'dot').setAlpha(0);
  if (back) circleBtn(scene, 52, 52, 34, 'ic_back', back);
  logoImg(scene, 190, 62, 0.26);
  banner(scene, W / 2 - 40, 52, 540, 76, title, icon, 44);
  if (sub) { const t = txt(scene, W / 2 - 40, 112, sub, 22, '#fff'); t.setShadow(0, 2, '#000', 4, true, true); }
  currency(scene, 18, () => scene.scene.start('Home'));
}

export function toast(scene, msg) {
  // long messages wrap inside the screen and stay a little longer
  const t = scene.add.text(W / 2, H - 70, msg, { fontFamily: FONT, fontSize: '28px', color: '#fff', fontStyle: '700', backgroundColor: '#0b1538', padding: { x: 22, y: 12 }, wordWrap: { width: 1000 }, align: 'center' }).setOrigin(0.5).setDepth(999);
  scene.tweens.add({ targets: t, y: H - 110, alpha: 0, delay: 900 + Math.min(3500, String(msg).length * 40), duration: 500, onComplete: () => t.destroy() });
}

export function fadeTo(scene, key, data) {
  scene.cameras.main.fadeOut(180, 5, 10, 30);
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
}

export function statBar(scene, x, y, w, v, h = 18) {
  const g = scene.add.graphics();
  const segs = 5, gap = 4, sw = (w - gap * (segs - 1)) / segs;
  for (let i = 0; i < segs; i++) {
    const f = Math.max(0, Math.min(1, v * segs - i));
    g.fillStyle(0x0a1030, 1).fillRoundedRect(x + i * (sw + gap), y, sw, h, 4);
    if (f > 0) g.fillStyle(0xffc61a, 1).fillRoundedRect(x + i * (sw + gap) + 1, y + 1, (sw - 2) * f, h - 2, 3).fillStyle(0xffffff, 0.45).fillRoundedRect(x + i * (sw + gap) + 2, y + 2, (sw - 4) * f, 4, 2);
  }
  return g;
}

export const RARITY = { Epic: 'p', Rare: 'b', Common: 'd', Legendary: 'y' };
export function tag(scene, x, y, label, rarity) {
  const kind = RARITY[rarity] || 'd', w = Math.max(96, label.length * 12 + 34);
  const i = scene.add.image(x, y, buttonTex(scene, w, 30, kind, false)).setScale(0.9);
  const t = scene.add.text(x, y - 2, label, { fontFamily: FONT_LATIN, fontSize: '18px', color: kind === 'y' ? '#2a1500' : '#fff', fontStyle: '700' }).setOrigin(0.5);
  return [i, t];
}

/** In-game text box (replaces the browser's "localhost says" popup). cb(value) on OK, cb(null) on cancel. */
export function askText(title, initial, cb, opts = {}) {
  const old = document.getElementById('askBox'); if (old) old.remove();
  const wrap = document.createElement('div'); wrap.id = 'askBox';
  wrap.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(3,10,30,.72);display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif';
  const box = document.createElement('div');
  box.style.cssText = 'width:min(480px,90vw);background:linear-gradient(#1c3a86,#0e1f52);border:3px solid #ffb300;border-radius:18px;padding:18px;box-shadow:0 10px 40px #000a;color:#fff';
  const h = document.createElement('div'); h.textContent = title; h.style.cssText = 'font-size:20px;font-weight:700;margin-bottom:6px';
  box.appendChild(h);
  if (opts.hint) { const s = document.createElement('div'); s.textContent = opts.hint; s.style.cssText = 'font-size:14px;opacity:.8;margin-bottom:8px'; box.appendChild(s); }
  const inp = document.createElement('input'); inp.value = initial || ''; inp.maxLength = opts.max || 60; inp.autocapitalize = opts.upper ? 'characters' : 'off'; inp.autocomplete = 'off'; if (opts.password) inp.type = 'password'; inp.spellcheck = false;
  inp.style.cssText = 'width:100%;box-sizing:border-box;font-size:22px;padding:12px;border-radius:12px;border:2px solid #5b7fd6;background:#0a1740;color:#fff;outline:none';
  if (opts.email) { inp.type = 'email'; inp.inputMode = 'email'; }   // phone shows the @ keyboard
  box.appendChild(inp);
  const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:10px;margin-top:14px;justify-content:flex-end';
  const mk = (t, bg, fg) => { const b = document.createElement('button'); b.textContent = t; b.style.cssText = `font-size:18px;font-weight:700;padding:10px 22px;border:0;border-radius:12px;background:${bg};color:${fg};cursor:pointer`; return b; };
  const no = mk('বাতিল', '#33477f', '#fff'), ok = mk('ঠিক আছে', '#ffb300', '#2a1a00');
  row.append(no, ok); box.appendChild(row); wrap.appendChild(box); document.body.appendChild(wrap);
  const done = (v) => { wrap.remove(); cb(v); };
  ok.onclick = () => done(inp.value); no.onclick = () => done(null);
  inp.onkeydown = (e) => { if (e.key === 'Enter') done(inp.value); else if (e.key === 'Escape') done(null); };
  wrap.onpointerdown = (e) => { if (e.target === wrap) done(null); };
  setTimeout(() => { inp.focus(); inp.select(); }, 50);
}
