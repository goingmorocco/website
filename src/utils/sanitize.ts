// User-generated HTML (forum post bodies) must never be rendered to other
// visitors without sanitizing first — this is the single most important
// security boundary in the whole forum feature. Runs at RENDER time (not
// just at save time), since that's the actual point content reaches other
// people's browsers, regardless of how or when it was stored.
import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "u", "s",
  "h2", "h3", "ul", "ol", "li", "blockquote", "a",
  "img", "iframe", "blockquote", "div", "span",
];

const ALLOWED_ATTR = [
  "href", "target", "rel", "src", "alt", "width", "height",
  "class", "style", "frameborder", "allow", "allowfullscreen",
  "data-instgrm-permalink", "data-instgrm-version", "cite",
];

export function sanitizeForumHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Embeds (YouTube/Instagram/TikTok) need iframes and specific classed
    // divs/blockquotes to function — allow them, but nothing executes a
    // <script> tag or inline event handler (onclick etc.), which DOMPurify
    // strips by default regardless of this allowlist.
    ADD_TAGS: ["iframe"],
  });
}
