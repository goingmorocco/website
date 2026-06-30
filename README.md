# GoingMorocco — Astro rebuild

**Status:** Step 1 of 6 complete — project scaffold, i18n routing, and content schema.

## What's in this step

- Real Astro 7 project (via the official `create-astro` CLI, not hand-written configs) with TypeScript strict mode.
- Tailwind CSS v4 wired in via the official Vite plugin (`@tailwindcss/vite`) — this is the current recommended setup, replacing the older `@astrojs/tailwind` integration.
- **i18n routing**: English at the root (`/`), Arabic under `/ar/` (`/ar/...`), configured in `astro.config.mjs` via Astro's native `i18n` routing (no manual redirect logic needed).
- **Content collections** (`src/content.config.ts`) for `blog` posts and `categories`, using the Content Layer API (`glob()` loader) with a strict Zod schema.
- `@astrojs/sitemap` configured with `i18n` mapping, so the generated sitemap automatically includes correct `hreflang` alternate links between the English and Arabic version of every page — verified in the build output.
- Design tokens (palette + type roles) defined once in `src/styles/global.css` via Tailwind v4's `@theme`, so Step 2 (layout + components) draws from a single source instead of re-deciding colors per component.
- GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds and deploys to GitHub Pages on every push to `main`.
- `public/CNAME` set to `goingmorocco.com` for the custom domain.

## Why these specific choices

**English at `/`, not `/en/`.** You asked for `/ar/...` explicitly but didn't ask for an `/en/` prefix — keeping the default locale unprefixed is both what you specified and slightly better for SEO continuity if you're moving from a site where English pages currently live at the root.

**`translationId` instead of folder-only pairing.** Each blog post has a `translationId` shared between its English and Arabic version (e.g. both halves of "best time to visit the Sahara" share `best-time-sahara-desert`), independent of the URL slug. This means the Arabic slug can be a real Arabic phrase (better for Arabic SEO) rather than a transliteration of the English slug, while still letting templates reliably find "the other-language version of this post" for the language switcher and hreflang tags.

**Logical CSS properties (`ps-`, `pe-`, `ms-`, `me-`) instead of `pl-`/`pr-`.** This is what lets the *same* component markup flip correctly between LTR English and RTL Arabic with zero RTL-specific component variants — set once in Step 1's CSS conventions so it doesn't need retrofitting later.

**Categories as a small JSON data collection, not auto-generated tag pages.** Thin, auto-generated "posts tagged X" pages are a common reason content sites lose category-page rankings. Giving each category real, localized description copy (50–160 characters, written for both `en` and `ar`) means category pages have unique, indexable content from day one.

## Validating this step

\`\`\`bash
npm install
npm run build
\`\`\`

Two pages should build (\`/\` and \`/ar/\`), each listing the one sample post from its locale, and \`dist/sitemap-0.xml\` should contain both URLs with \`hreflang\` alternates pointing at each other.

## Next steps (per the agreed plan)

1. ~~Project structure + i18n + content schema~~ ✅
2. ~~Layout + components~~ ✅
3. ~~Blog system~~ ✅
4. ~~SEO layer~~ ✅
5. ~~Remaining pages~~ ✅
6. ~~Performance + accessibility pass~~ ✅

## Step 6: performance + accessibility

**Real bug found and fixed:** the design tokens referenced font names (Fraunces, Inter, Markazi Text, Noto Sans Arabic) that were never actually loaded anywhere — every page had been silently falling back to default serif/sans-serif. Fixed by self-hosting all four as variable fonts via `@fontsource-variable` (one file per family instead of one per weight, `font-display: swap` by default, and each family's CSS is split into per-script `@font-face` blocks by `unicode-range` — an English page never downloads the Arabic subset and vice versa, automatically, with no extra config).

**Also found and fixed:** the gold accent color (`sand-dark`, used for category labels and small uppercase text) only hit ~3.4:1 contrast against the page background — fails WCAG AA's 4.5:1 for normal text. Added a darker `gold-text` token (~4.7:1, computed and verified) for every place gold is used as *readable text*; the original `sand-dark` stays as-is for decorative use (dividers, dots) where contrast rules don't apply.

**Verified, not assumed:** ran an automated accessibility audit (`npm run audit:a11y`, using axe-core against the actual built HTML via jsdom) across all 19 pages against WCAG 2A/2AA rules. It caught one real issue — the spam-prevention honeypot field on the contact form had no accessible label — fixed with `aria-hidden`, then re-ran to confirm zero violations across every page.

**Measured page weight** (no Lighthouse available in this environment, so measured directly): zero external JavaScript files anywhere in the build — the only script on any page is an inlined ~600-byte mobile-menu toggle. Pages are 12–16KB of HTML. One shared ~36KB CSS file (cached across every page after the first load). Sitemap contains all 18 indexable pages; the 404 page is correctly excluded.

**Added:** a global `focus-visible` outline on every link/button/input (previously only added by hand on some components — now guaranteed everywhere) and a `prefers-reduced-motion` guard.

**Honest gaps, not hidden:** I could not run real Lighthouse/Core Web Vitals scoring in this sandbox (no headless browser available, and the relevant Chrome-download domains aren't on the network allowlist). Run `npx lighthouse` yourself against a deployed preview (or `npm run build && npx serve dist` locally) before launch to get real Performance/SEO/Accessibility scores — the architecture here (static HTML, near-zero JS, self-hosted subsetted fonts, optimized WebP images) is built to score well, but I haven't seen an actual Lighthouse number.
