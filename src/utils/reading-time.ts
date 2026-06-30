/**
 * Estimates reading time from raw Markdown body text.
 * Arabic readers typically read slightly slower in WPM terms than Latin-script
 * readers for unvocalized text, so we use a lower words-per-minute baseline
 * for `ar` content. Strips Markdown syntax first so code blocks, link
 * brackets, and heading hashes don't inflate the word count.
 */
export function getReadingTime(rawBody: string, locale: "en" | "ar" = "en"): number {
  const stripped = rawBody
    .replace(/```[\s\S]*?```/g, "") // fenced code blocks
    .replace(/`[^`]*`/g, "") // inline code
    .replace(/!\[.*?\]\(.*?\)/g, "") // images
    .replace(/\[(.*?)\]\(.*?\)/g, "$1") // links -> link text
    .replace(/[#>*_~-]/g, "") // markdown punctuation
    .trim();

  const wordCount = stripped.split(/\s+/).filter(Boolean).length;
  const wordsPerMinute = locale === "ar" ? 180 : 225;

  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}
