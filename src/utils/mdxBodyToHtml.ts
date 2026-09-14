// Converts a saved .mdx post body back into HTML that TipTap can load via
// editor.commands.setContent() — the reverse of tiptapToMdx.ts, used when
// opening an existing post in the admin editor.
//
// Uses `marked` (a real, battle-tested Markdown parser) rather than a
// hand-rolled one — Wix-migrated posts in particular can have formatting
// quirks a custom parser would mishandle. Our own custom component tags
// (<YouTubeEmbed>, <HtmlEmbed>) aren't real Markdown, so those get
// substituted for their target raw HTML BEFORE the Markdown parser runs;
// standard Markdown parsers pass through raw HTML blocks unchanged, and
// that target HTML matches exactly what each TipTap node's parseHTML()
// rule expects, so it's picked back up as the correct node type on load.
//
// Known limitation: posts using older Wix-migration-only components
// (CTAButton, Gallery) don't have a corresponding editor node yet — those
// sections will appear as inert raw content rather than editable blocks.
import { marked } from "marked";

function substituteCustomComponents(mdx: string): string {
  let result = mdx;

  // <YouTubeEmbed videoId="XXXXXXXXXXX" />
  result = result.replace(
    /<YouTubeEmbed\s+videoId="([^"]+)"\s*\/>/g,
    (_match, videoId) =>
      `<div data-youtube-embed class="embed-youtube"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen="true"></iframe></div>`
  );

  // <HtmlEmbed html={`...raw html...`} /> — used for Instagram/TikTok embeds
  result = result.replace(
    /<HtmlEmbed\s+html=\{`([\s\S]*?)`\}\s*\/>/g,
    (_match, rawHtml) => rawHtml
  );

  return result;
}

export function mdxBodyToHtml(mdxBody: string): string {
  const substituted = substituteCustomComponents(mdxBody);
  return marked.parse(substituted, { async: false }) as string;
}
