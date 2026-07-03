import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// This cms/ folder lives at the root of the Astro project, so the project
// root is one level up.
export const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

export const BLOG_DIR = {
  en: path.join(PROJECT_ROOT, "src", "content", "blog", "en"),
  ar: path.join(PROJECT_ROOT, "src", "content", "blog", "ar"),
};

export const CATEGORIES_DIR = path.join(PROJECT_ROOT, "src", "content", "categories");

// Uploaded images go into public/images/uploads so Astro serves them as
// static assets at /images/uploads/<file> with zero extra config.
export const UPLOADS_DIR = path.join(PROJECT_ROOT, "public", "images", "uploads");
export const UPLOADS_URL_PREFIX = "/images/uploads";

export const PORT = process.env.CMS_PORT || 4321 + 1000; // 5321, avoids clashing with astro dev on 4321
