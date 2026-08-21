// One-time cleanup: replaces "www.goingmorocco.com" with "goingmorocco.com"
// across every blog post, left over from the original Wix migration.
//
// Run from your project ROOT (not cms/):
//   node fix-www-links.mjs
//
// Reads/writes directly — no dependencies needed, just Node's built-in fs.

import fs from "node:fs/promises";
import path from "node:path";

const BLOG_DIRS = [
  path.join(process.cwd(), "src", "content", "blog", "en"),
  path.join(process.cwd(), "src", "content", "blog", "ar"),
];

async function main() {
  let filesChanged = 0;
  let totalReplacements = 0;

  for (const dir of BLOG_DIRS) {
    let files = [];
    try {
      files = (await fs.readdir(dir)).filter((f) => f.endsWith(".md") || f.endsWith(".mdx"));
    } catch {
      continue;
    }

    for (const file of files) {
      const filePath = path.join(dir, file);
      const content = await fs.readFile(filePath, "utf-8");

      const matches = content.match(/www\.goingmorocco\.com/g);
      if (!matches) continue;

      const updated = content.replaceAll("www.goingmorocco.com", "goingmorocco.com");
      await fs.writeFile(filePath, updated, "utf-8");

      console.log(`Fixed ${matches.length} link(s) in: ${file}`);
      filesChanged++;
      totalReplacements += matches.length;
    }
  }

  console.log(`\nDone. ${totalReplacements} link(s) fixed across ${filesChanged} file(s).`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
