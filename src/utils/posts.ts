import type { CollectionEntry } from "astro:content";

type Post = CollectionEntry<"blog">;

/** Newest-first, the canonical sort order used everywhere posts are listed. */
export function sortByDateDesc(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf());
}

/**
 * Given the canonical (newest-first) sort order, "next" is the post
 * published after this one (newer / higher up the list) and "previous"
 * is the post published before it (older / lower down the list) —
 * matching how a reader scans a feed top to bottom.
 */
export function getAdjacentPosts(sorted: Post[], currentSlug: string) {
  const index = sorted.findIndex((p) => p.data.slug === currentSlug);
  return {
    next: index > 0 ? sorted[index - 1] : null,
    previous: index >= 0 && index < sorted.length - 1 ? sorted[index + 1] : null,
  };
}

/**
 * Related posts: same category first, then fills remaining slots with
 * posts sharing at least one tag, always excluding the current post.
 */
export function getRelatedPosts(all: Post[], current: Post, limit = 3): Post[] {
  const candidates = all.filter((p) => p.data.slug !== current.data.slug);

  const sameCategory = candidates.filter((p) => p.data.category === current.data.category);
  const sharedTags = candidates.filter(
    (p) =>
      p.data.category !== current.data.category &&
      p.data.tags.some((tag) => current.data.tags.includes(tag))
  );

  return [...sameCategory, ...sharedTags].slice(0, limit);
}
