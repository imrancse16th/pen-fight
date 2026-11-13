# PEN FIGHT — খেলার প্রজেক্ট (Phaser 3 + Vite + Capacitor)

## চালানোর নিয়ম
```bash
cd game
npm install          # একবারই
npm run dev          # ডেভেলপমেন্ট: http://localhost:5173
npm run build        # dist/ ফোল্ডার তৈরি (XAMPP থেকেও চলে: http://localhost/pen/game/dist/)
```

## Android অ্যাপ (Capacitor)
Android Studio + JDK 17 লাগবে।
```bash
npm run build
npx cap add android      # প্রথমবার একবার
npm run android:sync     # প্রতিবার কোড বদলালে
npm run android:open     # Android Studio খুলবে → Run / Build APK
```
App ID: `edu.kyau.penfight` (capacitor.config.json-এ বদলানো যাবে)।

## খেলার নিয়ম
- নিজের পেনে আঙুল রেখে পেছনে টানুন, ছাড়লে পেন ছুটবে।
- প্রতিপক্ষের পেন ধাক্কা দিয়ে খাতার (টেবিলের) বাইরে ফেলুন। শেষ পেন যার টিকে থাকবে, সে জয়ী।
- মোড: AI-এর সাথে (৩ লেভেল), এক ফোনে ২ জন।

## ফাইল
- `src/game.js` — গেমপ্লে (Matter physics, AI, পজ, রেজাল্ট)
- `src/menus.js` — স্প্ল্যাশ, হোম, পেন নির্বাচন, সেটিংস
- `src/art.js` — সব ছবি কোড দিয়ে আঁকা (কার্টুন স্টাইল)
- `src/store.js` — কয়েন/XP/ট্রফি/পেন ডেটা (এখন ফোনেই সেভ হয়; পরে Laravel API-তে যাবে)
- `?auto#Game` — টেস্টের জন্য AI বনাম AI অটো-প্লে
