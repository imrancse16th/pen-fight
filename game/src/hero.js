// Shaded cartoon hero (curly hair, headphones, KYAU shirt, crossed arms) drawn on canvas — 520x830.
import { rr, lg } from './gfx.js';

function capsule(c, ax, ay, bx, by, w, fill, stroke = '#6a3a1c') {
  const a = Math.atan2(by - ay, bx - ax), len = Math.hypot(bx - ax, by - ay);
  c.save(); c.translate(ax, ay); c.rotate(a);
  c.fillStyle = fill; c.strokeStyle = stroke; c.lineWidth = 3;
  rr(c, -w / 2, -w / 2, len + w, w, w / 2); c.fill(); c.stroke();
  c.restore();
}

export function heroTex(scene) {
  if (scene.textures.exists('hero')) return;
  const t = scene.textures.createCanvas('hero', 520, 830), c = t.getContext();
  const skin = (x0, y0, x1, y1) => lg(c, x0, y0, x1, y1, [[0, '#f0b88a'], [0.55, '#dc9a68'], [1, '#b8714a']]);
  c.lineJoin = 'round'; c.lineCap = 'round';

  // ---- backpack behind shoulders
  c.fillStyle = lg(c, 0, 330, 0, 830, [[0, '#2a3552'], [1, '#10182c']]);
  rr(c, 30, 330, 460, 500, 90); c.fill();
  c.fillStyle = 'rgba(255,255,255,.08)'; rr(c, 44, 346, 432, 60, 40); c.fill();

  // ---- headphone band (behind neck)
  c.strokeStyle = '#1b2033'; c.lineWidth = 18; c.beginPath(); c.moveTo(150, 410); c.quadraticCurveTo(260, 290, 370, 410); c.stroke();

  // ---- torso / shirt
  const shirt = lg(c, 60, 0, 460, 0, [[0, '#cfd3ea'], [0.35, '#ffffff'], [0.7, '#f4f5ff'], [1, '#b9bddc']]);
  c.fillStyle = shirt; c.strokeStyle = '#8f93b8'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(130, 352); c.quadraticCurveTo(260, 392, 390, 352); c.quadraticCurveTo(470, 380, 468, 470); c.quadraticCurveTo(476, 640, 462, 830); c.lineTo(58, 830); c.quadraticCurveTo(44, 640, 52, 470); c.quadraticCurveTo(50, 380, 130, 352); c.closePath(); c.fill(); c.stroke();
  // folds
  c.strokeStyle = 'rgba(120,125,170,.35)'; c.lineWidth = 4;
  [[210, 470, 190, 600], [320, 470, 345, 610], [120, 520, 105, 700], [410, 520, 425, 700], [260, 640, 262, 800]].forEach(([a, b, d, e]) => { c.beginPath(); c.moveTo(a, b); c.quadraticCurveTo((a + d) / 2 + 12, (b + e) / 2, d, e); c.stroke(); });

  // ---- backpack straps
  const strap = lg(c, 0, 0, 60, 0, [[0, '#2a3552'], [1, '#141b30']]);
  [[true], [false]].forEach(([left]) => {
    c.save(); if (!left) { c.translate(520, 0); c.scale(-1, 1); }
    c.fillStyle = strap; c.strokeStyle = '#0a0f20'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(118, 356); c.lineTo(178, 372); c.quadraticCurveTo(160, 560, 150, 830); c.lineTo(76, 830); c.quadraticCurveTo(86, 560, 118, 356); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.18)'; c.setLineDash([8, 7]); c.lineWidth = 2; c.beginPath(); c.moveTo(130, 380); c.quadraticCurveTo(112, 580, 110, 800); c.stroke(); c.setLineDash([]);
    c.restore();
  });

  // ---- neck + V collar
  c.fillStyle = skin(0, 300, 0, 400); c.strokeStyle = '#7a4424'; c.lineWidth = 3;
  rr(c, 218, 290, 84, 80, 22); c.fill();
  c.beginPath(); c.moveTo(212, 340); c.lineTo(308, 340); c.lineTo(260, 428); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#fff'; c.strokeStyle = '#a0a4c8';
  c.beginPath(); c.moveTo(196, 338); c.lineTo(262, 436); c.lineTo(236, 340); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(324, 338); c.lineTo(258, 436); c.lineTo(284, 340); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = 'rgba(80,30,10,.25)'; c.beginPath(); c.ellipse(260, 318, 54, 20, 0, 0, 7); c.fill();   // chin shadow

  // ---- headphone cups on chest
  [[150, 412], [370, 412]].forEach(([x, y]) => {
    c.save(); c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 12; c.shadowOffsetY = 6;
    const g = c.createRadialGradient(x - 10, y - 12, 4, x, y, 44); g.addColorStop(0, '#3a4258'); g.addColorStop(1, '#0c1020'); c.fillStyle = g; c.beginPath(); c.arc(x, y, 42, 0, 7); c.fill(); c.restore();
    c.strokeStyle = '#35d4ec'; c.lineWidth = 6; c.shadowColor = '#35d4ec'; c.shadowBlur = 10; c.beginPath(); c.arc(x, y, 40, 0, 7); c.stroke(); c.shadowBlur = 0;
    c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.ellipse(x - 8, y - 14, 22, 11, -0.4, 0, 7); c.fill();
  });

  // ---- KYAU crest
  c.fillStyle = lg(c, 0, 440, 0, 500, [[0, '#3a58b8'], [1, '#1a2c78']]); c.strokeStyle = '#e8b83a'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(332, 452); c.lineTo(384, 452); c.lineTo(384, 490); c.quadraticCurveTo(384, 512, 358, 524); c.quadraticCurveTo(332, 512, 332, 490); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#f4d35a'; c.font = '800 13px Poppins'; c.textAlign = 'center'; c.fillText('KYAU', 358, 482);

  // ---- crossed arms: right arm (behind) then left arm (front)
  capsule(c, 420, 640, 160, 575, 96, skin(0, 540, 0, 660));
  c.fillStyle = skin(0, 540, 0, 620); c.strokeStyle = '#6a3a1c'; c.beginPath(); c.ellipse(132, 568, 38, 32, -0.3, 0, 7); c.fill(); c.stroke();     // hand
  capsule(c, 96, 640, 360, 560, 100, skin(0, 540, 0, 670));
  c.fillStyle = skin(0, 540, 0, 620); c.beginPath(); c.ellipse(392, 552, 40, 34, 0.25, 0, 7); c.fill(); c.stroke();
  // finger lines
  c.strokeStyle = '#9a5a34'; c.lineWidth = 3; [0, 1, 2].forEach((i) => { c.beginPath(); c.moveTo(398 + i * 7, 530 + i * 3); c.lineTo(408 + i * 7, 560 + i * 3); c.stroke(); });
  // sleeves
  c.fillStyle = shirt; c.strokeStyle = '#8f93b8'; c.lineWidth = 3;
  rr(c, 28, 604, 92, 120, 36); c.fill(); c.stroke(); rr(c, 402, 604, 92, 120, 36); c.fill(); c.stroke();
  // watch on left wrist
  c.save(); c.translate(300, 585); c.rotate(-0.28); c.fillStyle = '#20263e'; rr(c, -26, -26, 52, 52, 12); c.fill(); c.fillStyle = '#cfd7ea'; c.beginPath(); c.arc(0, 0, 18, 0, 7); c.fill(); c.strokeStyle = '#20263e'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -12); c.moveTo(0, 0); c.lineTo(8, 4); c.stroke(); c.restore();
  // arm shading
  c.fillStyle = 'rgba(80,30,10,.18)'; c.beginPath(); c.ellipse(260, 612, 150, 14, -0.22, 0, 7); c.fill();

  // ---- head
  c.fillStyle = skin(190, 120, 340, 330); c.strokeStyle = '#7a4424'; c.lineWidth = 3;
  [[168, 228], [352, 228]].forEach(([x, y]) => { c.beginPath(); c.ellipse(x, y, 17, 28, 0, 0, 7); c.fill(); c.stroke(); c.strokeStyle = '#a05a34'; c.beginPath(); c.arc(x + (x < 260 ? 3 : -3), y, 8, 0, 7); c.stroke(); c.strokeStyle = '#7a4424'; });
  const fg = c.createRadialGradient(235, 190, 20, 260, 225, 130); fg.addColorStop(0, '#f6c698'); fg.addColorStop(0.6, '#e2a674'); fg.addColorStop(1, '#bb7650');
  c.fillStyle = fg; c.beginPath(); c.ellipse(260, 218, 94, 108, 0, 0, 7); c.fill(); c.stroke();
  // hair
  c.fillStyle = '#1a120e';
  c.beginPath(); c.ellipse(260, 160, 100, 80, 0, Math.PI, 0); c.fill();
  c.beginPath(); c.moveTo(166, 190); c.quadraticCurveTo(170, 120, 260, 112); c.quadraticCurveTo(350, 120, 354, 190); c.quadraticCurveTo(330, 150, 262, 150); c.quadraticCurveTo(196, 150, 166, 190); c.fill();
  for (let i = 0; i < 17; i++) {
    const a = Math.PI + (Math.PI * i) / 16, rx = 112 + (i % 2) * 8, x = 260 + Math.cos(a) * rx, y = 168 + Math.sin(a) * 92 - (i % 3) * 4;
    const g = c.createRadialGradient(x - 8, y - 10, 2, x, y, 36); g.addColorStop(0, '#4a382c'); g.addColorStop(0.4, '#1f1612'); g.addColorStop(1, '#0c0705');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, 32 + (i % 2) * 4, 0, 7); c.fill();
  }
  for (let i = 0; i < 6; i++) { const x = 190 + i * 28, y = 120 + (i % 2) * 10; const g = c.createRadialGradient(x - 6, y - 8, 2, x, y, 28); g.addColorStop(0, '#46362a'); g.addColorStop(1, '#0e0806'); c.fillStyle = g; c.beginPath(); c.arc(x, y + 8, 26, 0, 7); c.fill(); }
  // brows
  c.strokeStyle = '#140d09'; c.lineWidth = 12; c.beginPath(); c.moveTo(196, 192); c.quadraticCurveTo(222, 172, 248, 182); c.moveTo(272, 182); c.quadraticCurveTo(298, 170, 326, 190); c.stroke();
  // eyes
  [[222, 214], [298, 214]].forEach(([x, y]) => {
    c.fillStyle = '#fff'; c.strokeStyle = '#3a2214'; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y, 20, 17, 0, 0, 7); c.fill(); c.stroke();
    const ig = c.createRadialGradient(x - 2, y - 2, 1, x, y, 11); ig.addColorStop(0, '#7a4a28'); ig.addColorStop(1, '#2a1608'); c.fillStyle = ig; c.beginPath(); c.arc(x + 2, y + 1, 11, 0, 7); c.fill();
    c.fillStyle = '#0a0503'; c.beginPath(); c.arc(x + 2, y + 1, 5.5, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x + 6, y - 4, 3.5, 0, 7); c.fill();
    c.strokeStyle = '#1a0e08'; c.lineWidth = 5; c.beginPath(); c.arc(x, y + 1, 20, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
  });
  // nose, cheeks, mouth
  c.strokeStyle = '#b06c42'; c.lineWidth = 4; c.beginPath(); c.moveTo(262, 232); c.quadraticCurveTo(272, 258, 252, 260); c.stroke();
  c.fillStyle = 'rgba(232,120,100,.28)'; c.beginPath(); c.ellipse(190, 262, 22, 14, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(330, 262, 22, 14, 0, 0, 7); c.fill();
  c.strokeStyle = '#7a3a22'; c.lineWidth = 6; c.beginPath(); c.moveTo(222, 284); c.quadraticCurveTo(262, 312, 312, 272); c.stroke();
  c.lineWidth = 3; c.beginPath(); c.moveTo(314, 266); c.lineTo(322, 276); c.stroke();
  // bandage
  c.save(); c.translate(318, 252); c.rotate(-0.35); c.fillStyle = '#efd8b0'; c.strokeStyle = '#b89868'; c.lineWidth = 2; rr(c, -26, -9, 52, 18, 6); c.fill(); c.stroke(); c.fillStyle = '#d8b888'; [-10, 0, 10].forEach((d) => { c.beginPath(); c.arc(d, 0, 1.6, 0, 7); c.fill(); }); c.restore();
  t.refresh();
}
