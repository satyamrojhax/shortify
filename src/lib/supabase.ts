import { createClient } from "@supabase/supabase-js";

// Use Vite/Vercel proxy to hide the real URL from the frontend
const supabaseUrl = typeof window !== "undefined" ? `${window.location.origin}/shortify` : "http://localhost/shortify";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
