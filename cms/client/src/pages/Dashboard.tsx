import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type PostSummary } from "../api";

export default function Dashboard() {
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [locale, setLocale] = useState<"all" | "en" | "ar">("all");
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<"all" | "draft" | "published" | "scheduled">("all");
  const [commitOpen, setCommitOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<string | null>(null);
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    setPosts(await api.listPosts());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const categories = useMemo(
    () => [...new Set(posts.map((p) => p.category).filter(Boolean))] as string[],
    [posts]
  );

  const filtered = posts.filter((p) => {
    if (locale !== "all" && p.locale !== locale) return false;
    if (category !== "all" && p.category !== category) return false;
    if (status !== "all" && p.status !== status) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function handleDelete(p: PostSummary) {
    if (!confirm(`Delete "${p.title}"? This can't be undone until you commit/push.`)) return;
    await api.deletePost(p.locale, p.file);
    load();
  }

  async function handleDuplicate(p: PostSummary) {
    await api.duplicatePost(p.locale, p.file);
    load();
  }

  async function handleCommit() {
    setCommitting(true);
    setCommitResult(null);
    try {
      await api.gitCommit(commitMessage || "Update blog posts via CMS", true);
      setCommitResult("✅ Committed and pushed to GitHub.");
      setCommitMessage("");
    } catch (err: any) {
      setCommitResult(`❌ ${err.message}`);
    } finally {
      setCommitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-sand-light bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="font-semibold text-xl text-ink">GoingMorocco CMS</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setCommitOpen(true)}
              className="rounded-full bg-royal px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-royal-dark"
            >
              Commit &amp; Push
            </button>
            <button
              onClick={() => navigate("/new")}
              className="rounded-full border border-royal px-5 py-2 text-sm font-semibold text-royal hover:bg-royal hover:text-white"
            >
              + New Post
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-wrap gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts…"
            className="min-w-[220px] flex-1 rounded-lg border border-sand-light px-3 py-2 text-sm"
          />
          <select value={locale} onChange={(e) => setLocale(e.target.value as any)} className="rounded-lg border border-sand-light px-3 py-2 text-sm">
            <option value="all">All languages</option>
            <option value="en">English</option>
            <option value="ar">Arabic</option>
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-sand-light px-3 py-2 text-sm">
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="rounded-lg border border-sand-light px-3 py-2 text-sm">
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>

        {loading ? (
          <p className="text-ink/60">Loading…</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-sand-light bg-white">
            <table className="w-full text-sm">
              <thead className="bg-sand-light/40 text-left text-ink/70">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Lang</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-t border-sand-light">
                    <td className="px-4 py-3">
                      <Link to={`/edit/${p.locale}/${p.file}`} className="font-medium text-ink hover:text-royal">
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 uppercase text-ink/60">{p.locale}</td>
                    <td className="px-4 py-3 text-ink/60">{p.category ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.status === "published"
                            ? "bg-green-100 text-green-700"
                            : p.status === "scheduled"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink/60">{p.publishDate ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDuplicate(p)} className="mr-3 text-ink/50 hover:text-royal">Duplicate</button>
                      <button onClick={() => handleDelete(p)} className="text-ink/50 hover:text-red-600">Delete</button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-ink/50">No posts match these filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {commitOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="mb-3 font-semibold text-lg">Commit &amp; Push to GitHub</h2>
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Update blog posts via CMS"
              className="mb-3 w-full rounded-lg border border-sand-light px-3 py-2 text-sm"
              rows={3}
            />
            {commitResult && <p className="mb-3 text-sm">{commitResult}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setCommitOpen(false)} className="rounded-full px-4 py-2 text-sm text-ink/60">Close</button>
              <button
                onClick={handleCommit}
                disabled={committing}
                className="rounded-full bg-royal px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {committing ? "Pushing…" : "Commit & Push"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
