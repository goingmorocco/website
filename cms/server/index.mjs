import express from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { PORT, UPLOADS_DIR, UPLOADS_URL_PREFIX, PROJECT_ROOT } from "./lib/config.mjs";
import * as posts from "./lib/posts.mjs";
import * as categories from "./lib/categories.mjs";
import * as git from "./lib/git.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ---------- Posts ----------

app.get("/api/posts", async (req, res) => {
  try {
    res.json(await posts.listPosts());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/posts/:locale/:file", async (req, res) => {
  try {
    const { locale, file } = req.params;
    res.json(await posts.readPost(locale, file));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/posts", async (req, res) => {
  try {
    const { locale, file, frontmatter, doc } = req.body;
    const existing = await posts.listPosts();
    const duplicate = existing.find((p) => p.locale === locale && p.slug === frontmatter.slug && p.file !== file);
    if (duplicate) {
      return res.status(409).json({ error: `Slug "${frontmatter.slug}" already exists for ${locale}.`, code: "DUPLICATE_SLUG" });
    }
    const result = await posts.writePost({ locale, file, frontmatter, doc });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/posts/:locale/:file", async (req, res) => {
  try {
    const { locale, file } = req.params;
    await posts.deletePost(locale, file);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/posts/:locale/:file/duplicate", async (req, res) => {
  try {
    const { locale, file } = req.params;
    res.json(await posts.duplicatePost(locale, file));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/translation-id", (req, res) => {
  res.json({ id: posts.generateTranslationId() });
});

// ---------- Categories ----------

app.get("/api/categories", async (req, res) => {
  try {
    res.json(await categories.listCategories());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/categories/:file", async (req, res) => {
  try {
    await categories.saveCategory(req.params.file, req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/categories/:file", async (req, res) => {
  try {
    await categories.deleteCategory(req.params.file);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Media / uploads ----------

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-");
    cb(null, `${Date.now()}-${safe}`);
  },
});
const upload = multer({ storage });

app.post("/api/media/upload", upload.array("files"), (req, res) => {
  const files = (req.files || []).map((f) => ({
    filename: f.filename,
    url: `${UPLOADS_URL_PREFIX}/${f.filename}`,
  }));
  res.json(files);
});

app.get("/api/media", async (req, res) => {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    const files = await fs.readdir(UPLOADS_DIR);
    res.json(files.map((f) => ({ filename: f, url: `${UPLOADS_URL_PREFIX}/${f}` })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/media/:filename", async (req, res) => {
  try {
    await fs.unlink(path.join(UPLOADS_DIR, req.params.filename));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve uploaded images directly too, so the CMS UI can preview them even
// before the Astro dev server picks them up.
app.use(UPLOADS_URL_PREFIX, express.static(UPLOADS_DIR));

// ---------- Git ----------

app.get("/api/git/status", async (req, res) => {
  try {
    res.json(await git.getStatus());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/git/commit", async (req, res) => {
  try {
    const { message, push } = req.body;
    res.json(await git.commitAndPush({ message, push }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- Serve the built client ----------

const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n  GoingMorocco CMS running at http://localhost:${PORT}\n`);
  console.log(`  Project root: ${PROJECT_ROOT}\n`);
});
