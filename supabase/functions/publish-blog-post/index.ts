// Supabase Edge Function: publish-blog-post
//
// Deploy with:
//   supabase functions deploy publish-blog-post
//
// Then set these two secrets (never put them in client-side code):
//   supabase secrets set GITHUB_TOKEN=ghp_your_token_here
//   supabase secrets set GITHUB_REPO=your-github-username/goingmorocco-astro
//
// The GitHub token needs "repo" scope (Settings > Developer settings >
// Personal access tokens > Fine-grained, or classic with "repo" scope) on
// your GoingMorocco repo specifically. Treat it like a password.
//
// This function verifies the caller is an admin (via their Supabase auth
// token) before ever touching GitHub — the actual write permission lives
// here, server-side, never in the browser.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN")!;
const GITHUB_REPO = Deno.env.get("GITHUB_REPO")!; // e.g. "yourname/goingmorocco-astro"
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
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

    // ---------- Build the .mdx file content ----------
    const body = await req.json();
    const {
      locale, // "en" | "ar"
      slug,
      title,
      description,
      category,
      tags, // string[]
      featuredImage,
      featuredImageAlt,
      bodyMdx, // already-converted MDX body text, from the browser
      imports, // any "import X from ..." lines needed (YouTube/Instagram/TikTok embeds), from the browser
      publishDate, // "YYYY-MM-DD"
      author,
    } = body;

    if (!slug || !title || !bodyMdx) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: corsHeaders() });
    }

    const frontmatter = [
      "---",
      `title: "${String(title).replace(/"/g, '\\"')}"`,
      `description: "${String(description ?? "").replace(/"/g, '\\"')}"`,
      `locale: "${locale}"`,
      `slug: "${slug}"`,
      `publishDate: ${publishDate}`,
      `author: "${author ?? "Waleed Taklite"}"`,
      `category: "${category}"`,
      `tags: ${JSON.stringify(tags ?? [])}`,
      `featuredImage: "${featuredImage ?? ""}"`,
      `featuredImageAlt: "${String(featuredImageAlt ?? "").replace(/"/g, '\\"')}"`,
      "draft: false",
      "---",
    ].join("\n");

    const fileContent = `${frontmatter}\n\n${imports ? imports + "\n\n" : ""}${bodyMdx}`;
    const filePath = `src/content/blog/${locale}/${slug}.mdx`;

    // ---------- Commit to GitHub via the Contents API ----------
    const githubUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;

    const encoder = new TextEncoder();
    const bytes = encoder.encode(fileContent);
    const base64Content = btoa(String.fromCharCode(...bytes));

    const githubResponse = await fetch(githubUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "GoingMorocco-Admin-Dashboard",
      },
      body: JSON.stringify({
        message: `Add blog post: ${title}`,
        content: base64Content,
        branch: "main",
      }),
    });

    if (!githubResponse.ok) {
      const errText = await githubResponse.text();
      return new Response(JSON.stringify({ error: `GitHub API error: ${errText}` }), { status: 500, headers: corsHeaders() });
    }

    const githubResult = await githubResponse.json();

    return new Response(
      JSON.stringify({ success: true, path: filePath, commitUrl: githubResult.commit?.html_url }),
      { status: 200, headers: { ...corsHeaders(), "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders() });
  }
});
