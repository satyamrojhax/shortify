import { createClient } from "@supabase/supabase-js";

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

// Vercel Edge proxy rewrites DO NOT support WebSockets, which breaks Realtime if proxied.
// To hide the base URL for standard REST queries as requested, we intercept fetch calls
// and route them through the proxy. Realtime will bypass this and use the direct WSS URL.
const supabaseUrl = "https://mcrhjyszrxbtiizhgacn.supabase.co";
const proxyUrl = import.meta.env.VITE_SUPABASE_URL || "/shortify";

// To prevent logging out existing users from when the proxy was used, we keep the old storage key.
const legacyHostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
const storageKey = `sb-${legacyHostname.split(".")[0]}-auth-token`;

const getSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey,
    },
    global: {
      fetch: (input, init) => {
        try {
          const rawUrl =
            typeof input === "string"
              ? input
              : input instanceof URL
                ? input.href
                : input instanceof Request
                  ? input.url
                  : "";
          if (rawUrl) {
            const parsed = new URL(
              rawUrl,
              typeof window !== "undefined" ? window.location.origin : "http://localhost",
            );
            if (parsed.origin === "https://mcrhjyszrxbtiizhgacn.supabase.co") {
              const newUrl = `${proxyUrl}${parsed.pathname}${parsed.search}`;
              if (input instanceof Request) {
                return fetch(new Request(newUrl, input), init);
              }
              return fetch(newUrl, init);
            }
          }
        } catch {
          // Fall through to standard fetch if parsing fails
        }
        return fetch(input, init);
      },
    },
  });
};

// Cache the instance on the window object to prevent multiple GoTrueClient warnings during HMR
const globalWindow = typeof window !== "undefined" ? (window as any) : null;

export const supabase = globalWindow?.__supabaseClient || getSupabaseClient();

if (globalWindow && !globalWindow.__supabaseClient) {
  globalWindow.__supabaseClient = supabase;
}
