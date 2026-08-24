// Run periodically via GitHub Actions (see promote-forum-posts.yml).
// Finds forum threads old enough to have cleared the moderation window and
// haven't been promoted yet, converts each into a real .mdx file (same
// static-page treatment as your blog posts), and marks them as promoted so
// they're never processed twice.

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY;

// How long a post must sit live before it's eligible for promotion — gives
// you a real window to catch and delete anything bad before it becomes a
// permanent, git-committed static page. Adjust as needed.
const DELAY_HOURS = 48;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function main() {
  const cutoff = new Date(Date.now() - DELAY_HOURS * 60 * 60 * 1000).toISOString();

  const { data: threads, error } = await supabase
    .from("forum_threads")
    .select(
      "id, slug, title, body, cover_image_url, preview_title, preview_description, created_at, profiles(username, display_name), forum_categories(slug)"
    )
    .is("promoted_at", null)
    .lt("created_at", cutoff);

  if (error) {
    console.error("Failed to fetch threads:", error.message);
    process.exit(1);
  }

  if (!threads || threads.length === 0) {
    console.log("No forum posts ready to promote.");
    return;
  }

  const outputDir = path.join(process.cwd(), "src", "content", "forum-posts");
  await fs.mkdir(outputDir, { recursive: true });

  const promotedIds = [];

  for (const thread of threads) {
    const author = thread.profiles?.display_name || thread.profiles?.username || "GoingMorocco Member";
    const category = thread.forum_categories?.slug || "general";
    const description = (thread.preview_description || stripHtml(thread.body).slice(0, 155)).replace(/"/g, '\\"');
    const title = (thread.preview_title || thread.title).replace(/"/g, '\\"');
    const publishDate = thread.created_at.slice(0, 10);

    const frontmatter = [
      "---",
      `title: "${title}"`,
      `description: "${description}"`,
      `slug: "${thread.slug}"`,
      `publishDate: ${publishDate}`,
      `author: "${author.replace(/"/g, '\\"')}"`,
      `category: "${category}"`,
      `featuredImage: "${thread.cover_image_url ?? ""}"`,
      `threadId: "${thread.id}"`,
      "---",
    ].join("\n");

    // The stored body is already-sanitized HTML — MDX supports raw HTML
    // natively, so it goes in as-is, no conversion needed.
    const fileContent = `${frontmatter}\n\n${thread.body}\n`;
    const filePath = path.join(outputDir, `${thread.slug}.mdx`);
    await fs.writeFile(filePath, fileContent, "utf-8");

    console.log(`Promoted: ${thread.slug}`);
    promotedIds.push(thread.id);
  }

  const { error: updateError } = await supabase
    .from("forum_threads")
    .update({ promoted_at: new Date().toISOString() })
    .in("id", promotedIds);

  if (updateError) {
    console.error("Warning: failed to mark threads as promoted:", updateError.message);
  }

  console.log(`\nDone. ${promotedIds.length} post(s) promoted.`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
