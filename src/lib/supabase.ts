import { createClient } from "@supabase/supabase-js";

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

// We previously used a proxied URL which caused Supabase to generate a different storage key.
// To prevent logging out existing users, we explicitly set the storage key to match the old proxy behavior.
const legacyHostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
const storageKey = `sb-${legacyHostname.split('.')[0]}-auth-token`;

// 1. Primary Client (Proxied): Hides the Supabase URL for all REST/Auth calls
const proxiedUrl = typeof window !== "undefined" ? `${window.location.origin}/shortify` : "http://localhost/shortify";
export const supabase = createClient(proxiedUrl, supabaseAnonKey, {
  auth: {
    storageKey,
  }
});

// 2. Realtime Client (Direct): Vercel rewrites do not support WebSocket connections.
// We must connect directly to Supabase for Realtime to work.
const directUrl = import.meta.env.VITE_SUPABASE_URL || "https://mcrhjyszrxbtiizhgacn.supabase.co";
export const realtimeSupabase = createClient(directUrl, supabaseAnonKey, {
  auth: {
    storageKey,
  }
});
