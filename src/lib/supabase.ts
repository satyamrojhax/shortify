import { createClient } from "@supabase/supabase-js";

// Use direct URL for WebSockets since proxies (like Vercel rewrites) often drop the connection
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://mcrhjyszrxbtiizhgacn.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

// We previously used a proxied URL which caused Supabase to generate a different storage key.
// To prevent logging out existing users, we explicitly set the storage key to match the old proxy behavior.
const legacyHostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
const storageKey = `sb-${legacyHostname.split('.')[0]}-auth-token`;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey,
  }
});
