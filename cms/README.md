# GoingMorocco CMS — Phase 1

A local visual editor + dashboard for managing your Astro blog posts, so you
don't have to hand-edit MDX files. Runs on your own machine, writes directly
into your repo, and can commit + push to GitHub for you.

## What's included in this phase

- Dashboard: list, search, filter (language / category / status), delete, duplicate
- Visual editor: bold/italic/underline, H1-H3, bullet/numbered lists, quotes,
  code blocks, tables, links, images (drag-and-drop upload)
- Your 3 custom components (CTA Button, Gallery, HTML Embed) as real editable
  blocks in the editor — insert, edit, remove, matches your Astro components exactly
- English/Arabic support, with linked translations via `translationId`, RTL editing
- Featured image upload
- Media library (basic — upload/list/delete)
- "Commit & Push" button — stages, commits, and pushes to GitHub directly

## Not in this phase yet (coming next)

- SEO scoring panel
- Live responsive (desktop/tablet/mobile) preview
- Image cropping
- Scheduled publishing (the field exists in the data model, no UI yet)
- Category create/rename/delete UI (backend API exists, no UI panel yet)
- AI assistant (skipped per your note — needs an API)

## Setup

1. Unzip this `cms/` folder into the **root of your Astro project** (same
   level as `src/`, `package.json`, `astro.config.mjs`).

2. Install the backend:
   ```
   cd cms
   npm install
   ```

3. Install the frontend:
   ```
   cd client
   npm install
   cd ..
   ```

## Running it (development)

You'll run two things at once — the backend API and the frontend dev server.

**Terminal 1** (from `cms/`):
```
npm run cms
```
This starts the backend at `http://localhost:5321`.

**Terminal 2** (from `cms/`):
```
npm run cms:client:dev
```
This starts the editor UI at `http://localhost:5173` — open that in your
browser. It automatically talks to the backend on 5321.

## Running it (simpler, single command)

Once you've confirmed it works, build the frontend once and let the backend
serve it, so you only run one command per session:

```
npm run cms:client:build
npm run cms
```
Then open `http://localhost:5321` — that's the whole CMS, one URL.

## Important notes

- **This is Phase 1** — I built and reasoned through this carefully, but
  couldn't actually run `npm install` / test-execute it myself (no network
  access in my environment). Expect a debugging round similar to the Wix
  export scripts — paste me whatever error comes up and I'll fix it fast.
- Uploaded images go to `public/images/uploads/` — Astro will serve them
  automatically, no config needed.
- "Commit & Push" runs real git commands (`git add .`, `git commit`, `git push`)
  against your actual repo. Make sure your repo is in a clean state you're
  comfortable with before your first test commit.
- The editor's underline formatting round-trips imperfectly when re-opening
  an existing post with underlined text (rare in your content) — flagging
  this now as a known rough edge rather than something to debug blind later.
