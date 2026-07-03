// Converts between:
//  - "doc JSON"  — the structured document the browser-side editor works with
//    (a TipTap/ProseMirror-shaped JSON tree, with 3 custom node types:
//    ctaButton, gallery, htmlEmbed — matching CTAButton.astro, Gallery.astro,
//    HtmlEmbed.astro exactly)
//  - MDX text — the actual .mdx file content that Astro builds from
//
// docToMdx()  is intentionally similar to the earlier Wix convert-posts.mjs
// node-rendering logic, since the output format (MDX body text) is the same.
// mdxToDoc()  is the new, reverse direction: parses real MDX back into doc
// JSON so existing posts can be opened and edited visually.

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMdx from "remark-mdx";
import remarkGfm from "remark-gfm";

const COMPONENT_IMPORT_PATHS = {
  CTAButton: "../../../components/content/CTAButton.astro",
  Gallery: "../../../components/content/Gallery.astro",
  HtmlEmbed: "../../../components/content/HtmlEmbed.astro",
};

// ---------- doc JSON -> MDX ----------

function escapeMdxText(text) {
  return text.replace(/[{}<>]/g, (c) => ({ "{": "\\{", "}": "\\}", "<": "\\<", ">": "\\>" }[c]));
}

function marksToMd(text, marks = []) {
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

function inlineToMd(nodes = []) {
  return nodes.map((n) => (n.type === "text" ? marksToMd(n.text ?? "", n.marks) : "")).join("");
}

const usedComponents = new Set();

function blockToMd(node) {
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
        .map((item) => {
          const text = (item.content ?? [])
            .map((p) => (p.type === "paragraph" ? inlineToMd(p.content) : ""))
            .join(" ")
            .trim();
          return `${marker} ${text}`;
        })
        .join("\n");
      return `${items}\n\n`;
    }
    case "blockquote": {
      const inner = (node.content ?? [])
        .map((p) => (p.type === "paragraph" ? inlineToMd(p.content) : ""))
        .join("\n");
      return inner
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n") + "\n\n";
    }
    case "codeBlock": {
      const lang = node.attrs?.language ?? "";
      const code = (node.content ?? []).map((t) => t.text ?? "").join("");
      return `\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
    }
    case "image": {
      const alt = (node.attrs?.alt ?? "").replace(/"/g, "'");
      return `![${alt}](${node.attrs?.src ?? ""})\n\n`;
    }
    case "table": {
      const rows = node.content ?? [];
      if (rows.length === 0) return "";
      const cellText = (cell) =>
        (cell.content ?? [])
          .map((p) => (p.type === "paragraph" ? inlineToMd(p.content) : ""))
          .join(" ")
          .replace(/\|/g, "\\|")
          .trim();
      const rendered = rows.map((row) => (row.content ?? []).map(cellText));
      const [header, ...body] = rendered;
      let out = `| ${header.join(" | ")} |\n`;
      out += `| ${header.map(() => "---").join(" | ")} |\n`;
      for (const row of body) out += `| ${row.join(" | ")} |\n`;
      return out + "\n";
    }
    case "ctaButton": {
      usedComponents.add("CTAButton");
      const { text = "", url = "#", color = "#0F4C81", sponsored = true } = node.attrs ?? {};
      return `<CTAButton text="${text.replace(/"/g, "'")}" url="${url}" color="${color}" sponsored={${!!sponsored}} />\n\n`;
    }
    case "gallery": {
      usedComponents.add("Gallery");
      const { images = [], columns = 3 } = node.attrs ?? {};
      return `<Gallery images={${JSON.stringify(images)}} columns={${columns}} />\n\n`;
    }
    case "htmlEmbed": {
      usedComponents.add("HtmlEmbed");
      const html = (node.attrs?.html ?? "").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
      const caption = node.attrs?.caption;
      return `<HtmlEmbed html={\`${html}\`}${caption ? ` caption="${caption.replace(/"/g, "'")}"` : ""} />\n\n`;
    }
    default:
      return "";
  }
}

export function docToMdx(doc) {
  usedComponents.clear();
  const body = (doc.content ?? []).map(blockToMd).join("");
  const imports = [...usedComponents]
    .map((name) => `import ${name} from "${COMPONENT_IMPORT_PATHS[name]}";`)
    .join("\n");
  return { body, imports };
}

