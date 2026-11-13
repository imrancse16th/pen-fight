import Phaser from 'phaser';
import './fonts.css';
import { W, H } from './assets.js';
import { Boot, Splash, Home, PenSelect, Profile, Settings, ArenaSelect, Shop, RoomSetup, OnlineRoom, RoomHub, Login } from './menus.js';
import { Game, Result } from './game.js';
import { api, buyPen, refreshHud } from './api.js';
import { store } from './store.js';
import { markReady } from './updater.js';
markReady();
import * as updater from './updater.js';
import { NET } from './net.js';
window.__pfApi = { api, buyPen, store, updater, NET };

window.__pf = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: W,
  height: H,
  backgroundColor: '#0a1a52',
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%', autoCenter: Phaser.Scale.NO_CENTER },
  physics: { default: 'matter', matter: { gravity: { x: 0, y: 0 }, debug: false } },
  input: { activePointers: 2 },
  scene: [Boot, Splash, Login, Home, RoomHub, OnlineRoom, Shop, RoomSetup, ArenaSelect, PenSelect, Profile, Settings, Game, Result],
});

// F = full screen on PC. Also stops the browser from scrolling/zooming the page on phones.
window.addEventListener('keydown', (e) => { if (e.key === 'f' || e.key === 'F') window.__pf.scale.toggleFullscreen(); });
document.addEventListener('gesturestart', (e) => e.preventDefault());

// ---- phone browser: go full screen (URL bar hidden) and landscape on the first touch ----
const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const isTouch = matchMedia('(pointer: coarse)').matches;
async function goImmersive() {
  if (isNative) return;
  try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch (e) {}
  try { await screen.orientation.lock('landscape'); } catch (e) {}
}
if (isTouch && !isNative) {
  const arm = () => addEventListener('pointerdown', goImmersive, { once: true });
  arm();
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) arm(); });
  const b = document.getElementById('goFull'); if (b) b.addEventListener('click', goImmersive);
}

// diamonds / coins given by the admin show up without restarting the app
setInterval(() => api.refresh().then(announceGift), 20000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) api.refresh().then(announceGift); });
function announceGift() {
  refreshHud();
  if (!api.lastGift) return;
  const g = api.lastGift; api.lastGift = 0;
  const sc = window.__pf.scene.getScenes(true)[0]; if (!sc || !sc.add) return;
  const t = sc.add.text(640, 120, (g > 0 ? '🎁 অ্যাডমিন দিয়েছে +' : 'অ্যাডমিন কেটেছে ') + g + ' কয়েন', { fontFamily: 'sans-serif', fontSize: '30px', color: '#fff', fontStyle: '700', backgroundColor: 'rgba(10,20,60,.85)', padding: { x: 18, y: 8 } }).setOrigin(0.5).setDepth(500);
  sc.tweens.add({ targets: t, alpha: 0, y: 90, delay: 2600, duration: 500, onComplete: () => t.destroy() });
}
