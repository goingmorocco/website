import type { APIContext } from "astro";
import { getCollection } from "astro:content";
import { localizedPath } from "../utils/i18n";

/**
 * One combined index for both locales, filterable client-side by `locale`.
 * Kept deliberately simple (title/description/url/category/tags) rather than
 * full body text — that's exactly the shape a lightweight client search
 * (Fuse.js, etc.) needs. For full-text search across post bodies, Pagefind
 * (https://pagefind.app) is the better fit for a static Astro/GitHub Pages
 * site: it indexes the built HTML as a postbuild step and ships its own
 * search UI with zero impact on the main bundle. That's a Step 6 decision,
 * not built here — this endpoint is the groundwork either approach can use.
 */
export async function GET(_context: APIContext) {
  const posts = await getCollection("blog", (p) => !p.data.draft);

  const index = posts.map((post) => ({
    title: post.data.title,
    description: post.data.description,
    url: localizedPath(post.data.locale, `/blog/${post.data.slug}/`),
    locale: post.data.locale,
    category: post.data.category,
    tags: post.data.tags,
  }));

  return new Response(JSON.stringify(index), {
    headers: { "Content-Type": "application/json" },
  });
}
