// One-time fix: some posts ended up in the wrong locale folder during a
// manual copy step. This reads each post's real `locale:` frontmatter field
// and moves the file into the matching folder if it's misplaced.
//
// Run from the cms/ folder (reuses its already-installed gray-matter):
//   node fix-locale-folders.mjs

import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

const PROJECT_ROOT = path.resolve(process.cwd(), "..");
const BLOG_DIR = {
  en: path.join(PROJECT_ROOT, "src", "content", "blog", "en"),
  ar: path.join(PROJECT_ROOT, "src", "content", "blog", "ar"),
};

async function main() {
  let moved = 0;
  for (const folderLocale of ["en", "ar"]) {
    const dir = BLOG_DIR[folderLocale];
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".md") || f.endsWith(".mdx"));

    for (const file of files) {
      const filePath = path.join(dir, file);
      const raw = await fs.readFile(filePath, "utf-8");
      const { data } = matter(raw);
      const realLocale = data.locale === "ar" ? "ar" : "en";

      if (realLocale !== folderLocale) {
        const destPath = path.join(BLOG_DIR[realLocale], file);
        await fs.rename(filePath, destPath);
        console.log(`Moved: ${folderLocale}/${file}  →  ${realLocale}/${file}`);
        moved++;
      }
    }
  }
  console.log(`\n✅ Done. ${moved} file(s) moved to their correct folder.`);
}

main().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
