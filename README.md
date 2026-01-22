# Secrets of Decoupage PWA – Frontend (Netlify static)

This repo is configured for a **static deploy** on Netlify:
- Netlify publishes the **`dist/`** folder.
- Netlify **skips the build** (so you don’t hit `npm ci` / lockfile errors).

## 1) Configure (required)
Edit: `dist/config.js`

Set these values:
- `window.__CONFIG__.API_URL` – your backend (Render), e.g. `https://secrets-backend-67g2.onrender.com`
- `window.__CONFIG__.SHOP_URL` – your main Shopify store, e.g. `https://www.thesecretsofdecoupage.com`
- `window.__CONFIG__.ARTCLIPSTICK_URL` – your sticker shop, e.g. `https://artclipstick.com`

VIP links (put FULL Shopify product URLs):
- `window.__CONFIG__.VIP_DIGITAL_URL` – VIP Digital product link
- `window.__CONFIG__.VIP_PRINT_PACK_URL` – VIP Print Pack product link
- `window.__CONFIG__.PRO_STUDIO_URL` – PRO Studio product link

Optional:
- `window.__CONFIG__.VIP_PAGE_URL` – a page that explains VIP perks (if you have one)

## 2) Netlify settings
This repo includes `netlify.toml`:
- publish: `dist`
- command: `echo 'skip build'`

So Netlify will deploy instantly.

## 3) Pushing to GitHub
If you downloaded this as a ZIP and want to push it to a new repo:

```bash
git init
git add .
git commit -m "frontend: netlify-ready static build"
git branch -M main
git remote add origin https://github.com/<YOUR_USER>/<YOUR_REPO>.git
git push -u origin main
```

Then in Netlify: **Connect to Git provider** → pick this repo → deploy.
