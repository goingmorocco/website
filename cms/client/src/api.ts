const BASE = "/api";

async function req(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export interface PostSummary {
  id: string;
  locale: "en" | "ar";
  misplacedFolder: "en" | "ar" | null;
  file: string;
  title: string;
  slug: string;
  category: string | null;
  tags: string[];
  status: "draft" | "published" | "scheduled";
  scheduledDate: string | null;
  publishDate: string | null;
  featuredImage: string | null;
  translationId: string | null;
  author: string | null;
}

export const api = {
  listPosts: (): Promise<PostSummary[]> => req("/posts"),
  readPost: (locale: string, file: string) => req(`/posts/${locale}/${file}`),
  savePost: (data: { locale: string; file: string; frontmatter: any; doc: any }) =>
    req("/posts", { method: "POST", body: JSON.stringify(data) }),
  deletePost: (locale: string, file: string) => req(`/posts/${locale}/${file}`, { method: "DELETE" }),
  duplicatePost: (locale: string, file: string) => req(`/posts/${locale}/${file}/duplicate`, { method: "POST" }),
  newTranslationId: (): Promise<{ id: string }> => req("/translation-id"),
  listCategories: () => req("/categories"),
  saveCategory: (file: string, data: any) => req(`/categories/${file}`, { method: "POST", body: JSON.stringify(data) }),
  deleteCategory: (file: string) => req(`/categories/${file}`, { method: "DELETE" }),
  listMedia: () => req("/media"),
  deleteMedia: (filename: string) => req(`/media/${filename}`, { method: "DELETE" }),
  uploadMedia: async (files: FileList): Promise<{ filename: string; url: string }[]> => {
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("files", f));
    const res = await fetch(`${BASE}/media/upload`, { method: "POST", body: formData });
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
  },
  uploadMediaBlob: async (blob: Blob, filename = "cropped.jpg"): Promise<{ filename: string; url: string }> => {
    const formData = new FormData();
    formData.append("files", blob, filename);
    const res = await fetch(`${BASE}/media/upload`, { method: "POST", body: formData });
    if (!res.ok) throw new Error("Upload failed");
    const [result] = await res.json();
    return result;
  },
  gitStatus: () => req("/git/status"),
  gitCommit: (message: string, push: boolean) =>
    req("/git/commit", { method: "POST", body: JSON.stringify({ message, push }) }),
};
