import { localeMeta, type Locale } from "./i18n";

const SITE_URL = "https://goingmorocco.com";

/** Resolves a site-relative path to an absolute URL. */
export function absoluteUrl(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return new URL(clean, SITE_URL).toString();
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * BreadcrumbList schema. Takes the exact same `items` shape the visual
 * <Breadcrumbs> component renders, so the two are built from one source of
 * truth per page instead of two independently-maintained lists that could
 * drift apart.
 */
export function buildBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: absoluteUrl(item.href) } : {}),
    })),
  };
}

export interface BlogPostingInput {
  title: string;
  description: string;
  imageUrl: string;
  publishDate: Date;
  updatedDate?: Date;
  author: string;
  url: string;
  locale: Locale;
}

export function buildBlogPostingSchema(post: BlogPostingInput) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    image: [absoluteUrl(post.imageUrl)],
    datePublished: post.publishDate.toISOString(),
    dateModified: (post.updatedDate ?? post.publishDate).toISOString(),
    inLanguage: localeMeta[post.locale].htmlLang,
    author: { "@type": "Person", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "GoingMorocco",
      logo: { "@type": "ImageObject", url: absoluteUrl("/og-default.png") },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(post.url) },
  };
}

/** Organization + WebSite schema, used once on each locale's homepage. */
export function buildOrganizationSchema(locale: Locale) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "GoingMorocco",
      url: absoluteUrl(locale === "en" ? "/" : "/ar/"),
      logo: absoluteUrl("/og-default.png"),
      sameAs: [],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: locale === "en" ? "GoingMorocco" : "غوينغ موروكو",
      url: absoluteUrl(locale === "en" ? "/" : "/ar/"),
      inLanguage: localeMeta[locale].htmlLang,
    },
  ];
}
