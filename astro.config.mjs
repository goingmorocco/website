// @ts-check
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import tailwindcss from "@tailwindcss/vite";
import { createClient } from "@supabase/supabase-js";

// Update this once the custom domain is pointed at GitHub Pages.
const SITE_URL = "https://goingmorocco.com";

/*
  Forum threads live entirely in Supabase and are all served from the single
  shared /forum/thread/?slug=... template (src/pages/forum/thread/index.astro),
  not from individual static routes -- so @astrojs/sitemap, which only knows
  about pages that actually exist in the build output, has no way to
  discover them on its own and they were missing from the sitemap entirely.

  We fetch the live slugs here, at build time, using the same
  PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY env vars as
  src/utils/supabaseClient.ts, and hand the resulting URLs to the sitemap
  integration as customPages so each thread gets its own indexable <url>
  entry matching its real, self-referential canonical URL.

  NOTE: this currently lists every row in forum_threads with no
  moderation/visibility filter. If a status/hidden/deleted column gets
  added to that table, filter it out here too so unapproved or removed
  threads don't end up in the sitemap.
*/
const { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } = loadEnv(
  process.env.NODE_ENV ?? "production",
  process.cwd(),
  ""
);

async function getForumThreadSitemapUrls() {
  if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
    console.warn("[sitemap] Supabase env vars missing -- skipping forum threads in sitemap.");
    return [];
  }

  const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
  const { data, error } = await supabase.from("forum_threads").select("slug");

  if (error || !data) {
    console.warn("[sitemap] Couldn't fetch forum threads for sitemap:", error?.message);
    return [];
  }

  return data
    .filter((t) => !!t.slug)
    .map((t) => `${SITE_URL}/forum/thread/?slug=${encodeURIComponent(t.slug)}`);
}

const forumThreadUrls = await getForumThreadSitemapUrls();

export default defineConfig({
  site: SITE_URL,

  // Locked in now rather than left implicit: every internal link we generate
  // uses a trailing slash, so this guarantees the build always matches that
  // convention. One consistent URL form per page avoids duplicate-content
  // canonicalization issues later.
  trailingSlash: "always",

  // GitHub Pages + a custom domain serves from the domain root, so no `base` is needed.
  // If you ever deploy to <user>.github.io/<repo> WITHOUT a custom domain, set base: '/<repo>'.

  i18n: {
    defaultLocale: "en",
    locales: ["en", "ar"],
    routing: {
      // English stays at the root (goingmorocco.com/...) and Arabic is prefixed
      // (goingmorocco.com/ar/...), matching the URL structure you specified.
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },

  integrations: [
    mdx(),
    sitemap({
      // Astro's i18n-aware sitemap automatically emits <xhtml:link rel="alternate">
      // hreflang entries for en/ar pairs once pages are built — this is the single
      // biggest "free" SEO win of using Astro's built-in i18n routing over a
      // hand-rolled /en/ /ar/ folder structure.
      i18n: {
        defaultLocale: "en",
        locales: { en: "en-US", ar: "ar-MA" },
      },
      customPages: forumThreadUrls,
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
