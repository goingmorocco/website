import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

interface CategoryFile {
  file: string;
  id: string;
  locale: "en" | "ar";
  name: string;
  description: string;
}

export default function CategoryManager() {
  const [categories, setCategories] = useState<CategoryFile[]>([]);
  const navigate = useNavigate();

  async function load() {
    setCategories(await api.listCategories());
  }

  useEffect(() => {
    load();
  }, []);

  // Group the separate en/ar files by shared id so each category shows as one row.
  const grouped = Object.values(
    categories.reduce((acc: Record<string, any>, c) => {
      acc[c.id] = acc[c.id] || { id: c.id };
      acc[c.id][c.locale] = c;
      return acc;
    }, {})
  ) as { id: string; en?: CategoryFile; ar?: CategoryFile }[];

  async function handleCreate() {
    const id = prompt("Category ID (used internally, e.g. 'day-trips'):");
    if (!id) return;
    const nameEn = prompt("English name:") || id;
    const nameAr = prompt("Arabic name (optional):") || nameEn;
    await api.saveCategory(`${id}.en.json`, { id, locale: "en", name: nameEn, description: "" });
    await api.saveCategory(`${id}.ar.json`, { id, locale: "ar", name: nameAr, description: "" });
    load();
  }

  async function handleRename(cat: CategoryFile) {
    const newName = prompt(`Rename "${cat.name}" to:`, cat.name);
    if (!newName || newName === cat.name) return;
    await api.saveCategory(cat.file, { ...cat, name: newName });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm(`Delete category "${id}" (both languages)? Posts using it will need a new category.`)) return;
    await api.deleteCategory(`${id}.en.json`).catch(() => {});
    await api.deleteCategory(`${id}.ar.json`).catch(() => {});
    load();
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-sand-light bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <button onClick={() => navigate("/")} className="text-sm text-ink/60 hover:text-royal">← Back to Dashboard</button>
          <h1 className="font-semibold text-lg text-ink">Categories</h1>
          <button onClick={handleCreate} className="rounded-full bg-royal px-4 py-2 text-sm font-semibold text-white hover:bg-royal-dark">
            + New Category
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <div className="overflow-hidden rounded-xl border border-sand-light bg-white">
          <table className="w-full text-sm">
            <thead className="bg-sand-light/40 text-left text-ink/70">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">English name</th>
                <th className="px-4 py-3 font-medium">Arabic name</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {grouped.map((g) => (
                <tr key={g.id} className="border-t border-sand-light">
                  <td className="px-4 py-3 font-mono text-xs text-ink/60">{g.id}</td>
                  <td className="px-4 py-3">
                    {g.en?.name ?? "—"}
                    {g.en && <button onClick={() => handleRename(g.en!)} className="ml-2 text-xs text-royal hover:underline">Rename</button>}
                  </td>
                  <td className="px-4 py-3" dir="rtl">
                    {g.ar?.name ?? "—"}
                    {g.ar && <button onClick={() => handleRename(g.ar!)} className="ml-2 text-xs text-royal hover:underline" dir="ltr">Rename</button>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(g.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
