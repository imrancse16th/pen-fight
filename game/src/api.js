// Talks to the PHP + MySQL backend (api/index.php). Diamonds live on the server so they cannot be faked on the phone.
import { store, penById } from './store.js';

const native = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
export const PROD_API = 'http://pen.devimran.my.id/api/index.php';

/** Server address. Settings override > phone app default (production) > same site as the page. */
export function serverBase() {
  const u = (store.get().serverUrl || '').trim();
  if (u) return u;
  if (native()) return PROD_API;
  return location.pathname.startsWith('/pen/') ? '/pen/api/index.php' : '/api/index.php';
}

/** POST a JSON action. `long` = ms to wait for a slow (long-poll) answer. */
const cleanName = (n) => String(n || '').replace(/[^p{L}p{M}p{N} ._-]/gu, '').trim().slice(0, 14) || 'Player';
export async function call(params, long) {
  params = { ...params };
  if ('name' in params) params.name = cleanName(params.name);
  if ('pass' in params) params.pass = String(params.pass || '').replace(/[^ -~]/g, '').slice(0, 12);
  const b = serverBase();
  if (!b) throw Object.assign(new Error('no_server'), { code: 'no_server' });
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), long || 7000);
  try {
    const r = await fetch(b, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(params), cache: 'no-store', signal: ctl.signal });
    const j = await r.json();
    if (!r.ok) throw Object.assign(new Error(j.error || 'fail'), { code: j.error || 'fail', data: j });
    return j;
  } catch (e) {
    if (e.code) throw e;
    throw Object.assign(new Error('offline'), { code: 'offline' });
  } finally { clearTimeout(t); }
}
const who = () => { const d = store.get(); return { id: d.playerId, token: d.playerToken }; };

/** Coins gifted by the admin arrive as `grant`; add them to the phone's own coin count (the phone is the one that saves coins). */
function applyGrant(r) {
  const g = (r && +r.grant) || 0;
  if (g) { const d = store.get(); store.set({ coins: Math.max(0, d.coins + g) }); api.lastGift = (api.lastGift || 0) + g; }
  return g;
}
/** Redraw the coin / diamond numbers on whatever screen is open. */
export function refreshHud() {
  const c = window.__cur, d = store.get(); if (!c) return;
  if (c.coin && c.coin.active) c.coin.setText(String(d.coins));
  if (c.gem && c.gem.active) c.gem.setText(String(d.gems ?? 0));
}

export const api = {
  online: false,
  lastGift: 0,   // coins received from the admin since the last time the player was told
  /** Re-ask the server for diamonds / admin coins (called every 20 s while the app is open and when it comes back to the front). */
  async refresh() { if (document.hidden) return; const d = store.get(); if (!d.playerId || !d.playerToken) return; await this.sync(); },
  /** Register (first time) or fetch the balance. Updates the local diamond count when the server answers. */
  async sync() {
    const d = store.get();
    try {
      let r;
      const reg = async () => { const x = await call({ a: 'register', name: d.name }); store.set({ playerToken: x.token }); return x; };
      if (!d.playerId || !d.playerToken) { if (!d.guest) return false; r = await reg(); }
      else {
        try { r = await call({ a: 'get', ...who(), name: d.name }); }
        catch (e) { if (e.code === 'not_found' || e.code === 'bad_token') r = await reg(); else throw e; }
      }
      store.set({ playerId: r.id, gems: r.gems, hasPass: !!r.has_pass });
      applyGrant(r); refreshHud();
      this.online = true;
    } catch (e) { this.online = false; }
    return this.online;
  },
  /** Open a guest account (no password). Works offline too: the server account is made on the next sync. */
  async guest() { store.set({ guest: true }); await this.sync(); return true; },
  /** New account with a name + password. */
  async createAccount(name, password, email) {
    try { const r = await call({ a: 'register', name, username: name, email, password }); store.set({ playerId: r.id, playerToken: r.token, name: r.name, gems: r.gems, hasPass: true, username: r.username || name, guest: false }); this.online = true; return { ok: true, id: r.id }; }
    catch (e) { return { ok: false, error: e.code }; }
  },
  /** Log in with ID + password; the saved progress comes along. */
  async login(id, password) {
    try {
      const r = await call({ a: 'login', user: String(id).trim(), password });
      store.set({ playerId: r.id, playerToken: r.token, name: r.name, gems: r.gems, hasPass: true, username: r.username || '', guest: false });
      if (r.data) store.set({ ...r.data });
      applyGrant(r); refreshHud();
      this.online = true; return { ok: true };
    } catch (e) { return { ok: false, error: e.code }; }
  },
  async setPassword(password, username, email) {
    try { await call({ a: 'set_password', ...who(), password, ...(username ? { username } : {}), ...(email ? { email } : {}) }); store.set({ hasPass: true, ...(username ? { username } : {}) }); return { ok: true }; } catch (e) { return { ok: false, error: e.code }; }
  },
  logout() { store.set({ playerId: '', playerToken: '', guest: false, hasPass: false, gems: 0 }); this.online = false; },
  /** Spend diamonds on the server. Returns {ok, error}. */
  async spendGems(n, item) {
    const d = store.get();
    if (n <= 0) return { ok: true };
    if (!this.online && !(await this.sync())) {   // server unreachable: local demo wallet
      if (d.gems < n) return { ok: false, error: 'not_enough' };
      store.set({ gems: d.gems - n }); return { ok: true };
    }
    try { const r = await call({ a: 'spend', ...who(), gems: n, item }); store.set({ gems: r.gems }); return { ok: true }; }
    catch (e) { return { ok: false, error: e.code === 'not_enough' ? 'not_enough' : 'offline' }; }
  },
  /** DUMMY store: gives diamonds without real money. */
  async dummyBuy(pack) {
    const d = store.get(), table = { 100: 100, 500: 550, 1200: 1440, 3000: 3750, 6500: 8450 };
    if (!this.online && !(await this.sync())) { store.set({ gems: d.gems + table[pack] }); return { ok: true }; }
    try { const r = await call({ a: 'dummy_buy', ...who(), pack }); store.set({ gems: r.gems }); return { ok: true }; }
    catch (e) { return { ok: false, error: e.code }; }
  },
};

/** Buy a pen with coins or diamonds. Returns {ok, error}. */
export async function buyPen(id) {
  const d = store.get(), p = penById(id);
  if (d.owned.includes(id)) return { ok: true };
  if (p.gems > 0) {
    const r = await api.spendGems(p.gems, id);
    if (!r.ok) return r;
  } else {
    if (d.coins < p.coins) return { ok: false, error: 'no_coins' };
    store.set({ coins: d.coins - p.coins });
  }
  store.set({ owned: [...store.get().owned, id] });
  return { ok: true };
}

// keep the account's progress (coins, owned pens, stats) on the server — a few seconds after any change
let saveT = null;
store.onSave = () => {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    const d = store.get(); if (!d.playerId || !d.playerToken || !api.online) return;
    const data = { coins: d.coins, owned: d.owned, pen: d.pen, arena: d.arena, xp: d.xp, trophies: d.trophies, wins: d.wins, losses: d.losses };
    call({ a: 'save', ...who(), data }).catch(() => {});
  }, 3000);
};
