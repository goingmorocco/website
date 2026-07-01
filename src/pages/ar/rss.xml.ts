import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getCollection } from "astro:content";
import { sortByDateDesc } from "../../utils/posts";

export async function GET(context: APIContext) {
  const posts = await getCollection("blog", (p) => p.data.locale === "ar" && !p.data.draft);
  const sorted = sortByDateDesc(posts);

  return rss({
    title: "غوينغ موروكو — أدلة سفر إلى المغرب",
    description: "أدلة سفر عملية ومكتوبة محلياً عن المغرب: الصحراء، جبال الأطلس، والمدن العتيقة.",
    site: context.site ?? "https://goingmorocco.com",
    items: sorted.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publishDate,
      author: post.data.author,
      categories: [post.data.category, ...post.data.tags],
      link: `/ar/post/${post.data.slug}/`,
    })),
    customData: `<language>ar</language>`,
  });
}
