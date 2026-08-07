import { Node, mergeAttributes } from "@tiptap/core";

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export const YouTubeEmbed = Node.create({
  name: "youtubeEmbed",
  group: "block",
  atom: true,
  addAttributes() {
    return { videoId: { default: null } };
  },
  parseHTML() {
    return [{ tag: "div[data-youtube-embed]" }];
  },
  renderHTML({ node }) {
    return [
      "div",
      { "data-youtube-embed": "", class: "embed-youtube" },
      [
        "iframe",
        {
          src: `https://www.youtube.com/embed/${node.attrs.videoId}`,
          frameborder: "0",
          allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
          allowfullscreen: "true",
        },
      ],
    ];
  },
});

export function insertYouTube(editor: any) {
  const url = window.prompt("Paste a YouTube video URL:");
  if (!url) return;
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    alert("That doesn't look like a valid YouTube URL.");
    return;
  }
  editor.chain().focus().insertContent({ type: "youtubeEmbed", attrs: { videoId } }).run();
}

// ---------- Instagram ----------
// Instagram's real embed requires their own embed.js to actually render the
// post (the markup below is just a placeholder shell until that script
// processes it) — see initInstagramEmbeds(), called after any Instagram
// embed is inserted or an existing post is loaded.
export const InstagramEmbed = Node.create({
  name: "instagramEmbed",
  group: "block",
  atom: true,
  addAttributes() {
    return { url: { default: null } };
  },
  parseHTML() {
    return [{ tag: "blockquote.instagram-media" }];
  },
  renderHTML({ node }) {
    return [
      "blockquote",
      { class: "instagram-media", "data-instgrm-permalink": node.attrs.url, "data-instgrm-version": "14" },
      ["a", { href: node.attrs.url }, node.attrs.url],
    ];
  },
});

export function insertInstagram(editor: any) {
  const url = window.prompt("Paste an Instagram post URL:");
  if (!url || !url.includes("instagram.com")) {
    if (url) alert("That doesn't look like an Instagram URL.");
    return;
  }
  editor.chain().focus().insertContent({ type: "instagramEmbed", attrs: { url } }).run();
  initInstagramEmbeds();
}

export function initInstagramEmbeds() {
  const w = window as any;
  if (w.instgrm?.Embeds) {
    w.instgrm.Embeds.process();
    return;
  }
  if (document.getElementById("instagram-embed-script")) return; // already loading
  const script = document.createElement("script");
  script.id = "instagram-embed-script";
  script.src = "https://www.instagram.com/embed.js";
  script.async = true;
  document.body.appendChild(script);
}

// ---------- TikTok ----------
export const TikTokEmbed = Node.create({
  name: "tiktokEmbed",
  group: "block",
  atom: true,
  addAttributes() {
    return { url: { default: null }, videoId: { default: null } };
  },
  parseHTML() {
    return [{ tag: "blockquote.tiktok-embed" }];
  },
  renderHTML({ node }) {
    return [
      "blockquote",
      { class: "tiktok-embed", cite: node.attrs.url, "data-video-id": node.attrs.videoId },
      ["section", {}],
    ];
  },
});

export function insertTikTok(editor: any) {
  const url = window.prompt("Paste a TikTok video URL:");
  if (!url || !url.includes("tiktok.com")) {
    if (url) alert("That doesn't look like a TikTok URL.");
    return;
  }
  const idMatch = url.match(/video\/(\d+)/);
  const videoId = idMatch ? idMatch[1] : "";
  editor.chain().focus().insertContent({ type: "tiktokEmbed", attrs: { url, videoId } }).run();
  initTikTokEmbeds();
}

export function initTikTokEmbeds() {
  if (document.getElementById("tiktok-embed-script")) {
    // Script already present — TikTok's embed.js watches the DOM via
    // MutationObserver on its own, so newly inserted blockquotes get
    // picked up automatically without needing to re-trigger anything.
    return;
  }
  const script = document.createElement("script");
  script.id = "tiktok-embed-script";
  script.src = "https://www.tiktok.com/embed.js";
  script.async = true;
  document.body.appendChild(script);
}
