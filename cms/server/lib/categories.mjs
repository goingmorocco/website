import fs from "node:fs/promises";
import path from "node:path";
import { CATEGORIES_DIR } from "./config.mjs";

async function ensureDir() {
  await fs.mkdir(CATEGORIES_DIR, { recursive: true });
}

export async function listCategories() {
  await ensureDir();
  const files = (await fs.readdir(CATEGORIES_DIR)).filter((f) => f.endsWith(".json"));
  const results = [];
  for (const file of files) {
    const raw = await fs.readFile(path.join(CATEGORIES_DIR, file), "utf-8");
    results.push({ file, ...JSON.parse(raw) });
  }
  return results;
}

export async function saveCategory(file, data) {
  await ensureDir();
  await fs.writeFile(path.join(CATEGORIES_DIR, file), JSON.stringify(data, null, 2), "utf-8");
}

export async function deleteCategory(file) {
  await fs.unlink(path.join(CATEGORIES_DIR, file));
}
