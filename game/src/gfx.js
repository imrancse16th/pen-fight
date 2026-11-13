// Glossy "3D" cartoon UI pieces drawn on canvas and cached as Phaser textures.
export const FONT = "'Baloo Da 2','Hind Siliguri','Nirmala UI',sans-serif";
export const FONT_LATIN = "'Poppins','Hind Siliguri',sans-serif";
export const FONT_LOGO = "'Lilita One',Impact,sans-serif";

export function rr(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
export const lg = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };

function cached(scene, key, w, h, draw) {
  if (!scene.textures.exists(key)) {
    const t = scene.textures.createCanvas(key, Math.ceil(w), Math.ceil(h));
    draw(t.getContext(), Math.ceil(w), Math.ceil(h)); t.refresh();
  }
  return key;
}

const BTN = {
  y: ['#fff27a', '#ffc61a', '#f09a00', '#a8620a', '#2a1500'],
  d: ['#5a6584', '#2b3350', '#141a30', '#05070f', '#ffffff'],
  g: ['#7cf08e', '#1fae3c', '#0d7a26', '#064f14', '#ffffff'],
  r: ['#ff8a92', '#e0202e', '#a30d1a', '#5a0610', '#ffffff'],
  b: ['#7ccaff', '#1b79f0', '#0b4fc0', '#062a80', '#ffffff'],
  p: ['#c28aff', '#7a35e6', '#4a17b0', '#2a0a70', '#ffffff'],
};
export const btnTextColor = (k) => BTN[k][4];

/** Glossy pill/rounded button texture. pressed=true gives the pushed-in look. */
export function buttonTex(scene, w, h, kind, pressed, radius) {
  const r = radius ?? h / 2, key = `btn_${w}x${h}_${kind}_${pressed ? 1 : 0}_${r}`;
  return cached(scene, key, w + 16, h + 22, (c) => {
    const [hi, mid, lo, sh] = BTN[kind], ox = 8, oy = pressed ? 8 : 4, drop = pressed ? 3 : 8;
    c.save(); c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 12; c.shadowOffsetY = 8;
    c.fillStyle = sh; rr(c, ox, oy + drop, w, h, r); c.fill(); c.restore();
    c.fillStyle = lg(c, 0, oy, 0, oy + h, [[0, hi], [0.5, mid], [1, lo]]); rr(c, ox, oy + (pressed ? 3 : 0), w, h, r); c.fill();
    c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.5)'; rr(c, ox + 1, oy + 1 + (pressed ? 3 : 0), w - 2, h - 2, r); c.stroke();
    c.fillStyle = lg(c, 0, oy, 0, oy + h * 0.5, [[0, 'rgba(255,255,255,.85)'], [1, 'rgba(255,255,255,.04)']]);
    rr(c, ox + h * 0.28, oy + 4 + (pressed ? 3 : 0), w - h * 0.56, h * 0.42, h * 0.2); c.fill();
  });
}

/** Navy glass panel with glowing border (the main look of the reference UI). */
export function panelTex(scene, w, h, border = '#3b92ff', radius = 26, fill = ['#14327f', '#071247']) {
  const key = `panel_${w}x${h}_${border}_${radius}_${fill[0]}`;
  return cached(scene, key, w + 60, h + 60, (c) => {
    const o = 30;
    c.save(); c.shadowColor = border; c.shadowBlur = 24; c.fillStyle = border; rr(c, o, o, w, h, radius); c.fill(); c.restore();
    c.fillStyle = lg(c, 0, o, 0, o + h, [[0, fill[0]], [1, fill[1]]]); rr(c, o + 3, o + 3, w - 6, h - 6, radius - 2); c.fill();
    c.save(); rr(c, o + 3, o + 3, w - 6, h - 6, radius - 2); c.clip();
    c.fillStyle = lg(c, 0, o, 0, o + h * 0.45, [[0, 'rgba(120,180,255,.28)'], [1, 'rgba(120,180,255,0)']]); c.fillRect(o, o, w, h * 0.45);
    const v = c.createRadialGradient(o + w / 2, o + h / 2, Math.min(w, h) * 0.3, o + w / 2, o + h / 2, Math.max(w, h) * 0.75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,20,.45)'); c.fillStyle = v; c.fillRect(o, o, w, h);
    c.restore();
    c.lineWidth = 3; c.strokeStyle = border; rr(c, o + 1.5, o + 1.5, w - 3, h - 3, radius - 1); c.stroke();
    c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,255,255,.35)'; rr(c, o + 6, o + 6, w - 12, h - 12, radius - 5); c.stroke();
  });
}

