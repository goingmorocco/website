// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// Update this once the custom domain is pointed at GitHub Pages.
const SITE_URL = "https://goingmorocco.com";

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
    sitemap({
      // Astro's i18n-aware sitemap automatically emits <xhtml:link rel="alternate">
      // hreflang entries for en/ar pairs once pages are built — this is the single
      // biggest "free" SEO win of using Astro's built-in i18n routing over a
      // hand-rolled /en/ /ar/ folder structure.
      i18n: {
        defaultLocale: "en",
        locales: { en: "en-US", ar: "ar-MA" },
      },
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
