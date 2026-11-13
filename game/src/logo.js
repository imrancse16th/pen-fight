// PEN FIGHT logo — drawn with code to match the brand artwork (3D extruded letters, glossy crossed pens, ribbon, chalk doodles).
import { rr, lg, FONT_LOGO, FONT_LATIN } from './gfx.js';
import { pen as penSVG } from './svgkit.js';

function glossyPen(c, x, y, len, rot, p) {
  // cylindrical pen with metal tip, grip, clip — tip points to +x
  c.save(); c.translate(x, y); c.rotate(rot);
  const h = 34;
  const body = lg(c, 0, -h / 2, 0, h / 2, [[0, p[0]], [0.35, p[1]], [1, p[2]]]);
  const metal = lg(c, 0, -h / 2, 0, h / 2, [[0, '#ffffff'], [0.5, '#b8c0d2'], [1, '#5d6579']]);
  c.lineJoin = 'round'; c.lineWidth = 4; c.strokeStyle = '#0b1538';
  c.fillStyle = body; rr(c, -len / 2, -h / 2, len * 0.78, h, 12); c.fill(); c.stroke();
  c.fillStyle = metal; c.beginPath(); c.moveTo(len / 2 - 6, -12); c.lineTo(len / 2 + 44, 0); c.lineTo(len / 2 - 6, 12); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.55)'; rr(c, -len / 2 + 10, -h / 2 + 5, len * 0.7, 6, 3); c.fill();
  c.fillStyle = metal; rr(c, -len / 2 + 30, -h / 2 - 8, len * 0.45, 9, 4); c.fill(); c.stroke();
  c.restore();
}

function word(c, txt, x, y, size, grad, depth, outline) {
  c.save();
  c.font = `${size}px ${FONT_LOGO}`; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.lineJoin = 'round';
  c.transform(1, 0, -0.2, 1, 0, 0);          // italic slant
  const sx = x + y * 0.2;                     // keep x position after skew
  // 3D extrusion
  for (let i = depth; i > 0; i--) { c.fillStyle = i > depth * 0.5 ? '#050c2a' : '#0b1a52'; c.strokeStyle = c.fillStyle; c.lineWidth = outline + 10; c.strokeText(txt, sx, y + i); c.fillText(txt, sx, y + i); }
  // white inner outline ring, navy outer outline
  c.lineWidth = outline + 14; c.strokeStyle = '#0b1538'; c.strokeText(txt, sx, y);
  c.lineWidth = outline + 6; c.strokeStyle = '#ffffff'; c.strokeText(txt, sx, y);
  c.lineWidth = outline; c.strokeStyle = '#13214f'; c.strokeText(txt, sx, y);
  // gradient face
  const m = c.measureText(txt);
  c.fillStyle = lg(c, 0, y - size * 0.8, 0, y, grad); c.fillText(txt, sx, y);
  // gloss: clip to glyphs and lay a highlight on the top half
  c.globalCompositeOperation = 'source-atop';
  c.restore();
}

/** Returns canvas texture key 'logo' (760x560). */
export function makeLogo(scene) {
  if (scene.textures.exists('logo')) return 'logo';
  const W = 760, H = 560;
  const t = scene.textures.createCanvas('logo', W, H), c = t.getContext();
  c.clearRect(0, 0, W, H);
  // chalk doodles
  c.strokeStyle = 'rgba(255,255,255,.92)'; c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(300, 40); c.lineTo(310, 8); c.lineTo(345, 30); c.lineTo(380, 8); c.lineTo(392, 40); c.closePath(); c.stroke(); // crown
  c.beginPath(); c.moveTo(300, 46); c.lineTo(392, 46); c.stroke();
  [[60, 260], [700, 250], [660, 420], [90, 120]].forEach(([x, y], i) => { c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? 6 : 14; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); c.stroke(); });
  c.beginPath(); c.moveTo(40, 230); c.lineTo(110, 215); c.moveTo(34, 262); c.lineTo(90, 270); c.moveTo(650, 120); c.lineTo(700, 100); c.stroke(); // splash marks
  // crossed pens (behind text), tips point down-centre
  glossyPen(c, 385, 250, 600, 1.012, ['#7aa6ff', '#1f4be0', '#0c1f80']);
  glossyPen(c, 385, 250, 600, 2.13, ['#ff8a8a', '#e0202e', '#7a0a14']);
  // PEN
  const sizeBig = 230;
  word(c, 'PEN', 400, 258, sizeBig, [[0, '#ffe45a'], [0.45, '#ffb21a'], [1, '#ff7a00']], 14, 10);
  // gloss on PEN
  c.save();
  // FiGHT
  word(c, 'FiGHT', 400, 452, 200, [[0, '#ffffff'], [0.6, '#f2f6ff'], [1, '#b9cbf0']], 14, 10);
  c.restore();
  // ribbon
  c.save(); c.translate(430, 505); c.rotate(-0.05);
  c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 10; c.shadowOffsetY = 6;
  c.fillStyle = lg(c, 0, -34, 0, 34, [[0, '#ffe36a'], [1, '#f0a800']]);
  c.beginPath(); c.moveTo(-300, -30); c.lineTo(300, -36); c.lineTo(290, -8); c.lineTo(302, 32); c.lineTo(-300, 38); c.lineTo(-290, 4); c.closePath(); c.fill(); c.shadowBlur = 0;
  c.strokeStyle = '#b87a00'; c.lineWidth = 2; c.stroke();
  c.fillStyle = '#16161a'; c.font = `800 42px ${FONT_LATIN}`; c.textAlign = 'center'; c.fillText('KYAU UNIVERSITY', 0, 14);
  c.restore();
  t.refresh();
  return 'logo';
}