// ---------- MDX -> doc JSON ----------

function mdastInlineToTiptap(children = [], marks = []) {
  const out = [];
  for (const child of children) {
    if (child.type === "text") {
      out.push({ type: "text", text: child.value, ...(marks.length ? { marks: [...marks] } : {}) });
    } else if (child.type === "strong") {
      out.push(...mdastInlineToTiptap(child.children, [...marks, { type: "bold" }]));
    } else if (child.type === "emphasis") {
      out.push(...mdastInlineToTiptap(child.children, [...marks, { type: "italic" }]));
    } else if (child.type === "link") {
      out.push(...mdastInlineToTiptap(child.children, [...marks, { type: "link", attrs: { href: child.url } }]));
    } else if (child.type === "inlineCode") {
      out.push({ type: "text", text: child.value, marks: [...marks, { type: "code" }] });
    } else if (child.type === "html" || child.type === "mdxJsxTextElement") {
      // <u> underline tags come through as raw inline HTML with remark-mdx
      const raw = child.value ?? "";
      if (/^<u>/.test(raw)) continue; // opening tag marker, skip
      if (/^<\/u>/.test(raw)) continue; // closing tag marker, skip
    }
  }
  return out;
}

function mdastBlockToTiptap(node) {
  switch (node.type) {
    case "paragraph":
      return { type: "paragraph", content: mdastInlineToTiptap(node.children) };
    case "heading":
      return { type: "heading", attrs: { level: node.depth }, content: mdastInlineToTiptap(node.children) };
    case "list":
      return {
        type: node.ordered ? "orderedList" : "bulletList",
        content: node.children.map((li) => ({
          type: "listItem",
          content: (li.children ?? []).map(mdastBlockToTiptap).filter(Boolean),
        })),
      };
    case "blockquote":
      return { type: "blockquote", content: (node.children ?? []).map(mdastBlockToTiptap).filter(Boolean) };
    case "code":
      return { type: "codeBlock", attrs: { language: node.lang ?? "" }, content: [{ type: "text", text: node.value }] };
    case "image":
      return { type: "image", attrs: { src: node.url, alt: node.alt ?? "" } };
    case "table": {
      const rows = node.children ?? [];
      return {
        type: "table",
        content: rows.map((row) => ({
          type: "tableRow",
          content: (row.children ?? []).map((cell) => ({
            type: "tableCell",
            content: [{ type: "paragraph", content: mdastInlineToTiptap(cell.children) }],
          })),
        })),
      };
    }
    case "mdxJsxFlowElement": {
      if (node.name === "CTAButton") {
        const attrs = Object.fromEntries((node.attributes ?? []).map((a) => [a.name, a.value]));
        return {
          type: "ctaButton",
          attrs: {
            text: attrs.text ?? "",
            url: attrs.url ?? "#",
            color: attrs.color ?? "#0F4C81",
            sponsored: attrs.sponsored !== "{false}",
          },
        };
      }
      if (node.name === "Gallery") {
        const imagesAttr = (node.attributes ?? []).find((a) => a.name === "images");
        const colsAttr = (node.attributes ?? []).find((a) => a.name === "columns");
        let images = [];
        try {
          images = JSON.parse(imagesAttr?.value?.value?.replace(/^\{|\}$/g, "") ?? "[]");
        } catch {
          images = [];
        }
        const columns = Number((colsAttr?.value?.value ?? "3").replace(/[{}]/g, "")) || 3;
        return { type: "gallery", attrs: { images, columns } };
      }
      if (node.name === "HtmlEmbed") {
        const htmlAttr = (node.attributes ?? []).find((a) => a.name === "html");
        const captionAttr = (node.attributes ?? []).find((a) => a.name === "caption");
        const raw = htmlAttr?.value?.value ?? "";
        const html = raw.replace(/^`|`$/g, "").replace(/\\`/g, "`").replace(/\\\$\{/g, "${");
        return { type: "htmlEmbed", attrs: { html, caption: captionAttr?.value ?? null } };
      }
      return null;
    }
    default:
      return null;
  }
}

export async function mdxToDoc(bodyText) {
  const tree = unified().use(remarkParse).use(remarkMdx).use(remarkGfm).parse(bodyText);
  const content = tree.children.map(mdastBlockToTiptap).filter(Boolean);
  return { type: "doc", content };
}
