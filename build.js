// Minimal build for Netlify: copy static app files into ./dist
// No dependencies.
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

function rm(dir){
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    const st = fs.lstatSync(p);
    if (st.isDirectory()) rm(p);
    else fs.unlinkSync(p);
  }
  fs.rmdirSync(dir);
}

function copy(src, dest){
  const st = fs.lstatSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      if (entry === 'dist' || entry === 'node_modules' || entry === '.git') continue;
      if (entry === 'build.js' || entry === 'package-lock.json') {
        // do not ship build tooling
        continue;
      }
      copy(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

try {
  rm(DIST);
} catch (e) {}
fs.mkdirSync(DIST, { recursive: true });
copy(ROOT, DIST);

// Generate runtime config (Netlify build env -> browser)
const apiUrl = process.env.VITE_API_URL || "";
const configJs = `window.__CONFIG__ = window.__CONFIG__ || {};\nwindow.__CONFIG__.API_URL = ${JSON.stringify(apiUrl)};\n`;
fs.writeFileSync(path.join(DIST, 'config.js'), configJs, 'utf8');

console.log('Built dist/');
