# Android / Termux workflow

```bash
pkg update
pkg upgrade
pkg install git nodejs-lts
git clone https://github.com/Neclonesoul/sa-public-api-observatory.git
cd sa-public-api-observatory
npm ci
npm run validate:catalogue
npm run typecheck
npm test
```

Use GitHub Actions for Cloudflare deployment when Wrangler's native runtime is unavailable on Android. Catalogue and documentation work requires no desktop computer. Push a branch, open a pull request and wait for validation. Production deploys occur from reviewed `main`; D1 migrations run before Worker rollout.