/** Title banner: navy slanted bar with gold edge. */
export function bannerTex(scene, w, h) {
  return cached(scene, `banner_${w}x${h}`, w + 40, h + 40, (c) => {
    const o = 20, k = h * 0.28;
    const path = (i) => { c.beginPath(); c.moveTo(o + k + i, o + i); c.lineTo(o + w - i, o + i); c.lineTo(o + w - k - i, o + h - i); c.lineTo(o + i, o + h - i); c.closePath(); };
    c.save(); c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 14; c.shadowOffsetY = 8; path(0); c.fillStyle = '#f1a800'; c.fill(); c.restore();
    path(0); c.fillStyle = lg(c, 0, o, 0, o + h, [[0, '#ffe66a'], [1, '#e89a00']]); c.fill();
    path(5); c.fillStyle = lg(c, 0, o, 0, o + h, [[0, '#1d3d9a'], [0.5, '#0e2160'], [1, '#050f3a']]); c.fill();
    c.save(); path(5); c.clip(); c.fillStyle = 'rgba(160,200,255,.22)'; c.fillRect(o, o, w, h * 0.4); c.restore();
  });
}

export function pillTex(scene, w, h) {
  return cached(scene, `pill_${w}x${h}`, w + 24, h + 24, (c) => {
    c.save(); c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 10; c.shadowOffsetY = 5; c.fillStyle = '#10152c'; rr(c, 12, 10, w, h, h / 2); c.fill(); c.restore();
    c.fillStyle = lg(c, 0, 10, 0, 10 + h, [[0, '#343d5e'], [1, '#0b1026']]); rr(c, 12, 10, w, h, h / 2); c.fill();
    c.lineWidth = 2; c.strokeStyle = 'rgba(190,210,255,.55)'; rr(c, 13, 11, w - 2, h - 2, h / 2); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.12)'; rr(c, 18, 13, w - 12, h * 0.4, h * 0.2); c.fill();
  });
}

export function orbTex(scene, r, kind = 'd') {
  return cached(scene, `orb_${r}_${kind}`, r * 2 + 30, r * 2 + 30, (c) => {
    const cx = r + 15, cy = r + 15, cols = kind === 'y' ? ['#fff27a', '#f0a000', '#8a5000'] : kind === 'c' ? ['#5a7cc8', '#10205a', '#050a28'] : ['#6a7599', '#232b44', '#0a0d1c'];
    c.save(); c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 10; c.shadowOffsetY = 6; c.fillStyle = '#000'; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill(); c.restore();
    const g = c.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r); g.addColorStop(0, cols[0]); g.addColorStop(0.6, cols[1]); g.addColorStop(1, cols[2]);
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
    c.lineWidth = 3; c.strokeStyle = kind === 'c' ? '#3ad0ff' : 'rgba(200,215,255,.7)'; if (kind === 'c') { c.shadowColor = '#3ad0ff'; c.shadowBlur = 14; } c.beginPath(); c.arc(cx, cy, r - 1.5, 0, 7); c.stroke();
    c.shadowBlur = 0; c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.ellipse(cx - r * 0.1, cy - r * 0.5, r * 0.6, r * 0.28, 0, 0, 7); c.fill();
  });
}

