// Shared Supabase client. Uses the public anon key, which is safe to expose
// in browser code by design — Supabase's actual security boundary is the
// Row Level Security policies in the database (see supabase-schema.sql),
// not keeping this key secret.
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
