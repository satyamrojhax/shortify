import { createClient } from "@supabase/supabase-js";

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

// Vercel Edge proxy rewrites DO NOT support WebSockets, which breaks Realtime if proxied.
// To hide the base URL for standard REST queries as requested, we intercept fetch calls
// and route them through the proxy. Realtime will bypass this and use the direct WSS URL.
const supabaseUrl = "https://mcrhjyszrxbtiizhgacn.supabase.co";
const proxyUrl = import.meta.env.VITE_SUPABASE_URL || "/shortify";

// To prevent logging out existing users from when the proxy was used, we keep the old storage key.
const legacyHostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
const storageKey = `sb-${legacyHostname.split('.')[0]}-auth-token`;

const getSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey,
    },
    global: {
      fetch: (input, init) => {
        if (typeof input === "string" && input.startsWith(supabaseUrl)) {
          return fetch(input.replace(supabaseUrl, proxyUrl), init);
        } else if (input instanceof URL && input.href.startsWith(supabaseUrl)) {
          return fetch(input.href.replace(supabaseUrl, proxyUrl), init);
        }
        return fetch(input, init);
      }
    }
  });
};

// Cache the instance on the window object to prevent multiple GoTrueClient warnings during HMR
const globalWindow = typeof window !== "undefined" ? (window as any) : null;

export const supabase = globalWindow?.__supabaseClient || getSupabaseClient();

if (globalWindow && !globalWindow.__supabaseClient) {
  globalWindow.__supabaseClient = supabase;
}
