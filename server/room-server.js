// PEN FIGHT — room server (WebSocket relay).  Run:  node room-server.js   (default port 8080)
// Creates rooms with an ID (+ optional password); players join with the ID. The room creator (host) runs the game physics
// on his device; this server only relays messages and keeps the lobby list.
const { WebSocketServer } = require('ws');
const PORT = process.env.PORT || 8765;          // 8765 = the 'nearby' port the game connects to (phone or PC host on the same Wi-Fi / hotspot)
const os = require('os');
const lanIps = () => Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address).sort((a, b) => (/^192.168.137./.test(b) ? 1 : 0) - (/^192.168.137./.test(a) ? 1 : 0));   // Windows hotspot (192.168.137.x) first
const wss = new WebSocketServer({ port: PORT });
const rooms = new Map();            // id -> { id, pass, max, time, arena, level, started, members: [ws,...], created }
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const send = (ws, o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
const newId = () => { let id; do { id = Array.from({ length: 5 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join(''); } while (rooms.has(id)); return id; };
const lobby = (r) => r.members.map((m, i) => ({ i, name: m.name, av: m.av, penId: m.penId, host: i === 0 }));
const broadcast = (r, o, except) => r.members.forEach((m) => { if (m !== except && !m.ghost) send(m, o); });
const pushLobby = (r) => r.members.forEach((m, i) => send(m, { t: 'lobby', id: r.id, you: i, max: r.max, time: r.time, arena: r.arena, level: r.level, hasPass: !!r.pass, players: lobby(r), started: r.started }));

function leave(ws) {
  const r = ws.room; if (!r) return;
  ws.room = null;
  const idx = r.members.indexOf(ws);
  if (idx < 0) return;
  if (idx === 0) { broadcast(r, { t: 'closed', reason: 'host_left' }, ws); r.members.forEach((m) => { if (!m.ghost) m.room = null; }); rooms.delete(r.id); console.log('room closed', r.id); return; }
  if (r.started) { r.members[idx] = { ghost: true, name: ws.name }; broadcast(r, { t: 'left', i: idx, name: ws.name }); }   // keep the slot: the host's game turns this player into a bot
  else { r.members.splice(idx, 1); pushLobby(r); }
}

wss.on('connection', (ws) => {
  ws.isAlive = true; ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', (raw) => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    const name = String(m.name || 'Player').slice(0, 14);
    switch (m.t) {
      case 'create': {
        leave(ws);
        const r = { id: newId(), pass: String(m.pass || '').slice(0, 12), max: Math.min(5, Math.max(2, m.max | 0 || 4)), time: m.time | 0 || 120, arena: m.arena || 'classroom', level: m.level ?? 1, started: false, members: [], created: Date.now() };
        ws.name = name; ws.av = m.av || 'boy'; ws.penId = m.penId || 'blue'; ws.room = r; r.members.push(ws); rooms.set(r.id, r);
        send(ws, { t: 'created', id: r.id, pass: r.pass, ips: lanIps() }); pushLobby(r); console.log('room created', r.id, 'by', name);
        break;
      }
      case 'join': {
        const r = m.id ? rooms.get(String(m.id).toUpperCase().trim()) : (rooms.size === 1 ? [...rooms.values()][0] : null);   // empty id = the only room (nearby mode)
        if (!r) return send(ws, { t: 'err', code: 'no_room' });
        if (r.pass && r.pass !== String(m.pass || '')) return send(ws, { t: 'err', code: 'bad_pass' });
        if (r.started) return send(ws, { t: 'err', code: 'started' });
        if (r.members.length >= r.max) return send(ws, { t: 'err', code: 'full' });
        leave(ws);
        ws.name = name; ws.av = m.av || 'girl'; ws.penId = m.penId || 'blue'; ws.room = r; r.members.push(ws);
        send(ws, { t: 'joined', id: r.id }); pushLobby(r); console.log(name, 'joined', r.id);
        break;
      }
      case 'setpen': { if (ws.room) { ws.penId = m.penId; pushLobby(ws.room); } break; }
      case 'start': {
        const r = ws.room; if (!r || r.members[0] !== ws || r.members.length < 2) return;
        r.started = true;
        r.members.forEach((p, i) => send(p, { t: 'start', you: i, id: r.id, time: r.time, arena: r.arena, level: r.level, players: lobby(r) }));
        console.log('room started', r.id, r.members.length, 'players');
        break;
      }
      // generic relay: guest -> host ('host'), host -> everybody else ('all')
      case 'relay': {
        const r = ws.room; if (!r) return;
        if (m.to === 'host') { if (r.members[0] !== ws) send(r.members[0], { t: 'relay', from: r.members.indexOf(ws), d: m.d }); }
        else if (r.members[0] === ws) broadcast(r, { t: 'relay', from: 0, d: m.d }, ws);
        break;
      }
      case 'leave': leave(ws); break;
      case 'ping': send(ws, { t: 'pong' }); break;
    }
  });
  ws.on('close', () => leave(ws));
});

// drop dead connections and abandoned rooms
setInterval(() => {
  wss.clients.forEach((ws) => { if (!ws.isAlive) return ws.terminate(); ws.isAlive = false; ws.ping(); });
  const now = Date.now(); rooms.forEach((r, id) => { if (!r.members.length || now - r.created > 6 * 3600 * 1000) rooms.delete(id); });
}, 15000);

if (process.env.PF_EXIT_AFTER) setTimeout(() => process.exit(0), +process.env.PF_EXIT_AFTER * 1000);   // for tests only
console.log(`PEN FIGHT room server on ws://0.0.0.0:${PORT}`);
