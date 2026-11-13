# PEN FIGHT

Bangladeshi school-desk pen-flick battle game (Phaser + Capacitor), with a PHP/MySQL backend and an admin panel.

| Folder | What it is |
|---|---|
| `game/` | The game (Vite + Phaser + Capacitor Android). See `game/GUIDE.md` for running, updates and building the APK |
| `api/` | PHP + MySQL API: accounts, diamonds/coins, online rooms |
| `admin/` | Admin panel: players, gifts (diamonds/coins), transactions, admins |
| `server/` | WebSocket room server for "nearby" play on one Wi-Fi / hotspot |
| `sql/` | Database update scripts |

## Quick start (XAMPP)
1. Copy `api/config.example.php` to `api/config.local.php` and fill in your local MySQL details, then import `api/schema.sql`.
2. `cd game && npm install && npm run build`, then open `http://localhost/pen/game/dist/index.html`.
3. Live deploy: `cd game && npm run web`, then follow `UPLOAD.txt`.
