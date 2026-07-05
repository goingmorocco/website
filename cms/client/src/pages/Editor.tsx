import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TiptapEditor from "../editor/TiptapEditor";
import ImageCropModal from "../editor/ImageCropModal";
import PreviewPanel from "../editor/PreviewPanel";
import SeoPanel from "../editor/SeoPanel";
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
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [focusKeyword, setFocusKeyword] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [status, setStatus] = useState<"draft" | "published" | "scheduled">("draft");
  const [scheduledDate, setScheduledDate] = useState("");

  useEffect(() => {
    api.listCategories().then(setCategories);
    api.listPosts().then(setAllPosts);
    if (!isNew && routeLocale && routeFile) {
      api.readPost(routeLocale, routeFile).then(({ frontmatter, doc }) => {
        setFrontmatter(frontmatter);
        setDoc(doc);
        setLocale(routeLocale as "en" | "ar");
        setFile(routeFile);
        if (frontmatter.scheduledDate) {
          setStatus("scheduled");
          setScheduledDate(frontmatter.scheduledDate);
        } else {
          setStatus(frontmatter.draft ? "draft" : "published");
        }
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

  function handleFeaturedImageSelect(fileList: FileList | null) {
    if (!fileList?.length) return;
    setCropFile(fileList[0]);
  }

  async function handleCropConfirmed(blob: Blob) {
    const uploaded = await api.uploadMediaBlob(blob, cropFile?.name || "featured.jpg");
    updateField("featuredImage", uploaded.url);
    setCropFile(null);
  }

  function extractInternalLinks(node: any, links: string[] = []): string[] {
    (node.marks ?? []).forEach((m: any) => {
      if (m.type === "link" && m.attrs?.href?.startsWith("/")) links.push(m.attrs.href);
    });
    (node.content ?? []).forEach((child: any) => extractInternalLinks(child, links));
    return links;
  }

  function validate(): string[] {
    const warnings: string[] = [];
    if (!frontmatter.title) warnings.push("Missing title");
    if (!frontmatter.description) warnings.push("Missing description");
    if (!frontmatter.featuredImage) warnings.push("Missing featured image");
    if (!frontmatter.category) warnings.push("Missing category");

    // Broken internal links — check each /post/slug/ link against known posts
    const knownPaths = new Set(allPosts.map((p) => `/${p.locale === "ar" ? "ar/post" : "post"}/${p.slug}/`));
    const internalLinks = extractInternalLinks(doc);
    const broken = internalLinks.filter((href) => href.startsWith("/post/") || href.startsWith("/ar/post/")).filter((href) => !knownPaths.has(href));
    if (broken.length > 0) warnings.push(`Broken internal link(s): ${broken.join(", ")}`);

    // Missing translation — if this post has a translationId, check the sibling exists
    if (frontmatter.translationId) {
      const otherLocale = locale === "en" ? "ar" : "en";
      const hasSibling = allPosts.some((p) => p.locale === otherLocale && p.translationId === frontmatter.translationId);
      if (!hasSibling) warnings.push(`No ${otherLocale.toUpperCase()} translation linked yet (translationId is set but no matching post found)`);
    }

    return warnings;
  }

  async function handleSave(targetStatus: "draft" | "published" | "scheduled") {
    setSaving(true);
    setSaveMessage(null);
    try {
      if (targetStatus === "scheduled" && !scheduledDate) {
        alert("Pick a scheduled date first.");
        setSaving(false);
        return;
      }

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

      // Scheduled posts stay draft:true on disk (so nothing else treats them
      // as live) plus a scheduledDate the GitHub Action checks daily to
      // auto-flip them to published and push, once that date arrives.
      const fm = {
        ...frontmatter,
        locale,
        draft: targetStatus !== "published",
        scheduledDate: targetStatus === "scheduled" ? scheduledDate : null,
        translationId,
      };
      setStatus(targetStatus);
      const targetFile = file || `${fm.slug}.mdx`;

      await api.savePost({ locale, file: targetFile, frontmatter: fm, doc });
      setFile(targetFile);
      setFrontmatter(fm);
      setSaveMessage(
        targetStatus === "published" ? "✅ Published." : targetStatus === "scheduled" ? `✅ Scheduled for ${scheduledDate}.` : "✅ Draft saved."
      );

      // If creating both languages at once, also create a stub in the other locale.
      if (isNew && createBoth) {
        const otherLocale = locale === "en" ? "ar" : "en";
        const otherFm = {
          ...fm,
          locale: otherLocale,
          title: fm.title, // placeholder — user should translate
          draft: true,
          scheduledDate: null,
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
            <button onClick={() => setShowPreview(true)} className="rounded-full border border-sand-light px-4 py-1.5 text-sm font-semibold text-ink/70 hover:border-royal hover:text-royal">
              Preview
            </button>
            {status === "scheduled" && (
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="rounded-lg border border-sand-light px-2 py-1.5 text-sm"
              />
            )}
            <button onClick={() => handleSave("draft")} disabled={saving} className="rounded-full border border-royal px-4 py-1.5 text-sm font-semibold text-royal hover:bg-royal hover:text-white disabled:opacity-50">
              Save Draft
            </button>
            <button
              onClick={() => {
                if (status !== "scheduled" && !scheduledDate) {
                  setStatus("scheduled");
                  return; // reveal the date picker first; click again once a date is set
                }
                handleSave("scheduled");
              }}
              disabled={saving}
              className="rounded-full border border-blue-500 px-4 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-500 hover:text-white disabled:opacity-50"
            >
              Schedule
            </button>
            <button onClick={() => handleSave("published")} disabled={saving} className="rounded-full bg-royal px-4 py-1.5 text-sm font-semibold text-white hover:bg-royal-dark disabled:opacity-50">
              Publish
            </button>
          </div>
        </div>
      </header>

      {showPreview && <PreviewPanel doc={doc} frontmatter={frontmatter} onClose={() => setShowPreview(false)} />}

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
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFeaturedImageSelect(e.target.files)} />
            </label>
            <input
              value={frontmatter.featuredImageAlt || ""}
              onChange={(e) => updateField("featuredImageAlt", e.target.value)}
              placeholder="Alt text"
              className="mt-2 w-full rounded border border-sand-light px-2 py-1.5 text-sm"
            />
          </div>

          <SeoPanel frontmatter={frontmatter} doc={doc} focusKeyword={focusKeyword} onFocusKeywordChange={setFocusKeyword} />
        </aside>
      </main>

      {cropFile && (
        <ImageCropModal
          file={cropFile}
          aspect={16 / 9}
          onCancel={() => setCropFile(null)}
          onCropped={handleCropConfirmed}
        />
      )}
    </div>
  );
}
