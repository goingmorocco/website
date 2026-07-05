// Run daily by .github/workflows/publish-scheduled.yml. Scans all blog posts
// for ones marked draft:true with a scheduledDate that has now arrived, and
// flips them to draft:false so the next site build makes them live.

import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const BLOG_DIRS = [
  path.join(process.cwd(), "src", "content", "blog", "en"),
  path.join(process.cwd(), "src", "content", "blog", "ar"),
];

const today = new Date().toISOString().slice(0, 10);

async function main() {
  let published = 0;

  for (const dir of BLOG_DIRS) {
    let files = [];
    try {
      files = (await fs.readdir(dir)).filter((f) => f.endsWith(".md") || f.endsWith(".mdx"));
    } catch {
      continue; // folder might not exist, skip
    }

    for (const file of files) {
      const filePath = path.join(dir, file);
      const raw = await fs.readFile(filePath, "utf-8");
      const { data, content } = matter(raw);

      if (data.draft && data.scheduledDate && data.scheduledDate <= today) {
        data.draft = false;
        const updated = matter.stringify(content, data);
        await fs.writeFile(filePath, updated, "utf-8");
        console.log(`Published: ${file} (was scheduled for ${data.scheduledDate})`);
        published++;
      }
    }
  }

  console.log(`\nDone. ${published} post(s) published.`);
  // Exit code 0 either way — "nothing to publish today" is a normal outcome.
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
