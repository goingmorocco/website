import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

interface MediaItem {
  filename: string;
  url: string;
}

export default function MediaLibrary() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  async function load() {
    setItems(await api.listMedia());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      await api.uploadMedia(files);
      await load();
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(filename: string) {
    if (!confirm(`Delete ${filename}? This can't be undone.`)) return;
    await api.deleteMedia(filename);
    load();
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url);
  }

  const filtered = items.filter((i) => i.filename.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-sand-light bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <button onClick={() => navigate("/")} className="text-sm text-ink/60 hover:text-royal">← Back to Dashboard</button>
          <h1 className="font-semibold text-lg text-ink">Media Library</h1>
          <label className="cursor-pointer rounded-full bg-royal px-4 py-2 text-sm font-semibold text-white hover:bg-royal-dark">
            {uploading ? "Uploading…" : "+ Upload"}
            <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files)} />
          </label>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by filename…"
          className="mb-6 w-full max-w-sm rounded-lg border border-sand-light px-3 py-2 text-sm"
        />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((item) => (
            <div key={item.filename} className="group relative overflow-hidden rounded-xl border border-sand-light bg-white">
              <img src={item.url} alt={item.filename} className="h-32 w-full object-cover" />
              <div className="p-2">
                <p className="truncate text-xs text-ink/60" title={item.filename}>{item.filename}</p>
                <div className="mt-1 flex gap-2">
                  <button onClick={() => copyUrl(item.url)} className="text-xs text-royal hover:underline">Copy URL</button>
                  <button onClick={() => handleDelete(item.filename)} className="text-xs text-red-500 hover:underline">Delete</button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full py-10 text-center text-ink/50">No images yet — upload some above.</p>
          )}
        </div>
      </main>
    </div>
  );
}
