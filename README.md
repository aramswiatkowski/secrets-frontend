# Secrets of Decoupage PWA (Netlify-ready)

This repo is a **static** Netlify deploy (no build step).  
Netlify uses `dist/` as the publish directory (see `netlify.toml`).

## Backend
API URL is set in `dist/config.js`:
https://secrets-backend-67g2.onrender.com

## If you still see an old layout
Clear site data / uninstall & reinstall the PWA (service worker cache).
