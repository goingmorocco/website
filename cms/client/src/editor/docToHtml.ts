// Renders the editor's doc JSON as real HTML for the preview panel. This is
// a close visual approximation of the live site (same custom components,
// similar typography), not a pixel-perfect copy of the Astro build.

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function marksToHtml(text: string, marks: any[] = []): string {
  let html = escapeHtml(text);
  for (const m of marks) {
    if (m.type === "bold") html = `<strong>${html}</strong>`;
    else if (m.type === "italic") html = `<em>${html}</em>`;
    else if (m.type === "underline") html = `<u>${html}</u>`;
    else if (m.type === "textStyle" && m.attrs?.color) html = `<span style="color:${m.attrs.color}">${html}</span>`;
    else if (m.type === "link") html = `<a href="${m.attrs?.href ?? "#"}" style="color:#0F4C81">${html}</a>`;
  }
  return html;
}

function inlineToHtml(nodes: any[] = []): string {
  return nodes.map((n) => (n.type === "text" ? marksToHtml(n.text ?? "", n.marks) : "")).join("");
}

function blockToHtml(node: any): string {
  switch (node.type) {
    case "paragraph": {
      const style = node.attrs?.lineHeight ? ` style="line-height:${node.attrs.lineHeight}"` : "";
      return `<p${style}>${inlineToHtml(node.content)}</p>`;
    }
    case "heading":
      return `<h${node.attrs?.level ?? 2}>${inlineToHtml(node.content)}</h${node.attrs?.level ?? 2}>`;
    case "bulletList":
      return `<ul>${(node.content ?? []).map((li: any) => `<li>${(li.content ?? []).map(blockToHtml).join("")}</li>`).join("")}</ul>`;
    case "orderedList":
      return `<ol>${(node.content ?? []).map((li: any) => `<li>${(li.content ?? []).map(blockToHtml).join("")}</li>`).join("")}</ol>`;
    case "blockquote":
      return `<blockquote>${(node.content ?? []).map(blockToHtml).join("")}</blockquote>`;
    case "codeBlock":
      return `<pre><code>${escapeHtml((node.content ?? []).map((t: any) => t.text ?? "").join(""))}</code></pre>`;
    case "image":
      return `<img src="${node.attrs?.src}" alt="${escapeHtml(node.attrs?.alt ?? "")}" style="max-width:100%;border-radius:8px" />`;
    case "table": {
      const rows = (node.content ?? [])
        .map((row: any) => `<tr>${(row.content ?? []).map((cell: any) => `<td style="border:1px solid #e5e0d5;padding:6px 10px">${(cell.content ?? []).map(blockToHtml).join("")}</td>`).join("")}</tr>`)
        .join("");
      return `<table style="border-collapse:collapse;width:100%">${rows}</table>`;
    }
    case "ctaButton": {
      const { text, url, color = "#0F4C81" } = node.attrs ?? {};
      return `<a href="${url}" style="display:inline-block;background:${color};color:white;padding:12px 24px;border-radius:999px;font-weight:600;text-decoration:none;margin:12px 0">${escapeHtml(text ?? "")}</a>`;
    }
    case "gallery": {
      const { images = [], columns = 3 } = node.attrs ?? {};
      return `<div style="display:grid;grid-template-columns:repeat(${columns},1fr);gap:8px;margin:16px 0">${images
        .map((img: any) => `<img src="${img.src}" alt="${escapeHtml(img.alt ?? "")}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px" />`)
        .join("")}</div>`;
    }
    case "htmlEmbed":
      return `<div style="margin:16px 0;border-radius:12px;overflow:hidden">${node.attrs?.html ?? ""}</div>`;
    case "youtubeEmbed":
      return node.attrs?.videoId
        ? `<div style="aspect-ratio:16/9;margin:16px 0"><iframe style="width:100%;height:100%;border-radius:12px" src="https://www.youtube.com/embed/${node.attrs.videoId}" allowfullscreen></iframe></div>`
        : "";
    default:
      return "";
  }
}

export function docToHtml(doc: any, frontmatter: any): string {
  const body = (doc.content ?? []).map(blockToHtml).join("\n");
  const dir = frontmatter.locale === "ar" ? "rtl" : "ltr";
  return `
    <!doctype html>
    <html dir="${dir}">
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, sans-serif; color: #1F2937; max-width: 720px; margin: 0 auto; padding: 24px; line-height: 1.7; }
        h1, h2, h3 { font-weight: 700; margin: 1.2em 0 0.4em; }
        img { max-width: 100%; }
        .cover { width: 100%; border-radius: 12px; margin-bottom: 16px; }
      </style>
    </head>
    <body>
      ${frontmatter.featuredImage ? `<img class="cover" src="${frontmatter.featuredImage}" alt="" />` : ""}
      <h1>${escapeHtml(frontmatter.title ?? "")}</h1>
      ${body}
    </body>
    </html>
  `;
}
