// Small, focused frontmatter parser — not a full YAML library, but handles
// exactly the value shapes your blog posts actually use: quoted strings,
// plain dates/booleans/numbers, and simple arrays. Good enough because we
// fully control this format (both the original migration schema and the
// admin editor's own output use only these simple shapes).
//
// Any field not explicitly recognized by the edit form (translationId,
// updatedDate, featured, readingTimeMinutes, scheduledDate, etc. from
// Wix-migrated posts) is kept as-is in `extra`, so editing a post never
// silently drops data the form doesn't have a field for.

export interface ParsedPost {
  frontmatter: Record<string, string>;
  extra: Record<string, string>;
  body: string;
}

const KNOWN_FIELDS = [
  "title", "description", "locale", "slug", "publishDate", "author",
  "category", "tags", "featuredImage", "featuredImageAlt", "draft",
];

export function parseFrontmatter(raw: string): ParsedPost {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, extra: {}, body: raw };
  }

  const [, frontmatterBlock, body] = match;
  const frontmatter: Record<string, string> = {};
  const extra: Record<string, string> = {};

  for (const line of frontmatterBlock.split(/\r?\n/)) {
    const lineMatch = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (!lineMatch) continue;
    const [, key, rawValue] = lineMatch;

    // Strip surrounding quotes for the fields the form actually edits —
    // arrays (tags) and unquoted values (dates, booleans) pass through as-is.
    const isQuotedString = /^".*"$/.test(rawValue);
    const value = isQuotedString ? rawValue.slice(1, -1).replace(/\\"/g, '"') : rawValue;

    if (KNOWN_FIELDS.includes(key)) {
      frontmatter[key] = value;
    } else {
      extra[key] = rawValue; // keep raw (unparsed) so it round-trips exactly
    }
  }

  return { frontmatter, extra, body: body.trim() };
}

export function parseTagsArray(rawTags: string | undefined): string[] {
  if (!rawTags) return [];
  try {
    return JSON.parse(rawTags.replace(/'/g, '"'));
  } catch {
    return [];
  }
}
