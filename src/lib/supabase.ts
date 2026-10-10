import { createClient } from "@supabase/supabase-js";

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

// We must use the direct Supabase URL for all requests.
// Why?
// 1. Vercel rewrites DO NOT support WebSockets, breaking Realtime completely.
// 2. Proxied Vercel rewrites add latency that causes Service Worker 5s timeouts (ERR_FAILED).
// 3. Using two separate clients causes "Multiple GoTrueClient instances" warnings and session race conditions.
// Note: Supabase URLs and Anon Keys are explicitly designed to be public. Your DB is secured by RLS, not by hiding the URL.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://mcrhjyszrxbtiizhgacn.supabase.co";

// To prevent logging out existing users from when the proxy was used, we keep the old storage key.
const legacyHostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
const storageKey = `sb-${legacyHostname.split('.')[0]}-auth-token`;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey,
  }
});

