// Sound engine. Real audio files (public/sfx/<name>.mp3, optional variants <name>_2.mp3, <name>_3.mp3 ...) are
// preloaded once into memory and played through WebAudio (instant, works on many devices at the same time).
// A file that does not exist is simply skipped and the old synthesized beep is used instead - nothing breaks.
import { store } from './store.js';

// every sound the game can play (name -> how many numbered variants to look for)
// the 9 voice-reaction buttons (index = react_1..react_9)
export const REACTIONS = [['🥺', 'মারিস না!'], ['😂', 'হাহাহা!'], ['😱', 'ও মাগো!'], ['🙏', 'ছেড়ে দে!'], ['😎', 'দেখ এখন!'], ['😭', 'আমি শেষ!'], ['🔥', 'মার একদম!'], ['🤝', 'বন্ধু নাকি?'], ['🤣', 'কী করলি!']];
// automatic voices for game situations
export const SITUATIONS = {};   // automatic situation voices were removed on purpose
export const SOUND_NAMES = {
  click: 1, flick: 3, hit: 4, fall: 3, win: 1, lose: 1, tick: 1, start: 1, ko: 3, sudden: 1, turn: 1, whoosh: 2,
  // reactions (funny): one per emoji button
  react_1: 1, react_2: 1, react_3: 1, react_4: 1, react_5: 1, react_6: 1, react_7: 1, react_8: 1, react_9: 1,
  // situation voices (friends pack)
  vs_attack: 1, vs_losing: 1, vs_fall: 1, vs_near: 1, vs_ask: 1, vs_closewin: 1, vs_danger: 1, vs_rematch: 1, vs_win: 1, vs_edge: 1, vs_lose: 1, vs_both: 1,
  // random funny extras
  funny_fail: 3, funny_boing: 2, funny_fart: 2, funny_bruh: 1,
};
const MAX_VARIANTS = 6;
const base = () => (import.meta.env && import.meta.env.BASE_URL) || './';

let ctx = null, master = null;
const bufs = {};            // name -> [AudioBuffer]
let loading = false, loaded = false;

function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' }); } catch { return null; }
    master = ctx.createGain(); master.gain.value = 1;
    // a compressor keeps many overlapping sounds from distorting
    const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

async function loadOne(c, name, n) {
  const list = [];
  for (let i = 1; i <= Math.min(n, MAX_VARIANTS); i++) {
    const file = i === 1 ? name : `${name}_${i}`;
    for (const ext of ['mp3', 'ogg', 'wav']) {
      try {
        const r = await fetch(`${base()}sfx/${file}.${ext}?v=${typeof __BUILD__ !== 'undefined' ? __BUILD__ : 0}`);
        if (!r.ok || !/audio|octet/.test(r.headers.get('content-type') || 'audio')) continue;
        const buf = await c.decodeAudioData(await r.arrayBuffer());
        list.push(buf); break;
      } catch (e) { /* missing file: try next extension */ }
    }
  }
  if (list.length) bufs[name] = list;
}
export function preload() {
  if (loading) return; const c = ac(); if (!c) return; loading = true;
  Promise.all(Object.entries(SOUND_NAMES).map(([k, n]) => loadOne(c, k, n))).then(() => { loaded = true; });
}
// phones only allow audio after a touch: unlock on the first one and start loading right then
const unlock = () => { ac(); preload(); };
['pointerdown', 'touchstart', 'keydown'].forEach((e) => addEventListener(e, unlock, { once: true, passive: true }));
document.addEventListener('visibilitychange', () => { if (!document.hidden && ctx && ctx.state !== 'running') ctx.resume().catch(() => {}); });

const last = {};   // anti-spam: min gap per sound
function play(name, { vol = 1, rate = 1, gap = 40 } = {}) {
  if (!store.get().sound) return false;
  const list = bufs[name]; if (!list) return false;
  const c = ac(); if (!c) return false;
  const now = performance.now(); if (now - (last[name] || 0) < gap) return true; last[name] = now;
  const src = c.createBufferSource(), g = c.createGain();
  src.buffer = list[Math.floor(Math.random() * list.length)];
  src.playbackRate.value = rate * (0.96 + Math.random() * 0.08);   // tiny pitch change so repeats do not sound robotic
  g.gain.value = vol; src.connect(g).connect(master); src.start();
  return true;
}

function tone(f, d, type = 'sine', v = 0.15, slide = 0) {
  if (!store.get().sound) return;
  const c = ac(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, c.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), c.currentTime + d);
  g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d);
  o.connect(g).connect(master || c.destination); o.start(); o.stop(c.currentTime + d);
}
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export const sfx = {
  preload,
  play,
  click() { if (play('click')) return; tone(620, 0.06, 'sine', 0.07, 380); setTimeout(() => tone(930, 0.05, 'sine', 0.04), 30); },   // soft rising 'pop'
  tick() { play('tick') || tone(660, 0.08, 'triangle', 0.12); },
  flick(p = 1) { play('flick', { vol: 0.5 + 0.5 * p }) || tone(220 + 200 * p, 0.14, 'sawtooth', 0.08, -120); },
  hit() { /* no sound when pens bump (removed on purpose) */ },
  fall() { play('fall') || tone(520, 0.5, 'sine', 0.14, -440); },
  ko() { play('ko'); },
  sudden() { play('sudden'); },
  turn() { play('turn'); },
  start() { play('start'); },
  win() { play('win') || [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.16), i * 140)); },
  lose() { (play('lose') || [392, 330, 262].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sawtooth', 0.1), i * 200))); },
  // emoji reactions: index 0..3 = thumb, laugh, wow, chat
  react(i) { play('react_' + (i + 1), { gap: 250 }); },
  /** situation voice: plays vs_<key> and returns the Bangla caption to show */
  /** Automatic situation voices are switched OFF on purpose: voices only play when the player taps a reaction button. */
  say() { return ''; },
};
