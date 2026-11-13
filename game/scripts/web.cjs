// Builds the game and puts the web files into the project root (C:\xampp\htdocs\pen) next to api/ admin/ update/.
// Run:  npm run web      (then zip the files listed in UPLOAD.txt and upload them to the site's public_html)
const fs = require('fs'), path = require('path'), cp = require('child_process');
const game = path.resolve(__dirname, '..'), root = path.resolve(game, '..');
cp.execSync('npx vite build', { cwd: game, stdio: 'inherit' });
const dist = path.join(game, 'dist');
for (const f of ['assets', 'img']) fs.rmSync(path.join(root, f), { recursive: true, force: true });
const copy = (a, b) => { fs.mkdirSync(b, { recursive: true }); for (const f of fs.readdirSync(a)) { const s = path.join(a, f), d = path.join(b, f); fs.statSync(s).isDirectory() ? copy(s, d) : fs.copyFileSync(s, d); } };
copy(dist, root);
console.log('web files copied to', root);
