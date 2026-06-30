import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getCollection } from "astro:content";
import { sortByDateDesc } from "../utils/posts";

export async function GET(context: APIContext) {
  const posts = await getCollection("blog", (p) => p.data.locale === "en" && !p.data.draft);
  const sorted = sortByDateDesc(posts);

  return rss({
    title: "GoingMorocco — Morocco Travel Guides",
    description: "Practical, locally-written Morocco travel guides: the Sahara, the Atlas Mountains, the medinas, and trip planning.",
    site: context.site ?? "https://goingmorocco.com",
    items: sorted.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publishDate,
      author: post.data.author,
      categories: [post.data.category, ...post.data.tags],
      link: `/blog/${post.data.slug}/`,
    })),
    customData: `<language>en-us</language>`,
  });
}
