import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useState } from "react";
import { api } from "../api";

// ---------- CTA Button ----------

function CTAButtonView({ node, updateAttributes, deleteNode }: any) {
  const { text, url, color, sponsored } = node.attrs;
  return (
    <NodeViewWrapper className="my-3 rounded-xl border-2 border-dashed border-royal/40 bg-royal/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-royal">CTA Button</span>
        <button onClick={deleteNode} className="text-xs text-red-500 hover:underline">Remove</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          className="rounded border border-sand-light px-2 py-1 text-sm"
          placeholder="Button text"
          value={text}
          onChange={(e) => updateAttributes({ text: e.target.value })}
        />
        <input
          className="rounded border border-sand-light px-2 py-1 text-sm"
          placeholder="https://…"
          value={url}
          onChange={(e) => updateAttributes({ url: e.target.value })}
        />
        <label className="flex items-center gap-2 text-xs text-ink/70">
          Color
          <input type="color" value={color} onChange={(e) => updateAttributes({ color: e.target.value })} />
        </label>
        <label className="flex items-center gap-2 text-xs text-ink/70">
          <input
            type="checkbox"
            checked={sponsored}
            onChange={(e) => updateAttributes({ sponsored: e.target.checked })}
          />
          Sponsored / affiliate link
        </label>
      </div>
      <div className="mt-3">
        <span
          className="inline-block rounded-full px-5 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: color }}
        >
          {text || "Button text"}
        </span>
      </div>
    </NodeViewWrapper>
  );
}

export const CTAButton = Node.create({
  name: "ctaButton",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      text: { default: "Check it out" },
      url: { default: "#" },
      color: { default: "#0F4C81" },
      sponsored: { default: true },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-cta-button]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-cta-button": "" })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(CTAButtonView);
  },
});

// ---------- Gallery ----------

function GalleryView({ node, updateAttributes, deleteNode }: any) {
  const { images, columns } = node.attrs;
  const [uploading, setUploading] = useState(false);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = await api.uploadMedia(files);
      const newImages = [
        ...images,
        ...uploaded.map((u) => ({ src: u.url, alt: "", width: 1200, height: 800 })),
      ];
      updateAttributes({ images: newImages });
    } finally {
      setUploading(false);
    }
  }

  function removeImage(idx: number) {
    updateAttributes({ images: images.filter((_: any, i: number) => i !== idx) });
  }

  return (
    <NodeViewWrapper className="my-3 rounded-xl border-2 border-dashed border-royal/40 bg-royal/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-royal">Gallery ({images.length} images)</span>
        <button onClick={deleteNode} className="text-xs text-red-500 hover:underline">Remove</button>
      </div>
      <div className="mb-2 grid grid-cols-4 gap-2">
        {images.map((img: any, i: number) => (
          <div key={i} className="group relative">
            <img src={img.src} alt={img.alt} className="h-20 w-full rounded object-cover" />
            <button
              onClick={() => removeImage(i)}
              className="absolute right-1 top-1 hidden rounded-full bg-black/60 px-1.5 text-xs text-white group-hover:block"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <label className="cursor-pointer rounded-full border border-royal px-3 py-1.5 text-xs font-semibold text-royal hover:bg-royal hover:text-white">
          {uploading ? "Uploading…" : "+ Add images"}
          <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files)} />
        </label>
        <label className="flex items-center gap-2 text-xs text-ink/70">
          Columns
          <select
            value={columns}
            onChange={(e) => updateAttributes({ columns: Number(e.target.value) })}
            className="rounded border border-sand-light px-1 py-0.5"
          >
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </label>
      </div>
    </NodeViewWrapper>
  );
}

export const Gallery = Node.create({
  name: "gallery",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      images: { default: [] },
      columns: { default: 3 },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-gallery]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-gallery": "" })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(GalleryView);
  },
});

// ---------- HTML Embed ----------

function HtmlEmbedView({ node, updateAttributes, deleteNode }: any) {
  const { html, caption } = node.attrs;
  return (
    <NodeViewWrapper className="my-3 rounded-xl border-2 border-dashed border-royal/40 bg-royal/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-royal">HTML Embed</span>
        <button onClick={deleteNode} className="text-xs text-red-500 hover:underline">Remove</button>
      </div>
      <textarea
        className="mb-2 w-full rounded border border-sand-light px-2 py-1 font-mono text-xs"
        rows={6}
        placeholder="Paste iframe / embed HTML here…"
        value={html}
        onChange={(e) => updateAttributes({ html: e.target.value })}
      />
      <input
        className="w-full rounded border border-sand-light px-2 py-1 text-sm"
        placeholder="Caption (optional)"
        value={caption ?? ""}
        onChange={(e) => updateAttributes({ caption: e.target.value })}
      />
    </NodeViewWrapper>
  );
}

export const HtmlEmbed = Node.create({
  name: "htmlEmbed",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      html: { default: "" },
      caption: { default: null },
    };
  },
  parseHTML() {
    return [{ tag: "div[data-html-embed]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-html-embed": "" })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(HtmlEmbedView);
  },
});
