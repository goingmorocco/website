import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TiptapEditor from "../editor/TiptapEditor";
import { api } from "../api";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph", content: [] }] };

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

export default function Editor() {
  const { locale: routeLocale, file: routeFile } = useParams();
  const isNew = !routeFile;
  const navigate = useNavigate();

  const [locale, setLocale] = useState<"en" | "ar">((routeLocale as "en" | "ar") || "en");
  const [file, setFile] = useState(routeFile || "");
  const [doc, setDoc] = useState<any>(EMPTY_DOC);
  const [frontmatter, setFrontmatter] = useState<any>({
    title: "",
    description: "",
    slug: "",
    locale: "en",
    publishDate: new Date().toISOString().slice(0, 10),
    author: "Waleed Taklite",
    category: "",
    tags: [],
    featuredImage: "",
    featuredImageAlt: "",
    draft: true,
    translationId: null,
  });
  const [categories, setCategories] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [createBoth, setCreateBoth] = useState(false);

  useEffect(() => {
    api.listCategories().then(setCategories);
    if (!isNew && routeLocale && routeFile) {
      api.readPost(routeLocale, routeFile).then(({ frontmatter, doc }) => {
        setFrontmatter(frontmatter);
        setDoc(doc);
        setLocale(routeLocale as "en" | "ar");
        setFile(routeFile);
      });
    }
  }, [routeLocale, routeFile]);

  function updateField(key: string, value: any) {
    setFrontmatter((f: any) => {
      const next = { ...f, [key]: value };
      if (key === "title" && (isNew || !f.slug)) {
        next.slug = slugify(value);
      }
      return next;
    });
  }

  async function handleFeaturedImageUpload(fileList: FileList | null) {
    if (!fileList?.length) return;
    const [uploaded] = await api.uploadMedia(fileList);
    updateField("featuredImage", uploaded.url);
  }

  function validate(): string[] {
    const warnings: string[] = [];
    if (!frontmatter.title) warnings.push("Missing title");
    if (!frontmatter.description) warnings.push("Missing description");
    if (!frontmatter.featuredImage) warnings.push("Missing featured image");
    if (!frontmatter.category) warnings.push("Missing category");
    return warnings;
  }

  async function handleSave(publish: boolean) {
    setSaving(true);
    setSaveMessage(null);
    try {
      const warnings = validate();
      if (warnings.length > 0) {
        const proceed = confirm(`Heads up:\n\n${warnings.join("\n")}\n\nSave anyway?`);
        if (!proceed) {
          setSaving(false);
          return;
        }
      }

      let translationId = frontmatter.translationId;
      if (!translationId && (createBoth || frontmatter.translationId === undefined)) {
        const { id } = await api.newTranslationId();
        translationId = id;
      }

      const fm = { ...frontmatter, locale, draft: !publish, translationId };
      const targetFile = file || `${fm.slug}.mdx`;

      await api.savePost({ locale, file: targetFile, frontmatter: fm, doc });
      setFile(targetFile);
      setFrontmatter(fm);
      setSaveMessage(publish ? "✅ Published." : "✅ Draft saved.");

      // If creating both languages at once, also create a stub in the other locale.
      if (isNew && createBoth) {
        const otherLocale = locale === "en" ? "ar" : "en";
        const otherFm = {
          ...fm,
          locale: otherLocale,
          title: fm.title, // placeholder — user should translate
          draft: true,
        };
        await api.savePost({ locale: otherLocale, file: targetFile, frontmatter: otherFm, doc: EMPTY_DOC });
      }
    } catch (err: any) {
      setSaveMessage(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper" dir={locale === "ar" ? "rtl" : "ltr"}>
      <header className="sticky top-0 z-10 border-b border-sand-light bg-white px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <button onClick={() => navigate("/")} className="text-sm text-ink/60 hover:text-royal">← Back to Dashboard</button>
          <div className="flex items-center gap-3">
            {saveMessage && <span className="text-sm text-ink/60">{saveMessage}</span>}
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as "en" | "ar")}
              className="rounded-lg border border-sand-light px-3 py-1.5 text-sm"
            >
              <option value="en">English</option>
              <option value="ar">Arabic</option>
            </select>
            <button onClick={() => handleSave(false)} disabled={saving} className="rounded-full border border-royal px-4 py-1.5 text-sm font-semibold text-royal hover:bg-royal hover:text-white disabled:opacity-50">
              Save Draft
            </button>
            <button onClick={() => handleSave(true)} disabled={saving} className="rounded-full bg-royal px-4 py-1.5 text-sm font-semibold text-white hover:bg-royal-dark disabled:opacity-50">
              Publish
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-3 gap-6 px-6 py-8">
        <div className="col-span-2">
          <input
            value={frontmatter.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder="Post title"
            className="mb-4 w-full border-b border-sand-light bg-transparent pb-2 text-3xl font-semibold text-ink outline-none focus:border-royal"
          />
          <TiptapEditor content={doc} onChange={setDoc} />
        </div>

        <aside className="space-y-5">
          {isNew && (
            <div className="rounded-xl border border-sand-light bg-white p-4">
              <label className="flex items-center gap-2 text-sm text-ink/70">
                <input type="checkbox" checked={createBoth} onChange={(e) => setCreateBoth(e.target.checked)} />
                Also create the other language (linked automatically)
              </label>
            </div>
          )}

          <div className="rounded-xl border border-sand-light bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-ink">Details</h3>
            <label className="mb-1 block text-xs text-ink/60">Slug</label>
            <input value={frontmatter.slug} onChange={(e) => updateField("slug", e.target.value)} className="mb-3 w-full rounded border border-sand-light px-2 py-1.5 text-sm" />
            <label className="mb-1 block text-xs text-ink/60">Description</label>
            <textarea value={frontmatter.description} onChange={(e) => updateField("description", e.target.value)} rows={3} className="mb-3 w-full rounded border border-sand-light px-2 py-1.5 text-sm" />
            <label className="mb-1 block text-xs text-ink/60">Category</label>
            <select value={frontmatter.category || ""} onChange={(e) => updateField("category", e.target.value)} className="mb-3 w-full rounded border border-sand-light px-2 py-1.5 text-sm">
              <option value="">— none —</option>
              {categories.filter((c) => c.locale === locale || !c.locale).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <label className="mb-1 block text-xs text-ink/60">Tags (comma separated)</label>
            <input
              value={(frontmatter.tags || []).join(", ")}
              onChange={(e) => updateField("tags", e.target.value.split(",").map((t: string) => t.trim()).filter(Boolean))}
              className="mb-3 w-full rounded border border-sand-light px-2 py-1.5 text-sm"
            />
            <label className="mb-1 block text-xs text-ink/60">Publish date</label>
            <input type="date" value={frontmatter.publishDate} onChange={(e) => updateField("publishDate", e.target.value)} className="w-full rounded border border-sand-light px-2 py-1.5 text-sm" />
          </div>

          <div className="rounded-xl border border-sand-light bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-ink">Featured Image</h3>
            {frontmatter.featuredImage && (
              <img src={frontmatter.featuredImage} alt="" className="mb-2 h-32 w-full rounded object-cover" />
            )}
            <label className="block cursor-pointer rounded-full border border-royal px-3 py-1.5 text-center text-xs font-semibold text-royal hover:bg-royal hover:text-white">
              {frontmatter.featuredImage ? "Replace image" : "Upload image"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFeaturedImageUpload(e.target.files)} />
            </label>
            <input
              value={frontmatter.featuredImageAlt || ""}
              onChange={(e) => updateField("featuredImageAlt", e.target.value)}
              placeholder="Alt text"
              className="mt-2 w-full rounded border border-sand-light px-2 py-1.5 text-sm"
            />
          </div>
        </aside>
      </main>
    </div>
  );
}
