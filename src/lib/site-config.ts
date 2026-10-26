import { supabase } from "./supabase";

export interface PageConfig {
  id: string;
  title: string;
  path: string;
  enabled: boolean;
  category: "core" | "explore" | "learning" | "rewards" | "support" | "user";
  description: string;
  customMessage?: string;
  icon?: string;
}

export interface SiteContentConfig {
  siteName: string;
  tagline: string;
  announcementBanner: {
    enabled: boolean;
    text: string;
    linkText?: string;
    linkUrl?: string;
    variant: "info" | "warning" | "success" | "gradient";
  };
  homeHero: {
    title: string;
    subtitle: string;
    badgeText: string;
  };
  blockedPageMessage: {
    title: string;
    message: string;
    allowRetry: boolean;
  };
  supportContact: {
    email: string;
    telegram: string;
  };
}

export const DEFAULT_PAGES_CONFIG: PageConfig[] = [
  {
    id: "home",
    title: "Home",
    path: "/home",
    enabled: true,
    category: "core",
    description: "Main home dashboard and featured feed.",
    icon: "Home",
  },
  {
    id: "reels",
    title: "Reels Feed",
    path: "/reels",
    enabled: true,
    category: "core",
    description: "Vertical video player and reel scrolling feed.",
    icon: "PlaySquare",
  },
  {
    id: "category",
    title: "Instant Reels (Categories)",
    path: "/category",
    enabled: true,
    category: "core",
    description: "Category-filtered video feeds and channel selector.",
    icon: "Flame",
  },
  {
    id: "explore",
    title: "Explore & Search",
    path: "/explore",
    enabled: true,
    category: "explore",
    description: "Search creators, trending tags, and video discovery.",
    icon: "Search",
  },
  {
    id: "skills",
    title: "Skills & Labs",
    path: "/skills",
    enabled: true,
    category: "learning",
    description: "Interactive skill modules and developer hacking lab.",
    icon: "Wrench",
  },
  {
    id: "english_course",
    title: "English Speaking Course",
    path: "/english-course",
    enabled: true,
    category: "learning",
    description: "Interactive speaking lessons and audio practice labs.",
    icon: "AudioLines",
  },
  {
    id: "my_courses",
    title: "My Batches & Courses",
    path: "/my-courses",
    enabled: true,
    category: "learning",
    description: "Enrolled courses, batches, and progress tracking.",
    icon: "GraduationCap",
  },
  {
    id: "shop",
    title: "Shop & Avatars",
    path: "/shop",
    enabled: true,
    category: "rewards",
    description: "Avatar store, badges, and coin rewards catalog.",
    icon: "ShoppingBag",
  },
  {
    id: "redeem",
    title: "Redeem Earnings",
    path: "/redeem",
    enabled: true,
    category: "rewards",
    description: "Coin conversion, reward redemptions, and cashout history.",
    icon: "Gift",
  },
  {
    id: "leaderboard",
    title: "Leaderboard & Champions",
    path: "/leaderboard",
    enabled: true,
    category: "rewards",
    description: "Global user rankings, streaks, and top creators.",
    icon: "Trophy",
  },
  {
    id: "notifications",
    title: "Notification Center",
    path: "/notifications",
    enabled: true,
    category: "support",
    description: "Realtime broadcasts, alerts, and platform announcements.",
    icon: "Bell",
  },
  {
    id: "feedback",
    title: "Help & Feedback Center",
    path: "/feedback",
    enabled: true,
    category: "support",
    description: "Live feedback, suggestions, and admin support tickets.",
    icon: "MessageSquare",
  },
  {
    id: "history",
    title: "Watch History",
    path: "/history",
    enabled: true,
    category: "user",
    description: "Recently watched video history and playback resumes.",
    icon: "Clock",
  },
  {
    id: "favorites",
    title: "Favorite Creators",
    path: "/favorites",
    enabled: true,
    category: "user",
    description: "Bookmarked creators and quick profile shortcuts.",
    icon: "Users",
  },
  {
    id: "liked",
    title: "Liked Reels",
    path: "/liked",
    enabled: true,
    category: "user",
    description: "Collection of user-liked videos and clips.",
    icon: "Heart",
  },
  {
    id: "saved",
    title: "Saved Reels",
    path: "/saved",
    enabled: true,
    category: "user",
    description: "Bookmarked videos saved for later viewing.",
    icon: "Bookmark",
  },
  {
    id: "about",
    title: "About Us",
    path: "/about",
    enabled: true,
    category: "support",
    description: "Platform mission, features, and brand details.",
    icon: "Info",
  },
];

