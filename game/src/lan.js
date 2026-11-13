// "Nearby" mode: the phone app can act as the room host on the local Wi-Fi / hotspot (no internet).
// The native side (android LanServerPlugin, Java-WebSocket) speaks the same protocol as server/room-server.js.
import { registerPlugin } from '@capacitor/core';
const NEARBY_PORT = 8765;

const Native = registerPlugin('LanServer');
const isNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

export const lan = {
  running: false,
  available: isNative,
  /** Starts the host server on this phone. Returns this phone's Wi-Fi IP (or '' if none). */
  async start() { const r = await Native.start({ port: NEARBY_PORT }); this.running = true; return r.ip || ''; },
  /** Listens ~ms for rooms announced nearby. Returns [{ip,port,host,n,max,pass,started,open}] (empty in a browser). */
  async discover(ms = 2500) { if (!isNative()) return []; const r = await Native.discover({ ms }); return r.hosts || []; },
  async stop() { if (!this.running) return; this.running = false; try { await Native.stop(); } catch (e) {} },
};
