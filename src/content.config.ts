import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// --- Locale -----------------------------------------------------------
// Every collection that has localized content carries an explicit `locale`
// field rather than relying solely on folder location. This keeps the data
// self-describing if files ever get moved, and lets utils/i18n.ts filter
// collections with a single `.filter(p => p.data.locale === locale)` call.
const locale = z.enum(["en", "ar"]);

// --- Blog posts ---------------------------------------------------------
// File layout: src/content/blog/en/*.md and src/content/blog/ar/*.md
//
// `translationId` is the field that links an English post to its Arabic
// translation (and vice versa). This mirrors the pairing convention already
// used in the Wix multilingual setup, so migrating existing posts later is a
// mechanical mapping exercise rather than a redesign: same translationId,
// same slug-shape, different locale.
const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: ({ image }) =>
    z.object({
      // No max() enforced here — title length is an SEO guideline (search
      // engines truncate display at ~70 chars) but shouldn't be a hard build
      // error that blocks publishing a real post. Use the validator in
      // wix-migrator to get advisory warnings without breaking the build.
      title: z.string(),
      // min(1) ensures the field is present and non-empty.
      // The SEO-guideline range (50–160 chars) is enforced as advisory
      // warnings by the wix-migrator validator, not as hard build errors.
      description: z.string().min(1),
      locale,
      // Stable id shared by an EN/AR post pair, e.g. "best-riads-marrakech".
      // Independent of the URL slug so the slug itself can be translated.
      // Optional: most posts don't have a translation yet (only paired
      // posts need this) -- this was previously declared as required,
      // which broke every untranslated migrated post.
      translationId: z.string().optional(),
      // URL slug, written in the post's own language/script.
      slug: z.string(),
      publishDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      author: z.string().default("Waleed Taklite"),
      category: z.string(), // references categories collection `id`
      tags: z.array(z.string()).default([]),
      // Accepts either a local file (processed by astro:assets) or a remote
      // URL string. Migrated posts initially keep their original Wix-hosted
      // image (no local optimization pipeline for 100+ images at once);
      // new posts should use a local file under ./images/ for full control
      // and automatic responsive/optimized output.
      featuredImage: z.union([image(), z.string().url()]),
      featuredImageAlt: z.string(),
      // Optional manual override; otherwise computed from word count at build time.
      readingTimeMinutes: z.number().int().positive().optional(),
      draft: z.boolean().default(false),
      // Set by the CMS's "Schedule" button; a daily GitHub Action flips
      // draft to false automatically once this date arrives.
      scheduledDate: z.string().nullable().optional(),
      featured: z.boolean().default(false),
    }),
});

// --- Categories ----------------------------------------------------------
// A small data collection (not Markdown bodies) so category landing pages
// have real, unique, localized copy for SEO instead of an auto-generated
// "Posts tagged X" stub — thin category pages are a common reason travel
// blogs lose rankings.
const categories = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/categories" }),
  schema: z.object({
    id: z.string(), // shared key across locales, e.g. "sahara-desert"
    locale,
    name: z.string(),
    description: z.string().min(50).max(160),
  }),
});

export const collections = { blog, categories };
