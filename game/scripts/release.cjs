// One-command update publisher.
//   npm run release                      -> patch bump (1.0.0 -> 1.0.1), build, publish
//   npm run release -- minor "নতুন পেন"  -> minor bump with release notes
//   npm run release -- 1.2.0 "notes"     -> explicit version
//   npm run release -- --dry             -> build + zip into a temp folder only (no version bump, nothing published)
// Phones that already have the app download the new bundle automatically next time they open it (no new APK needed).
// A new APK is only needed when native things change (new plugin, icon, permissions...).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const AdmZip = require('adm-zip');

const root = path.resolve(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const rest = args.filter((a) => a !== '--dry');
const bump = rest[0] || 'patch';
const notes = rest[1] || '';

function next(v, kind) {
  if (/^\d+\.\d+\.\d+$/.test(kind)) return kind;
  const [a, b, c] = v.split('.').map(Number);
  if (kind === 'major') return `${a + 1}.0.0`;
  if (kind === 'minor') return `${a}.${b + 1}.0`;
  return `${a}.${b}.${c + 1}`;
}

const version = dry ? pkg.version : next(pkg.version, bump);
const outDir = dry ? fs.mkdtempSync(path.join(os.tmpdir(), 'pf-release-')) : path.resolve(root, '..', 'update');
fs.mkdirSync(outDir, { recursive: true });

if (!dry) { pkg.version = version; fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n'); }
console.log(`→ version ${version}${dry ? ' (dry run)' : ''}`);
execSync('npx vite build', { cwd: root, stdio: 'inherit' });

const zipName = `bundle-${version}.zip`;
const zip = new AdmZip();
zip.addLocalFolder(path.join(root, 'dist'));
zip.writeZip(path.join(outDir, zipName));

const latest = { version, url: zipName, notes, mandatory: false, date: new Date().toISOString() };
fs.writeFileSync(path.join(outDir, 'latest.json'), JSON.stringify(latest, null, 2));

// keep only the 5 newest bundles
const bundles = fs.readdirSync(outDir).filter((f) => /^bundle-.*\.zip$/.test(f)).sort((a, b) => fs.statSync(path.join(outDir, b)).mtimeMs - fs.statSync(path.join(outDir, a)).mtimeMs);
bundles.slice(5).forEach((f) => fs.unlinkSync(path.join(outDir, f)));

console.log(`✔ published ${zipName} (${(fs.statSync(path.join(outDir, zipName)).size / 1024 / 1024).toFixed(1)} MB) to ${outDir}`);
console.log(`  latest.json: ${JSON.stringify(latest)}`);
