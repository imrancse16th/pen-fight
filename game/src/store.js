// Player data: saved on the device. Diamonds are kept on the server (api/) when it is reachable.
const KEY = 'penfight.v1';

/*
  PEN POWER
  power  = how hard a flick hits (launch speed)
  dur    = weight: heavier pens are pushed much less by other pens
  hold   = "grip": how far the pen's centre must go past the desk edge before it falls (strong pens hang on)
  coins/gems = price. Strong pens cost diamonds.
*/
export const PENS = [
  { id: 'blue',   svg: 'blue',   name: 'KYAU বু এডিশন',   rarity: 'Epic',      coins: 0,   gems: 0,   power: 62, acc: 70, speed: 70, dur: 58, hold: 0,  label: 'KYAU' },
  { id: 'silver', svg: 'silver', name: 'ক্লাসিক সিলভার', rarity: 'Common',    coins: 100, gems: 0,   power: 68, acc: 72, speed: 72, dur: 66, hold: 3,  label: 'CLASSIC' },
  { id: 'green',  svg: 'green',  name: 'ক্যাম্পাস গ্রিন', rarity: 'Rare',      coins: 300, gems: 0,   power: 74, acc: 86, speed: 78, dur: 70, hold: 6,  label: 'CAMPUS' },
  { id: 'red',    svg: 'red',    name: 'রেড স্টাইকার',    rarity: 'Rare',      coins: 0,   gems: 60,  power: 88, acc: 64, speed: 82, dur: 78, hold: 12, label: 'STRIKER' },
  { id: 'gold',   svg: 'gold',   name: 'গোল্ড প্রিমিয়াম', rarity: 'Epic',      coins: 0,   gems: 150, power: 84, acc: 80, speed: 74, dur: 92, hold: 22, label: 'GOLD' },
  { id: 'neon',   svg: 'neon',   name: 'লেজেন্ডারি পেন',  rarity: 'Legendary', coins: 0,   gems: 400, power: 98, acc: 94, speed: 92, dur: 98, hold: 34, label: 'LEGEND' },
];
PENS.forEach((p, i) => { p.tier = i; });

// Play locations. air = how slippery the desk is (smaller = pens slide further), mult = reward multiplier.
export const ARENAS = [
  { id: 'classroom', name: 'ক্লাসরুম অ্যারিনা', desc: 'ক্লাসরুমের আসল পেন ফাইট অভিজ্ঞতা', level: 1, diff: 'সহজ', air: 1.0, mult: 1, bg: 'arena_classroom', col: '#ffc61a' },
  { id: 'campus', name: 'ক্যাম্পাস অ্যারিনা', desc: 'ক্যাম্পাসের মুক্ত হাওয়ায় মসৃণ কাঠের ডেস্ক', level: 1, diff: 'মধ্যম', air: 0.8, mult: 1.5, bg: 'gamebg', col: '#3ab0ff' },
  { id: 'library', name: 'লাইব্রেরি অ্যারিনা', desc: 'ভারী পালিশ করা ডেস্ক, পেন ধীরে ছোটে', level: 2, diff: 'কঠিন', air: 1.35, mult: 2, bg: 'arena_library', col: '#a06aff' },
  { id: 'rooftop', name: 'ছাদ অ্যারিনা', desc: 'পিচ্ছিল কংক্রিট — একটুতেই পেন পড়ে যায়!', level: 3, diff: 'বিশেষ', air: 0.55, mult: 3, bg: 'arena_rooftop', col: '#ff7a3a' },
];
export const arenaById = (id) => ARENAS.find((a) => a.id === id) || ARENAS[0];
export const penById = (id) => PENS.find((p) => p.id === id) || PENS[0];

const DEFAULT = { name: 'PenFighterBD', coins: 500, gems: 0, playerId: '', serverUrl: '', playerToken: '', guest: false, hasPass: false, xp: 0, trophies: 0, wins: 0, losses: 0, pen: 'blue', arena: 'classroom', owned: ['blue'], sound: true, difficulty: 1 };

let data;
function load() {
  try { data = { ...DEFAULT, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch { data = { ...DEFAULT }; }
  if (!data.owned.includes('blue')) data.owned.push('blue');
}
load();

export const store = {
  get: () => data,
  save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} if (this.onSave) this.onSave(); },
  set(patch) { Object.assign(data, patch); this.save(); },
  level: () => Math.floor(data.xp / 100) + 1,
  levelProgress: () => (data.xp % 100) / 100,
  rank() {
    const t = data.trophies;
    if (t >= 600) return 'Gold';
    if (t >= 300) return 'Silver';
    return 'Bronze';
  },
  // pens the player may be matched against by the AI (never far stronger than what the player owns)
  maxTier() { return Math.max(...data.owned.map((id) => penById(id).tier)); },
  reward(win, mult = 1) {
    const r = win ? { coins: Math.round(50 * mult), xp: Math.round(30 * mult), trophies: Math.round(30 * mult) } : { coins: 10, xp: 10, trophies: -15 };
    data.coins += r.coins; data.xp += r.xp;
    data.trophies = Math.max(0, data.trophies + r.trophies);
    if (win) data.wins++; else data.losses++;
    this.save();
    return r;
  },
};
