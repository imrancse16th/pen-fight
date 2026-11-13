import { sceneSVG, head, avatarKinds, hero, pen, icon } from './svgkit.js';
import { PENS } from './store.js';
import { booksTex, crumpleTex, mugTex, FONT, FONT_LATIN, rr, lg } from './gfx.js';
import { makeLogo } from './logo.js';
import { heroTex } from './hero.js';

export const W = 1280, H = 720;

function svgImg(scene, key, svg, w, h) {
  return new Promise((res) => {
    if (scene.textures.exists(key)) return res();
    svg = svg.replace('<svg ', `<svg width="${w}" height="${h}" `);
    const img = new Image();
    img.onload = () => { scene.textures.addImage(key, img); res(); };
    img.onerror = () => { console.warn('svg fail', key); res(); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

const ICONS = { coin: null, gem: null, trophy: null, gift: '#ffb21a', star: '#ffc61a', crown: '#ffc61a', users: '#ffc61a', gear: '#ffffff', home: '#ffffff', user: '#ffffff', chart: '#ffffff', pencil: '#ffffff', cart: '#ffffff', fist: '#ffffff', target: '#ffffff', bolt: '#ffffff', shield: '#ffffff', clock: '#ffffff', lock: '#ffffff', speaker: '#ffffff', mic: '#ffffff', pause: '#ffffff', check: '#ffffff', swords: '#ffffff', calendar: null, bell: '#ffffff', mail: '#ffffff', eye: '#ffffff', palette: '#ffffff', box: '#ffffff', up2: '#ffffff', play: '#ffffff', wifi: '#ffffff', refresh: '#ffffff', exit: '#ffffff', chat: '#ffffff', skull: '#ffffff', flag: '#ffffff', x: '#ffffff', bars: '#ffffff', sparkle: '#ffffff', globe: '#ffffff', gamepad: '#ffffff', fwd: '#ffffff', back: '#ffffff', chev: '#ffffff', plus: '#ffffff', copy: '#ffffff', qr: '#ffffff' };

export async function buildAssets(scene) {
  const jobs = [];
  if (!scene.textures.exists('campus')) jobs.push(svgImg(scene, 'campus', sceneSVG(''), 1672, 941));
  PENS.forEach((p) => { const k = 'penimg_' + p.id; if (scene.textures.exists(k) && !scene.textures.exists('pen_' + p.id)) { const im = scene.textures.get(k).getSourceImage(); const w = 520, h = Math.round((520 * im.height) / im.width); const t = scene.textures.createCanvas('pen_' + p.id, w, h); t.getContext().drawImage(im, 0, 0, w, h); t.refresh(); } });
  Object.keys(avatarKinds).forEach((k) => jobs.push(svgImg(scene, 'av_' + k, head(avatarKinds[k]), 256, 256)));
  PENS.forEach((p) => jobs.push(svgImg(scene, 'pen_' + p.id, pen(p.svg, p.label), 520, 70)));
  Object.entries(ICONS).forEach(([n, col]) => jobs.push(svgImg(scene, 'ic_' + n, icon(n, col || undefined), 96, 96)));
  await Promise.all(jobs);
  heroTex(scene); booksTex(scene); crumpleTex(scene); mugTex(scene); makeLogo(scene);
  const mk = (key, w, h, fn) => { if (scene.textures.exists(key)) return; const t = scene.textures.createCanvas(key, w, h); fn(t.getContext(), w, h); t.refresh(); };
  mk('spark', 16, 16, (c) => { const g = c.createRadialGradient(8, 8, 0, 8, 8, 8); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,220,80,0)'); c.fillStyle = g; c.fillRect(0, 0, 16, 16); });
  mk('dot', 8, 8, (c) => { c.fillStyle = '#fff'; c.beginPath(); c.arc(4, 4, 4, 0, 7); c.fill(); });
  mk('rays', 1024, 1024, (c) => { c.translate(512, 512); for (let i = 0; i < 14; i++) { c.rotate((Math.PI * 2) / 14); const g = c.createLinearGradient(0, 0, 0, -500); g.addColorStop(0, 'rgba(255,230,120,.6)'); g.addColorStop(1, 'rgba(255,230,120,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(-26, 0); c.lineTo(26, 0); c.lineTo(8, -500); c.lineTo(-8, -500); c.fill(); } });
}
