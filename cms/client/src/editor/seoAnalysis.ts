// Analyzes a post's frontmatter + editor content and produces a 0-100 SEO
// score plus a list of specific, actionable checks. Runs entirely client-side
// since we already have the full doc + frontmatter in memory.

export type CheckStatus = "green" | "yellow" | "red";

export interface SeoCheck {
  id: string;
  label: string;
  status: CheckStatus;
  message: string;
}

function extractText(doc: any): string {
  const parts: string[] = [];
  function walk(node: any) {
    if (!node) return;
    if (node.type === "text") parts.push(node.text ?? "");
    (node.content ?? []).forEach(walk);
  }
  walk(doc);
  return parts.join(" ");
}

function extractParagraphs(doc: any): string[] {
  return (doc.content ?? [])
    .filter((n: any) => n.type === "paragraph")
    .map((n: any) => (n.content ?? []).map((t: any) => t.text ?? "").join(""))
    .filter((t: string) => t.trim().length > 0);
}

function extractHeadings(doc: any): { level: number; text: string }[] {
  return (doc.content ?? [])
    .filter((n: any) => n.type === "heading")
    .map((n: any) => ({
      level: n.attrs?.level ?? 2,
      text: (n.content ?? []).map((t: any) => t.text ?? "").join(""),
    }));
}

function countImages(doc: any): { total: number; missingAlt: number } {
  let total = 0;
  let missingAlt = 0;
  function walk(node: any) {
    if (!node) return;
    if (node.type === "image") {
      total++;
      if (!node.attrs?.alt) missingAlt++;
    }
    (node.content ?? []).forEach(walk);
  }
  walk(doc);
  return { total, missingAlt };
}

function countLinks(doc: any, siteHost: string): { internal: number; external: number } {
  let internal = 0;
  let external = 0;
  function walk(node: any) {
    if (!node) return;
    (node.marks ?? []).forEach((m: any) => {
      if (m.type === "link") {
        const href = m.attrs?.href ?? "";
        if (href.startsWith("/") || href.includes(siteHost)) internal++;
        else if (href.startsWith("http")) external++;
      }
    });
    (node.content ?? []).forEach(walk);
  }
  walk(doc);
  return { internal, external };
}

// Rough Flesch Reading Ease approximation (English-oriented; treated as an
// informational signal, not a strict gate, for Arabic content).
function fleschReadingEase(text: string): number {
  const sentences = Math.max(1, (text.match(/[.!?]+/g) || []).length);
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = Math.max(1, words.length);
  const syllables = words.reduce((sum, w) => sum + Math.max(1, (w.toLowerCase().match(/[aeiouy]+/g) || []).length), 0);
  return 206.835 - 1.015 * (wordCount / sentences) - 84.6 * (syllables / wordCount);
}

