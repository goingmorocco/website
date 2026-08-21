// Converts the admin blog editor's TipTap doc into real MDX text — the same
// format your 130 migrated posts already use. This runs in the browser
// (it's just string building, no file access needed) before the result is
// sent to the publish-blog-post Edge Function.

function escapeMdxText(text: string): string {
  return text.replace(/[{}<>]/g, (c) => ({ "{": "\\{", "}": "\\}", "<": "\\<", ">": "\\>" } as Record<string, string>)[c]);
}

function marksToMd(text: string, marks: any[] = []): string {
  const raw = escapeMdxText(text);
  const leading = raw.match(/^\s*/)?.[0] ?? "";
  const trailing = raw.match(/\s*$/)?.[0] ?? "";
  let core = raw.slice(leading.length, raw.length - trailing.length);
  if (core === "") return raw;

  const ordered = [...marks].sort((a, b) => (a.type === "link" ? 1 : b.type === "link" ? -1 : 0));
  for (const m of ordered) {
    if (m.type === "bold") core = `**${core}**`;
    else if (m.type === "italic") core = `_${core}_`;
    else if (m.type === "underline") core = `<u>${core}</u>`;
    else if (m.type === "link") core = `[${core}](${m.attrs?.href ?? "#"})`;
  }
  return leading + core + trailing;
}

function inlineToMd(nodes: any[] = []): string {
  return nodes.map((n) => (n.type === "text" ? marksToMd(n.text ?? "", n.marks) : "")).join("");
}

const usedComponents = new Set<string>();

function blockToMd(node: any): string {
  switch (node.type) {
    case "paragraph": {
      const text = inlineToMd(node.content).trim();
      return text ? `${text}\n\n` : "";
    }
    case "heading": {
      const level = node.attrs?.level ?? 2;
      return `${"#".repeat(level)} ${inlineToMd(node.content).trim()}\n\n`;
    }
    case "bulletList":
    case "orderedList": {
      const marker = node.type === "bulletList" ? "-" : "1.";
      const items = (node.content ?? [])
        .map((item: any) => {
          const text = (item.content ?? [])
            .map((p: any) => (p.type === "paragraph" ? inlineToMd(p.content) : ""))
            .join(" ")
            .trim();
          return `${marker} ${text}`;
        })
        .join("\n");
      return `${items}\n\n`;
    }
    case "blockquote": {
      const inner = (node.content ?? [])
        .map((p: any) => (p.type === "paragraph" ? inlineToMd(p.content) : ""))
        .join("\n");
      return inner.split("\n").map((line: string) => `> ${line}`).join("\n") + "\n\n";
    }
    case "image": {
      const alt = (node.attrs?.alt ?? "").replace(/"/g, "'");
      return `![${alt}](${node.attrs?.src ?? ""})\n\n`;
    }
    case "youtubeEmbed": {
      usedComponents.add("YouTubeEmbed");
      return `<YouTubeEmbed videoId="${node.attrs?.videoId ?? ""}" />\n\n`;
    }
    case "instagramEmbed": {
      usedComponents.add("HtmlEmbed");
      const url = node.attrs?.url ?? "";
      const html = `<blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14"><a href="${url}">${url}</a></blockquote>`;
      return `<HtmlEmbed html={\`${html}\`} />\n\n`;
    }
    case "tiktokEmbed": {
      usedComponents.add("HtmlEmbed");
      const url = node.attrs?.url ?? "";
      const videoId = node.attrs?.videoId ?? "";
      const html = `<blockquote class="tiktok-embed" cite="${url}" data-video-id="${videoId}"><section></section></blockquote>`;
      return `<HtmlEmbed html={\`${html}\`} />\n\n`;
    }
    default:
      return "";
  }
}

export function tiptapToMdx(doc: any): { body: string; imports: string } {
  usedComponents.clear();
  const body = (doc.content ?? []).map(blockToMd).join("");

  const importPaths: Record<string, string> = {
    YouTubeEmbed: "../../../components/content/YouTubeEmbed.astro",
    HtmlEmbed: "../../../components/content/HtmlEmbed.astro",
  };

  const imports = [...usedComponents]
    .map((name) => `import ${name} from "${importPaths[name]}";`)
    .join("\n");

  return { body, imports };
}
