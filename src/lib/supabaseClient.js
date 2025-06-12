import { createClient } from "@supabase/supabase-js";

// Only call createClient once on first import
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
