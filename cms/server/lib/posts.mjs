import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { v4 as uuidv4 } from "uuid";
import { BLOG_DIR } from "./config.mjs";
import { docToMdx, mdxToDoc } from "./mdxConvert.mjs";

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function slugToFilename(slug) {
  return `${slug}.mdx`;
}

export async function listPosts() {
  const results = [];
  for (const locale of ["en", "ar"]) {
    await ensureDir(BLOG_DIR[locale]);
    const files = (await fs.readdir(BLOG_DIR[locale])).filter((f) => f.endsWith(".md") || f.endsWith(".mdx"));
    for (const file of files) {
      const raw = await fs.readFile(path.join(BLOG_DIR[locale], file), "utf-8");
      const { data } = matter(raw);
      results.push({
        id: `${locale}/${file}`,
        locale,
        file,
        title: data.title ?? "(untitled)",
        slug: data.slug ?? file.replace(/\.mdx?$/, ""),
        category: data.category ?? null,
        tags: data.tags ?? [],
        status: data.draft ? "draft" : data.scheduledDate ? "scheduled" : "published",
        publishDate: data.publishDate ?? null,
        featuredImage: data.featuredImage ?? null,
        translationId: data.translationId ?? null,
        author: data.author ?? null,
      });
    }
  }
  return results;
}

export async function readPost(locale, file) {
  const filePath = path.join(BLOG_DIR[locale], file);
  const raw = await fs.readFile(filePath, "utf-8");
  const { data, content } = matter(raw);
  // Strip leading MDX import lines before parsing body content — they're
  // regenerated automatically on save based on which components are used.
  const bodyWithoutImports = content.replace(/^import .+ from ".+";\n?/gm, "").trim();
  const doc = await mdxToDoc(bodyWithoutImports);
  return { frontmatter: data, doc };
}

export async function writePost({ locale, file, frontmatter, doc }) {
  await ensureDir(BLOG_DIR[locale]);
  const { body, imports } = docToMdx(doc);

  const fmLines = ["---"];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      fmLines.push(`${key}: ${JSON.stringify(value)}`);
    } else if (typeof value === "boolean" || typeof value === "number") {
      fmLines.push(`${key}: ${value}`);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
      fmLines.push(`${key}: ${value}`); // dates unquoted, matches existing file style
    } else {
      fmLines.push(`${key}: "${String(value).replace(/"/g, '\\"')}"`);
    }
  }
  fmLines.push("---");

  const fileContent = `${fmLines.join("\n")}\n\n${imports}${imports ? "\n\n" : ""}${body}`;
  const filePath = path.join(BLOG_DIR[locale], file);
  await fs.writeFile(filePath, fileContent, "utf-8");
  return { path: filePath };
}

export async function deletePost(locale, file) {
  await fs.unlink(path.join(BLOG_DIR[locale], file));
}

export async function duplicatePost(locale, file) {
  const { frontmatter, doc } = await readPost(locale, file);
  const newSlug = `${frontmatter.slug || file.replace(/\.mdx?$/, "")}-copy`;
  const newFrontmatter = { ...frontmatter, slug: newSlug, title: `${frontmatter.title} (Copy)`, translationId: undefined };
  const newFile = slugToFilename(newSlug);
  await writePost({ locale, file: newFile, frontmatter: newFrontmatter, doc });
  return { locale, file: newFile };
}

export function generateTranslationId() {
  return uuidv4();
}

export { slugToFilename };
