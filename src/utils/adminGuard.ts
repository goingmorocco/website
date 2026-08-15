// Client-side gate for admin pages. This is a UX convenience (redirects
// people away who obviously shouldn't be here) — NOT the real security
// boundary. The actual security is the RLS policies in admin-schema.sql,
// which enforce admin-only access at the database level regardless of
// what this check does or whether someone bypasses it in devtools.
import { supabase } from "./supabaseClient";

export async function requireAdmin(): Promise<{ userId: string } | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    window.location.href = "/account/login/";
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", sessionData.session.user.id)
    .single();

  if (profile?.role !== "admin") {
    window.location.href = "/";
    return null;
  }

  return { userId: sessionData.session.user.id };
}
