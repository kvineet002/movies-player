
# TMDB Movie & Series Finder (Vidlink Player)

Single-page app to search movies/series via TMDB, play movies from Vidlink in a modal, and browse popular/recommended items.

## Local setup

```bash
npm i
cp .env.example .env   # put your TMDB key here
npm run dev
```

## Build & Deploy

```bash
npm run build
# Deploy the dist/ folder to Netlify/Vercel/Cloudflare Pages
```

### Vercel / Netlify Env Var

- `VITE_TMDB_API_KEY` = your TMDB key

> This product uses the TMDB API but is not endorsed or certified by TMDB.
