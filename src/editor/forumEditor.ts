import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { supabase } from "../utils/supabaseClient";
import { YouTubeEmbed, InstagramEmbed, TikTokEmbed, insertYouTube, insertInstagram, insertTikTok } from "./embedExtensions";

const MEDIA_BUDGET_BYTES = 3 * 1024 * 1024; // 3MB total per post, across cover image + all inline images

export interface ForumEditorHandle {
  editor: Editor;
  getUsedBytes: () => number;
  addUsedBytes: (bytes: number) => void;
  destroy: () => void;
}

export function createForumEditor(container: HTMLElement, budgetLabelEl: HTMLElement): ForumEditorHandle {
  let usedBytes = 0;

  function updateBudgetLabel() {
    const remaining = Math.max(0, MEDIA_BUDGET_BYTES - usedBytes);
    budgetLabelEl.textContent = `${(remaining / (1024 * 1024)).toFixed(2)} MB of 3 MB media budget remaining`;
    budgetLabelEl.classList.toggle("text-red-600", remaining < 0.1 * 1024 * 1024);
  }
  updateBudgetLabel();

  async function uploadImage(file: File): Promise<string | null> {
    if (usedBytes + file.size > MEDIA_BUDGET_BYTES) {
      alert(
        `This image (${(file.size / 1024 / 1024).toFixed(2)} MB) would put this post over the 3 MB total media limit. ` +
          `Remove another image first, or use a smaller one.`
      );
      return null;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      alert("You need to be logged in to upload images.");
      return null;
    }

    const userId = sessionData.session.user.id;
    const path = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;

    const { error } = await supabase.storage.from("forum-media").upload(path, file);
    if (error) {
      alert(`Upload failed: ${error.message}`);
      return null;
    }

    usedBytes += file.size;
    updateBudgetLabel();

    const { data: publicUrlData } = supabase.storage.from("forum-media").getPublicUrl(path);
    return publicUrlData.publicUrl;
  }

  const editor = new Editor({
    element: container,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      YouTubeEmbed,
      InstagramEmbed,
      TikTokEmbed,
    ],
    content: "",
    editorProps: {
      attributes: { class: "prose-content min-h-[300px] focus:outline-none" },
    },
  });

  // Toolbar wiring — buttons live in the page markup with data-action
  // attributes, so the page controls layout/styling and this module just
  // wires behavior.
  const toolbar = container.parentElement?.querySelector("[data-editor-toolbar]");
  toolbar?.addEventListener("click", async (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;

    switch (action) {
      case "bold": editor.chain().focus().toggleBold().run(); break;
      case "italic": editor.chain().focus().toggleItalic().run(); break;
      case "underline": editor.chain().focus().toggleUnderline().run(); break;
      case "h2": editor.chain().focus().toggleHeading({ level: 2 }).run(); break;
      case "h3": editor.chain().focus().toggleHeading({ level: 3 }).run(); break;
      case "bullet-list": editor.chain().focus().toggleBulletList().run(); break;
      case "ordered-list": editor.chain().focus().toggleOrderedList().run(); break;
      case "blockquote": editor.chain().focus().toggleBlockquote().run(); break;
      case "link": {
        const url = window.prompt("Link URL:");
        if (url) editor.chain().focus().setLink({ href: url }).run();
        break;
      }
      case "image": {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = async () => {
          if (!input.files?.length) return;
          const url = await uploadImage(input.files[0]);
          if (url) editor.chain().focus().setImage({ src: url, alt: "" }).run();
        };
        input.click();
        break;
      }
      case "youtube": insertYouTube(editor); break;
      case "instagram": insertInstagram(editor); break;
      case "tiktok": insertTikTok(editor); break;
    }
  });

  return {
    editor,
    getUsedBytes: () => usedBytes,
    addUsedBytes: (bytes: number) => { usedBytes += bytes; updateBudgetLabel(); },
    destroy: () => editor.destroy(),
  };
}

export async function uploadCoverImage(file: File, currentUsedBytes: number): Promise<{ url: string; bytes: number } | null> {
  if (currentUsedBytes + file.size > MEDIA_BUDGET_BYTES) {
    alert(`This cover image (${(file.size / 1024 / 1024).toFixed(2)} MB) would put this post over the 3 MB total media limit.`);
    return null;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    alert("You need to be logged in to upload images.");
    return null;
  }

  const userId = sessionData.session.user.id;
  const path = `${userId}/cover-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;

  const { error } = await supabase.storage.from("forum-media").upload(path, file);
  if (error) {
    alert(`Upload failed: ${error.message}`);
    return null;
  }

  const { data: publicUrlData } = supabase.storage.from("forum-media").getPublicUrl(path);
  return { url: publicUrlData.publicUrl, bytes: file.size };
}

export { initInstagramEmbeds, initTikTokEmbeds } from "./embedExtensions";
