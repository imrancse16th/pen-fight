import { defineConfig } from 'vite';
import fs from 'node:fs';
const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __BUILD__: JSON.stringify(Date.now()) },   // new number on every build: the browser never reuses old sound files
  build: { chunkSizeWarningLimit: 2000 },
});
