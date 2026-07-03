import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { CTAButton, Gallery, HtmlEmbed } from "./extensions";
import { api } from "../api";
import { useEffect } from "react";

function ToolbarButton({ onClick, active, children, title }: any) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={`rounded px-2 py-1 text-sm hover:bg-sand-light ${active ? "bg-sand-light font-semibold text-royal" : "text-ink/70"}`}
    >
      {children}
    </button>
  );
}

export default function TiptapEditor({ content, onChange }: { content: any; onChange: (doc: any) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      CTAButton,
      Gallery,
      HtmlEmbed,
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  // Keep editor content in sync when switching between EN/AR versions of a post.
  useEffect(() => {
    if (editor && content) {
      const current = JSON.stringify(editor.getJSON());
      const incoming = JSON.stringify(content);
      if (current !== incoming) editor.commands.setContent(content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  if (!editor) return null;

  async function insertImage() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      if (!input.files?.length) return;
      const [uploaded] = await api.uploadMedia(input.files);
      editor!.chain().focus().setImage({ src: uploaded.url, alt: "" }).run();
    };
    input.click();
  }

  function insertLink() {
    const url = window.prompt("Link URL:");
    if (url) editor!.chain().focus().setLink({ href: url }).run();
  }

  return (
    <div className="rounded-xl border border-sand-light bg-white">
      <div className="flex flex-wrap gap-1 border-b border-sand-light px-2 py-2">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold"><b>B</b></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic"><i>I</i></ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline"><u>U</u></ToolbarButton>
        <span className="mx-1 w-px bg-sand-light" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="H1">H1</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="H2">H2</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="H3">H3</ToolbarButton>
        <span className="mx-1 w-px bg-sand-light" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">• List</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list">1. List</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Quote">" Quote</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Code block">{"</>"}</ToolbarButton>
        <span className="mx-1 w-px bg-sand-light" />
        <ToolbarButton onClick={insertLink} title="Insert link">🔗 Link</ToolbarButton>
        <ToolbarButton onClick={insertImage} title="Insert image">🖼 Image</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert table">▦ Table</ToolbarButton>
        <span className="mx-1 w-px bg-sand-light" />
        <ToolbarButton onClick={() => editor.chain().focus().insertContent({ type: "ctaButton", attrs: { text: "Check it out", url: "#", color: "#0F4C81", sponsored: true } }).run()} title="Insert CTA button">+ Button</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().insertContent({ type: "gallery", attrs: { images: [], columns: 3 } }).run()} title="Insert gallery">+ Gallery</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().insertContent({ type: "htmlEmbed", attrs: { html: "", caption: null } }).run()} title="Insert HTML embed">+ Embed</ToolbarButton>
      </div>
      <div className="px-4 py-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