export const DEFAULT_SITE_CONTENT_CONFIG: SiteContentConfig = {
  siteName: "Shortify",
  tagline: "#1st Reels Universe",
  announcementBanner: {
    enabled: false,
    text: "🎉 Welcome to Shortify! Watch reels, master skills & earn coins daily.",
    linkText: "Explore Now",
    linkUrl: "/explore",
    variant: "gradient",
  },
  homeHero: {
    title: "welcome to shortify.",
    subtitle: "watch reels, master new skills, and level up your game every day.",
    badgeText: "trending right now",
  },
  blockedPageMessage: {
    title: "Page is Blocked for Now",
    message:
      "This page is currently disabled or undergoing temporary maintenance. It may be having updates or resolving issues. Please try again in some time.",
    allowRetry: true,
  },
  supportContact: {
    email: "support@shortify.cc.cd",
    telegram: "t.me/shortify",
  },
};

const LOCAL_STORAGE_PAGES_KEY = "ig.site_pages_config";
const LOCAL_STORAGE_CONTENT_KEY = "ig.site_content_config";

function mergePagesWithDefaults(savedPages: PageConfig[]): PageConfig[] {
  if (!Array.isArray(savedPages)) return DEFAULT_PAGES_CONFIG;
  const map = new Map<string, PageConfig>();
  savedPages.forEach((p) => {
    if (p && p.id) map.set(p.id, p);
  });
  return DEFAULT_PAGES_CONFIG.map((def) => {
    const existing = map.get(def.id);
    if (existing) {
      return {
        ...def,
        enabled: typeof existing.enabled === "boolean" ? existing.enabled : def.enabled,
        customMessage: existing.customMessage || def.customMessage,
      };
    }
    return def;
  });
}

// In-memory caches for synchronous read access
let memoryPagesConfig: PageConfig[] = (() => {
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_PAGES_KEY);
      if (raw) return mergePagesWithDefaults(JSON.parse(raw));
    } catch {}
  }
  return DEFAULT_PAGES_CONFIG;
})();

let memoryContentConfig: SiteContentConfig = (() => {
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_CONTENT_KEY);
      if (raw) return { ...DEFAULT_SITE_CONTENT_CONFIG, ...JSON.parse(raw) };
    } catch {}
  }
  return DEFAULT_SITE_CONTENT_CONFIG;
})();

const configListeners = new Set<() => void>();

export function subscribeSiteConfig(callback: () => void) {
  configListeners.add(callback);
  return () => {
    configListeners.delete(callback);
  };
}

function notifyListeners() {
  configListeners.forEach((cb) => {
    try {
      cb();
    } catch {}
  });
}

/**
 * Synchronous accessors for client components and layout guards
 */
export function getSitePagesConfig(): PageConfig[] {
  return memoryPagesConfig;
}

export function getSiteContentConfig(): SiteContentConfig {
  return memoryContentConfig;
}

/**
 * Checks if a given URL or page ID is currently enabled
 */
export function isRouteEnabled(pathname: string): boolean {
  if (!pathname || pathname === "/" || pathname === "/home") return true;

  // Find matching config rule
  const norm = pathname.toLowerCase();

  // Allow /pin and /pin-setup and /login and /age always
  if (
    norm === "/login" ||
    norm.startsWith("/login") ||
    norm === "/age" ||
    norm === "/pin" ||
    norm === "/pin-setup" ||
    norm.startsWith("/admin") ||
    norm.startsWith("/madarchod")
  ) {
    return true;
  }

  for (const page of memoryPagesConfig) {
    const pPath = page.path.toLowerCase();
    if (norm === pPath || norm.startsWith(`${pPath}/`)) {
      return page.enabled;
    }
    // Also check related special routes
    if (page.id === "my_courses" && norm.startsWith("/course/")) {
      return page.enabled;
    }
    if (page.id === "redeem" && norm.startsWith("/redeem-history")) {
      return page.enabled;
    }
    if (page.id === "feedback" && norm === "/suggestions") {
      return page.enabled;
    }
  }

  return true;
}

