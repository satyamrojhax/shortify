import { createClient } from "@supabase/supabase-js";

// Use direct URL for WebSockets since proxies (like Vercel rewrites) often drop the connection
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://mcrhjyszrxbtiizhgacn.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