export function analyzeSeo(frontmatter: any, doc: any, focusKeyword: string): { score: number; checks: SeoCheck[] } {
  const checks: SeoCheck[] = [];
  const bodyText = extractText(doc);
  const paragraphs = extractParagraphs(doc);
  const headings = extractHeadings(doc);
  const images = countImages(doc);
  const links = countLinks(doc, "goingmorocco.com");
  const kw = focusKeyword.trim().toLowerCase();

  // Title length
  const titleLen = (frontmatter.title || "").length;
  checks.push({
    id: "title-length",
    label: "Title length",
    status: titleLen >= 40 && titleLen <= 65 ? "green" : titleLen > 0 ? "yellow" : "red",
    message: titleLen === 0 ? "Add a title." : `${titleLen} characters — ideal is 40-65.`,
  });

  // Meta description
  const descLen = (frontmatter.description || "").length;
  checks.push({
    id: "meta-description",
    label: "Meta description",
    status: descLen >= 120 && descLen <= 160 ? "green" : descLen > 0 ? "yellow" : "red",
    message: descLen === 0 ? "Add a meta description." : `${descLen} characters — ideal is 120-160.`,
  });

  // Slug
  const slug = frontmatter.slug || "";
  checks.push({
    id: "slug",
    label: "URL slug",
    status: slug && slug.length <= 75 && !/[A-Z_\s]/.test(slug) ? "green" : "yellow",
    message: !slug ? "Missing slug." : slug.length > 75 ? "Slug is quite long — consider shortening." : "Looks good.",
  });

  // Heading hierarchy — body should start at H2 (H1 is the post title itself)
  const hasH1InBody = headings.some((h) => h.level === 1);
  checks.push({
    id: "h1",
    label: "H1 usage",
    status: hasH1InBody ? "red" : "green",
    message: hasH1InBody
      ? "Don't add an H1 in the body — your post title is already the page's H1."
      : "Good — title is the only H1.",
  });

  let hierarchyOk = true;
  let last = 1;
  for (const h of headings) {
    if (h.level > last + 1) hierarchyOk = false;
    last = h.level;
  }
  checks.push({
    id: "heading-hierarchy",
    label: "Heading hierarchy",
    status: headings.length === 0 ? "yellow" : hierarchyOk ? "green" : "red",
    message: headings.length === 0 ? "No headings yet — break up the content with H2/H3s." : hierarchyOk ? "No skipped heading levels." : "You've skipped a heading level (e.g. H2 straight to H4).",
  });

  // Image alt text
  checks.push({
    id: "image-alt",
    label: "Image alt text",
    status: images.total === 0 ? "yellow" : images.missingAlt === 0 ? "green" : "red",
    message: images.total === 0 ? "No images in the body yet." : images.missingAlt === 0 ? `All ${images.total} image(s) have alt text.` : `${images.missingAlt} of ${images.total} image(s) missing alt text.`,
  });

  // Internal / external links
  checks.push({
    id: "internal-links",
    label: "Internal links",
    status: links.internal >= 1 ? "green" : "yellow",
    message: links.internal >= 1 ? `${links.internal} internal link(s).` : "Add at least one link to another post on your site.",
  });
  checks.push({
    id: "external-links",
    label: "External links",
    status: links.external >= 1 ? "green" : "yellow",
    message: links.external >= 1 ? `${links.external} external link(s).` : "Consider linking to at least one authoritative external source.",
  });

  // Focus keyword checks (only if one is set)
  if (kw) {
    const density = bodyText.toLowerCase().split(kw).length - 1;
    const wordCount = bodyText.split(/\s+/).filter(Boolean).length || 1;
    const densityPct = (density * kw.split(" ").length * 100) / wordCount;
    checks.push({
      id: "keyword-density",
      label: "Keyword density",
      status: densityPct >= 0.5 && densityPct <= 2.5 ? "green" : densityPct > 0 ? "yellow" : "red",
      message: `"${focusKeyword}" appears ${density} time(s) (${densityPct.toFixed(1)}% density). Ideal: 0.5–2.5%.`,
    });

    const firstPara = paragraphs[0] || "";
    checks.push({
      id: "keyword-first-para",
      label: "Keyword in first paragraph",
      status: firstPara.toLowerCase().includes(kw) ? "green" : "yellow",
      message: firstPara.toLowerCase().includes(kw) ? "Found." : "Consider mentioning your focus keyword early on.",
    });

    const lastPara = paragraphs[paragraphs.length - 1] || "";
    checks.push({
      id: "keyword-last-para",
      label: "Keyword in closing paragraph",
      status: lastPara.toLowerCase().includes(kw) ? "green" : "yellow",
      message: lastPara.toLowerCase().includes(kw) ? "Found." : "Consider reinforcing your focus keyword near the end.",
    });

    checks.push({
      id: "keyword-title",
      label: "Keyword in title",
      status: (frontmatter.title || "").toLowerCase().includes(kw) ? "green" : "yellow",
      message: (frontmatter.title || "").toLowerCase().includes(kw) ? "Found in title." : "Focus keyword isn't in the title.",
    });
  } else {
    checks.push({
      id: "focus-keyword",
      label: "Focus keyword",
      status: "yellow",
      message: "Set a focus keyword above to unlock keyword-based checks.",
    });
  }

  // Readability (English only — informational for Arabic)
  if (frontmatter.locale !== "ar" && bodyText.split(/\s+/).length > 20) {
    const ease = fleschReadingEase(bodyText);
    checks.push({
      id: "readability",
      label: "Readability",
      status: ease >= 60 ? "green" : ease >= 40 ? "yellow" : "red",
      message: `Flesch Reading Ease: ${ease.toFixed(0)} — ${ease >= 60 ? "easy to read" : ease >= 40 ? "fairly difficult" : "hard to read, consider shorter sentences"}.`,
    });
  }

  // Canonical / OG / Twitter — these are auto-generated site-wide from
  // title/description/featuredImage, so the real check is just that those exist.
  const hasCore = frontmatter.title && frontmatter.description && frontmatter.featuredImage;
  checks.push({
    id: "og-twitter",
    label: "Open Graph / Twitter Card",
    status: hasCore ? "green" : "red",
    message: hasCore ? "Auto-generated correctly from title, description, and featured image." : "These are built automatically, but need title + description + featured image to be complete.",
  });

  // Featured image
  checks.push({
    id: "featured-image",
    label: "Featured image",
    status: frontmatter.featuredImage ? "green" : "red",
    message: frontmatter.featuredImage ? "Set." : "Missing — required for social sharing previews too.",
  });

  const score = Math.round(
    (checks.filter((c) => c.status === "green").length / checks.length) * 100
  );

  return { score, checks };
}
