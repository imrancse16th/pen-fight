// Room networking. Two transports behind one API (NET.send / NET.on):
//  - 'internet': HTTP long-polling to the PHP API (works on ordinary hosting, no WebSocket server)
//  - 'nearby'  : WebSocket to a phone/PC on the same Wi-Fi / hotspot (no internet needed)
import { call, serverBase } from './api.js';
import { store } from './store.js';
import { lan } from './lan.js';

export const NEARBY_PORT = 8765;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

class Net {
  constructor() { this.ws = null; this.handlers = {}; this.mode = 'internet'; this.nearbyHost = ''; this.snapEvery = 50; this.reset(); }
  reset() { this.sess = null; this.run = 0; this.since = 0; this.snapSeq = 0; this.q = Promise.resolve(); this.snapBusy = false; }
  /** mode: 'internet' | 'nearby'; host (nearby only) = IP of the phone that hosts. */
  setMode(mode, host) { if (this.mode !== mode || this.nearbyHost !== host) this.close(); this.mode = mode; this.nearbyHost = host || ''; this.snapEvery = mode === 'internet' ? 120 : 50; }

  connect() {
    if (this.mode === 'internet') return call({ a: 'ping' }, 5000).then(() => {}, () => Promise.reject({ code: serverBase() ? 'offline' : 'no_server' }));
    if (this.ws && this.ws.readyState === 1) return Promise.resolve();
    if (!this.nearbyHost) return Promise.reject({ code: 'no_host' });
    return new Promise((res, rej) => {
      let done = false;
      let ws; try { ws = new WebSocket(`ws://${this.nearbyHost}:${NEARBY_PORT}`); } catch (e) { return rej({ code: 'offline' }); }
      this.ws = ws;
      const t = setTimeout(() => { if (!done) { done = true; try { ws.close(); } catch (e) {} rej({ code: 'offline' }); } }, 5000);
      ws.onopen = () => { done = true; clearTimeout(t); res(); };
      ws.onerror = () => { if (!done) { done = true; clearTimeout(t); rej({ code: 'offline' }); } };
      ws.onclose = () => { if (this.ws === ws) this.emit({ t: 'closed', reason: 'disconnected' }); };
      ws.onmessage = (e) => { try { this.emit(JSON.parse(e.data)); } catch (err) {} };
    });
  }
  emit(m) { (this.handlers[m.t] || []).slice().forEach((f) => f(m)); }
  on(t, fn) { (this.handlers[t] = this.handlers[t] || []).push(fn); return () => { this.handlers[t] = (this.handlers[t] || []).filter((f) => f !== fn); }; }

  send(o) {
    if (this.mode === 'nearby') { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); return; }
    this.sendHttp(o);
  }
  leave() { if (this.mode === 'nearby') { this.send({ t: 'leave' }); if (lan.running) setTimeout(() => lan.stop(), 300); } else this.sendHttp({ t: 'leave' }); }
  close() {
    if (this.mode === 'nearby') { try { this.send({ t: 'leave' }); if (this.ws) { const w = this.ws; this.ws = null; w.close(); } } catch (e) {} if (lan.running) setTimeout(() => lan.stop(), 300); return; }
    this.sendHttp({ t: 'leave' }); this.run++;       // stops the poll loop
  }

  // ---------- internet (HTTP) ----------
  sendHttp(o) {
    const S = this.sess, d = store.get();
    const mine = S ? { id: S.id, idx: S.idx, rt: S.rt } : {};
    const fail = (e) => { if (e && e.code && e.code !== 'offline') this.emit({ t: 'err', code: e.code }); else if (e && e.code === 'offline' && o.t !== 'relay') this.emit({ t: 'err', code: 'offline' }); };
    switch (o.t) {
      case 'create': return this.enter(call({ a: 'room_create', name: o.name, pass: o.pass, max: o.max, time: o.time, arena: o.arena, level: o.level, penId: o.penId }), fail);
      case 'join': return this.enter(call({ a: 'room_join', id: o.id, pass: o.pass, name: o.name, penId: o.penId }), fail);
      case 'setpen': return this.queue(() => call({ a: 'room_setpen', ...mine, penId: o.penId }), fail);
      case 'start': return this.queue(() => call({ a: 'room_start', ...mine }), fail);
      case 'leave': { if (!S) return; this.sess = null; this.run++; const m = { ...mine }; call({ a: 'room_leave', ...m }, 4000).catch(() => {}); return; }
      case 'relay': {
        if (!S) return;
        const snap = o.d && o.d.k === 'snap';
        if (snap) { if (this.snapBusy) return; this.snapBusy = true; call({ a: 'room_send', ...mine, d: o.d }, 5000).catch(() => {}).then(() => { this.snapBusy = false; }); return; }
        return this.queue(() => call({ a: 'room_send', ...mine, to: o.to === 'host' ? 'host' : 'all', d: o.d }), () => {});
      }
    }
  }
  queue(fn, fail) { this.q = this.q.then(fn).catch(fail).then(() => {}); return this.q; }
  async enter(p, fail) {
    try {
      const r = await p;
      this.sess = { id: r.id, idx: r.idx, rt: r.rt }; this.since = 0; this.snapSeq = 0; this.snapBusy = false;
      this.pollLoop(++this.run);
    } catch (e) { fail(e); }
  }
  async pollLoop(my) {
    let errs = 0;
    while (my === this.run && this.sess) {
      const S = this.sess;
      try {
        const r = await call({ a: 'room_poll', id: S.id, idx: S.idx, rt: S.rt, since: this.since, snapseq: this.snapSeq, wait: 5000 }, 12000);
        if (my !== this.run) return;
        errs = 0;
        for (const x of r.msgs) { this.since = Math.max(this.since, x.seq); const m = x.m; if (m.t === 'lobby') m.you = S.idx; this.emit(m); }
        if (r.snap) { this.snapSeq = r.snap.seq; this.emit({ t: 'relay', from: 0, d: r.snap.d }); }
      } catch (e) {
        if (my !== this.run) return;
        if (e.code === 'no_room' || e.code === 'gone') { this.sess = null; this.emit({ t: 'closed', reason: 'disconnected' }); return; }
        if (++errs >= 5) { this.sess = null; this.emit({ t: 'closed', reason: 'disconnected' }); return; }
        await wait(800);
      }
    }
  }
}
export const NET = new Net();
