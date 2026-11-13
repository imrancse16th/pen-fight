// In-app updater (OTA). The phone downloads a new web bundle from <server>/pen/update/ — no new APK needed.
import { serverBase } from './api.js';

export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
const native = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

let CU = null;
async function plugin() {
  if (!native()) return null;
  if (!CU) CU = (await import('@capgo/capacitor-updater')).CapacitorUpdater;
  return CU;
}

/** Tell the plugin the new bundle started fine (otherwise it rolls back to the previous one). Call once at start. */
export async function markReady() { try { const p = await plugin(); if (p) await p.notifyAppReady(); } catch (e) {} }

export async function currentVersion() {
  const p = await plugin();
  if (!p) return APP_VERSION;
  try { const c = await p.current(); const v = c && c.bundle && c.bundle.version; return v && v !== 'builtin' ? v : APP_VERSION; } catch (e) { return APP_VERSION; }
}

const cmp = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };

function manifestUrl() {
  const b = serverBase();
  return b ? b.replace(/\/api\/index\.php.*$/, '/update/latest.json') : '';
}

/** -> {status:'new'|'latest'|'noserver'|'offline', info?, cur} */
export async function checkForUpdate() {
  const url = manifestUrl(), cur = await currentVersion();
  if (!url) return { status: 'noserver', cur };
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch(url + '?t=' + Date.now(), { cache: 'no-store', signal: ctl.signal }); clearTimeout(t);
    if (!r.ok) return { status: 'latest', cur };
    const info = await r.json();
    return cmp(info.version, cur) > 0 ? { status: 'new', info, cur } : { status: 'latest', cur };
  } catch (e) { return { status: 'offline', cur }; }
}

/** Download + switch to the new bundle (the app restarts by itself). On a PC browser it just reloads the page. */
export async function installUpdate(info, onProgress) {
  const p = await plugin();
  if (!p) { location.reload(); return; }
  const zip = new URL(info.url, manifestUrl()).href;
  const h = await p.addListener('download', (e) => onProgress && onProgress(e.percent || 0));
  try {
    const bundle = await p.download({ url: zip, version: info.version });
    onProgress && onProgress(100);
    await p.set(bundle);
  } finally { try { h.remove(); } catch (e) {} }
}