export function getBlockedMessageForRoute(pathname: string): { title: string; message: string } {
  const norm = pathname.toLowerCase();
  for (const page of memoryPagesConfig) {
    const pPath = page.path.toLowerCase();
    if (norm === pPath || norm.startsWith(`${pPath}/`)) {
      if (page.customMessage && page.customMessage.trim().length > 0) {
        return {
          title: `${page.title} is Unavailable`,
          message: page.customMessage,
        };
      }
      return {
        title: `${page.title} is Blocked for Now`,
        message: memoryContentConfig.blockedPageMessage.message,
      };
    }
  }

  return {
    title: memoryContentConfig.blockedPageMessage.title,
    message: memoryContentConfig.blockedPageMessage.message,
  };
}

/**
 * Fetch latest settings from Supabase and initialize realtime channel
 */
let realtimeSubscribed = false;

export async function initSiteConfig() {
  try {
    const { data: rows, error } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["site_pages_config", "site_content_config"]);

    if (!error && rows) {
      for (const row of rows) {
        if (row.key === "site_pages_config" && row.value) {
          memoryPagesConfig = mergePagesWithDefaults(row.value);
          if (typeof localStorage !== "undefined") {
            localStorage.setItem(LOCAL_STORAGE_PAGES_KEY, JSON.stringify(memoryPagesConfig));
          }
        }
        if (row.key === "site_content_config" && row.value) {
          memoryContentConfig = { ...DEFAULT_SITE_CONTENT_CONFIG, ...row.value };
          if (typeof localStorage !== "undefined") {
            localStorage.setItem(LOCAL_STORAGE_CONTENT_KEY, JSON.stringify(memoryContentConfig));
          }
        }
      }
      notifyListeners();
    }
  } catch {}

  // Setup Realtime Subscription
  if (!realtimeSubscribed && typeof window !== "undefined") {
    realtimeSubscribed = true;
    try {
      const channelId = `platform-settings-realtime-${Math.random().toString(36).slice(2, 8)}`;
      supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "platform_settings" },
          (payload: any) => {
            const row = payload.new;
            if (row && row.key === "site_pages_config" && row.value) {
              memoryPagesConfig = mergePagesWithDefaults(row.value);
              if (typeof localStorage !== "undefined") {
                localStorage.setItem(LOCAL_STORAGE_PAGES_KEY, JSON.stringify(memoryPagesConfig));
              }
              notifyListeners();
            }
            if (row && row.key === "site_content_config" && row.value) {
              memoryContentConfig = { ...DEFAULT_SITE_CONTENT_CONFIG, ...row.value };
              if (typeof localStorage !== "undefined") {
                localStorage.setItem(
                  LOCAL_STORAGE_CONTENT_KEY,
                  JSON.stringify(memoryContentConfig),
                );
              }
              notifyListeners();
            }
          },
        )
        .subscribe();
    } catch {}
  }
}

/**
 * Admin action: Save updated pages visibility and config
 */
export async function saveSitePagesConfig(pages: PageConfig[]): Promise<void> {
  const merged = mergePagesWithDefaults(pages);
  memoryPagesConfig = merged;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(LOCAL_STORAGE_PAGES_KEY, JSON.stringify(merged));
  }
  notifyListeners();

  const { error } = await supabase.rpc("admin_set_platform_setting", {
    p_key: "site_pages_config",
    p_value: merged,
  });

  if (error) {
    await supabase.from("platform_settings").upsert({
      key: "site_pages_config",
      value: merged,
    });
  }
}

/**
 * Admin action: Save updated website content and banner config
 */
export async function saveSiteContentConfig(content: SiteContentConfig): Promise<void> {
  const merged = { ...DEFAULT_SITE_CONTENT_CONFIG, ...content };
  memoryContentConfig = merged;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(LOCAL_STORAGE_CONTENT_KEY, JSON.stringify(merged));
  }
  notifyListeners();

  const { error } = await supabase.rpc("admin_set_platform_setting", {
    p_key: "site_content_config",
    p_value: merged,
  });

  if (error) {
    await supabase.from("platform_settings").upsert({
      key: "site_content_config",
      value: merged,
    });
  }
}
