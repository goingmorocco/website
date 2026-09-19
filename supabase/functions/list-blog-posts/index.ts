// Supabase Edge Function: list-blog-posts
//
// Deploy with:
//   supabase functions deploy list-blog-posts
//
// Reuses the same secrets already set for publish-blog-post — no new
// secrets to configure:
//   GITHUB_TOKEN, GITHUB_REPO, SUPABASE_URL, SUPABASE_ANON_KEY
//
// Why this exists: the admin blog-posts list page used to call GitHub's
// public, unauthenticated contents API directly from the browser, which
// only returns file NAMES, not their frontmatter (title/category/draft).
// Reading every post's actual content one file at a time from the browser
// would mean one GitHub API call per post, and the unauthenticated limit
// is 60 requests/hour -- easy to blow through once there are 100+ posts.
//
// This function does it server-side instead, with the same GitHub token
// already used to publish posts (5,000 requests/hour authenticated), and
// batches every file's content into a SINGLE GitHub GraphQL request
// (aliased blob lookups) so the total cost is always ~2 GitHub API calls
// no matter how many posts exist -- one Contents API call per locale to
// list filenames, then one GraphQL call to fetch every file's raw text.
//
// Same admin-only auth check as publish-blog-post: nothing runs against
// GitHub until the caller's Supabase session is verified to be an admin.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN")!;
const GITHUB_REPO = Deno.env.get("GITHUB_REPO")!; // "owner/repo"
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const [GITHUB_OWNER, GITHUB_REPO_NAME] = GITHUB_REPO.split("/");
const LOCALES = ["en", "ar"] as const;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

// Turns a file path into a safe GraphQL alias (aliases can't contain
// slashes, dots, or hyphens).
function pathToAlias(path: string, index: number) {
  return `f${index}`;
}

function parseFrontmatterField(content: string, field: string): string | null {
  const match = content.match(new RegExp(`^${field}:\\s*"?(.*?)"?\\s*$`, "m"));
  return match ? match[1] : null;
}

function parseDraft(content: string): boolean {
  const match = content.match(/^draft:\s*(true|false)/m);
  return match ? match[1] === "true" : false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }

  try {
    // ---------- Verify the caller is a logged-in admin ----------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: corsHeaders() });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: corsHeaders() });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    if (profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: corsHeaders() });
    }

    // ---------- Step 1: list filenames per locale (Contents API) ----------
    const filePaths: { locale: "en" | "ar"; slug: string; path: string }[] = [];

    for (const locale of LOCALES) {
      const dirUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/src/content/blog/${locale}`;
      const dirRes = await fetch(dirUrl, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "GoingMorocco-Admin-Dashboard",
        },
      });

      if (!dirRes.ok) {
        // A locale folder that doesn't exist yet isn't a real error --
        // just means there are no posts in that language yet.
        if (dirRes.status === 404) continue;
        const errText = await dirRes.text();
        return new Response(JSON.stringify({ error: `GitHub contents API error (${locale}): ${errText}` }), {
          status: 500,
          headers: corsHeaders(),
        });
      }

      const files = await dirRes.json();
      for (const f of files) {
        if (f.name.endsWith(".mdx") || f.name.endsWith(".md")) {
          filePaths.push({
            locale,
            slug: f.name.replace(/\.mdx?$/, ""),
            path: `src/content/blog/${locale}/${f.name}`,
          });
        }
      }
    }

    if (filePaths.length === 0) {
      return new Response(JSON.stringify({ en: [], ar: [] }), {
        status: 200,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }

    // ---------- Step 2: batch-fetch every file's content (GraphQL) ----------
    const aliasFields = filePaths
      .map((f, i) => `${pathToAlias(f.path, i)}: object(expression: "HEAD:${f.path}") { ... on Blob { text } }`)
      .join("\n");

    const query = `
      query($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          ${aliasFields}
        }
      }
    `;

    const graphqlRes = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
        "User-Agent": "GoingMorocco-Admin-Dashboard",
      },
      body: JSON.stringify({
        query,
        variables: { owner: GITHUB_OWNER, name: GITHUB_REPO_NAME },
      }),
    });

    if (!graphqlRes.ok) {
      const errText = await graphqlRes.text();
      return new Response(JSON.stringify({ error: `GitHub GraphQL error: ${errText}` }), {
        status: 500,
        headers: corsHeaders(),
      });
    }

    const graphqlResult = await graphqlRes.json();
    const repoData = graphqlResult.data?.repository ?? {};

    const result: { en: any[]; ar: any[] } = { en: [], ar: [] };

    filePaths.forEach((f, i) => {
      const blob = repoData[pathToAlias(f.path, i)];
      const content: string = blob?.text ?? "";

      result[f.locale].push({
        slug: f.slug,
        title: parseFrontmatterField(content, "title") ?? f.slug,
        category: parseFrontmatterField(content, "category") ?? "",
        draft: parseDraft(content),
      });
    });

    result.en.sort((a, b) => a.slug.localeCompare(b.slug));
    result.ar.sort((a, b) => a.slug.localeCompare(b.slug));

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders(), "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders() });
  }
});