export function paperStripTex(scene, w, h) {
  return cached(scene, `strip_${w}x${h}`, w + 20, h + 20, (c) => {
    c.save(); c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 10; c.shadowOffsetY = 6;
    c.beginPath(); c.moveTo(12, 16); c.lineTo(w * 0.4, 12); c.lineTo(w * 0.7, 18); c.lineTo(w + 6, 14); c.lineTo(w + 2, h * 0.55); c.lineTo(w + 8, h + 6); c.lineTo(w * 0.6, h + 10); c.lineTo(w * 0.3, h + 4); c.lineTo(10, h + 8); c.lineTo(14, h * 0.5); c.closePath();
    c.fillStyle = lg(c, 0, 10, 0, h + 10, [[0, '#f6e6b4'], [1, '#e6cb8e']]); c.fill(); c.restore();
  });
}

export function booksTex(scene) {
  return cached(scene, 'books', 340, 280, (c) => {
    const books = [['পদার্থবিজ্ঞান', '#3a3f86', '#1d2150', 8, 270], ['গণিত', '#b0414d', '#6a1c2a', 98, 290], ['রসায়ন', '#2f8268', '#175443', 188, 286]];
    books.forEach(([t, a, b, y, w], i) => {
      const x = 14 + (i === 1 ? 12 : 0);
      c.save(); c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 14; c.shadowOffsetY = 8; c.fillStyle = b; rr(c, x, y, w, 84, 10); c.fill(); c.restore();
      c.fillStyle = lg(c, 0, y, 0, y + 84, [[0, a], [1, b]]); rr(c, x, y, w, 84, 10); c.fill();
      c.fillStyle = 'rgba(255,255,255,.2)'; rr(c, x + 6, y + 4, w - 12, 12, 6); c.fill();
      c.fillStyle = '#e2b858'; c.fillRect(x + 22, y + 10, 6, 64); c.fillRect(x + w - 30, y + 10, 6, 64);
      c.fillStyle = '#f6dc8e'; c.font = `800 32px ${FONT}`; c.textAlign = 'center'; c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 3; c.fillText(t, x + w / 2, y + 54); c.shadowBlur = 0;
    });
  });
}

export function crumpleTex(scene) {
  return cached(scene, 'crumple', 160, 150, (c) => {
    c.save(); c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 10; c.shadowOffsetY = 8;
    const P = [[14, 76], [44, 22], [96, 8], [142, 44], [150, 98], [106, 138], [44, 134]];
    c.fillStyle = '#e9e4f4'; c.beginPath(); P.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); c.restore();
    const tri = (a, b, d, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.lineTo(...d); c.closePath(); c.fill(); };
    const m = [78, 68]; const cols = ['#ffffff', '#cfc6ea', '#f4f0ff', '#bdb0e0', '#ddd5f2', '#b5a8dc', '#efeaff'];
    P.forEach((p, i) => tri(p, P[(i + 1) % P.length], m, cols[i % cols.length]));
  });
}

export function mugTex(scene) {
  return cached(scene, 'mug', 220, 220, (c) => {
    c.save(); c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 14; c.shadowOffsetY = 10;
    c.strokeStyle = '#d8d8e2'; c.lineWidth = 20; c.beginPath(); c.arc(168, 104, 34, -1.4, 1.5); c.stroke();
    c.fillStyle = lg(c, 20, 0, 160, 0, [[0, '#c2c2cf'], [0.4, '#ffffff'], [1, '#b8b8c8']]); rr(c, 20, 24, 140, 160, 18); c.fill(); c.restore();
    c.fillStyle = '#1a3a9a'; c.font = `800 42px ${FONT_LATIN}`; c.textAlign = 'center'; c.fillText('KYAU', 90, 94); c.fillText('CSE', 90, 140);
    c.fillStyle = 'rgba(255,255,255,.5)'; rr(c, 30, 30, 18, 140, 8); c.fill();
  });
}
