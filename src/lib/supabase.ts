import { createClient } from "@supabase/supabase-js";

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

// Vercel Edge proxy rewrites DO NOT support WebSockets, which breaks Realtime if proxied.
// To hide the base URL for standard REST queries as requested, we intercept fetch calls
// and route them through the proxy. Realtime will bypass this and use the direct WSS URL.
const supabaseUrl = "https://mcrhjyszrxbtiizhgacn.supabase.co";
const proxyUrl = import.meta.env.VITE_SUPABASE_URL || "/shortify";

// Standard Supabase storage key based on project reference
export const SUPABASE_PROJECT_REF = "mcrhjyszrxbtiizhgacn";
export const SUPABASE_STORAGE_KEY = `sb-${SUPABASE_PROJECT_REF}-auth-token`;

// Migrate tokens across all legacy/hostname storage keys if present
if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
  try {
    const active = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (!active) {
      const legacyHostname = window.location.hostname.split(".")[0];
      const candidates = [
        `sb-${legacyHostname}-auth-token`,
        "sb-localhost-auth-token",
        "sb-127-auth-token",
        "sb-shortify-auth-token",
      ];
      for (const candidate of candidates) {
        const val = localStorage.getItem(candidate);
        if (val) {
          localStorage.setItem(SUPABASE_STORAGE_KEY, val);
          break;
        }
      }
    }
  } catch {}
}

const getSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: SUPABASE_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
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

if (typeof window !== "undefined") {
  try {
    supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session) {
        import("@/lib/idb-auth")
          .then(({ saveAuthToIdb }) => {
            saveAuthToIdb({ sb_auth_token: JSON.stringify(session) }).catch(() => {});
          })
          .catch(() => {});
      }
    });
  } catch {}
}
