// Central i18n config. Keep this the single source of truth for locale
// metadata so layouts, the language switcher, and SEO tags never drift.

export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeMeta: Record<Locale, { label: string; dir: "ltr" | "rtl"; htmlLang: string }> = {
  en: { label: "English", dir: "ltr", htmlLang: "en" },
  ar: { label: "العربية", dir: "rtl", htmlLang: "ar" },
};

// UI strings that aren't part of page content (nav labels, buttons, etc).
// Blog post titles/descriptions live in the content collections instead —
// this dictionary is only for chrome around the content.
export const ui = {
  en: {
    nav: { home: "Home", about: "About", blog: "Blog", categories: "Categories", contact: "Contact" },
    blog: {
      readingTime: (min: number) => `${min} min read`,
      relatedArticles: "Related Articles",
      previousArticle: "Previous Article",
      nextArticle: "Next Article",
      tableOfContents: "In this article",
      publishedOn: "Published",
      updatedOn: "Updated",
    },
    home: {
      latestPosts: "Latest posts",
      viewAll: "View all",
    },
    search: {
      placeholder: "Search articles…",
      noResults: "No results found",
      label: "Search",
    },
    footer: { rights: "All rights reserved." },
  },
  ar: {
    nav: { home: "الرئيسية", about: "من نحن", blog: "المدونة", categories: "الفئات", contact: "تواصل معنا" },
    blog: {
      readingTime: (min: number) => `${min} دقيقة قراءة`,
      relatedArticles: "مقالات ذات صلة",
      previousArticle: "المقال السابق",
      nextArticle: "المقال التالي",
      tableOfContents: "في هذا المقال",
      publishedOn: "نُشر في",
      updatedOn: "آخر تحديث",
    },
    home: {
      latestPosts: "آخر المنشورات",
      viewAll: "عرض الكل",
    },
    search: {
      placeholder: "ابحث في المقالات…",
      noResults: "لا توجد نتائج",
      label: "بحث",
    },
    footer: { rights: "جميع الحقوق محفوظة." },
  },
} as const;

export function t(locale: Locale) {
  return ui[locale];
}

/**
 * Builds a path prefixed with the locale, matching Astro's i18n routing
 * config (English at the root, Arabic under /ar/).
 */
export function localizedPath(locale: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === defaultLocale) return clean;
  return `/${locale}${clean}`;
}

/**
 * Derives the current locale from an Astro URL pathname.
 */
export function getLocaleFromUrl(url: URL): Locale {
  const [, maybeLocale] = url.pathname.split("/");
  return (locales as readonly string[]).includes(maybeLocale) ? (maybeLocale as Locale) : defaultLocale;
}

export function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}
