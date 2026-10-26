import { secureMathRandom } from "@/lib/utils";
import { getRandomMode } from "./storage";
import { videoCache } from "./video-cache";

export type Reel = {
  id: string;
  source:
    "trending" | "shorts" | "creator" | "local" | "insta_" | "liked" | "live" | "category" | string;
  videoUrl: string;
  thumbnail?: string;
  title?: string;
  description?: string;
  duration?: string;
  views?: number;
  likes?: number;
  dislikes?: number;
  timeAgo?: string;
  username?: string;
  creator_name?: string;
  creator_image?: string;
  comments?: any[];
  isLive?: boolean;
  viewersCount?: number;
  streamUrl?: string;
  status?: string;
  category?: string;
  originPlayer?: "normal" | "category";
  originCategory?: string;
  originSystem?: "shorts" | "viraly";
  modelId?: string;
};

export interface LiveWebcamItem {
  id: number | string;
  username: string;
  avatarUrl?: string;
  popularSnapshotUrl?: string;
  snapshotUrl?: string;
  clickUrl?: string;
  previewUrlThumbSmall?: string;
  viewersCount: number;
  favoritedCount?: number;
  stream?: string;
  streamUrl?: string;
  status?: string;
}

export interface LiveWebcamsResponse {
  status: string;
  count: number;
  page_total?: number;
  totalPages?: number;
  total_videos?: number;
  totalVideos?: number;
  page_now?: number;
  page?: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
  previousPage?: number | null;
  nextPage?: number | null;
  previousPageUrl?: string | null;
  nextPageUrl?: string | null;
  data: LiveWebcamItem[];
}

export function mapWebcamToReel(item: LiveWebcamItem): Reel {
  const stream = item.stream || item.streamUrl || "";
  const thumb = item.snapshotUrl || item.popularSnapshotUrl || item.previewUrlThumbSmall || "";
  return {
    id: `live-${item.id}`,
    source: "live",
    videoUrl: stream,
    streamUrl: stream,
    thumbnail: thumb,
    title: item.username,
    description: `Watch ${item.username} live streaming on Shortify`,
    views: item.viewersCount || 0,
    viewersCount: item.viewersCount || 0,
    username: item.username,
    creator_image: item.avatarUrl,
    isLive: true,
    status: item.status || "live",
    modelId: String(item.id),
  };
}

export async function fetchLiveWebcams(page = 1): Promise<{
  items: Reel[];
  hasNextPage: boolean;
  nextPage: number | null;
  totalPages: number;
}> {
  let json: LiveWebcamsResponse | null = null;

  try {
    const res = await fetch(`/api/webcams/?page=${page}`, {
      headers: {
        accept: "application/json",
        "x-requested-with": "XMLHttpRequest",
      },
    });
    if (res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        json = await res.json();
      } else {
        const text = await res.text();
        try {
          json = JSON.parse(text);
        } catch {
          console.error("Non-JSON response received from /api/webcams/:", text.slice(0, 150));
        }
      }
    }
  } catch (err) {
    console.error("Failed to fetch live webcams via proxy:", err);
  }

  const items = (json?.data || []).map(mapWebcamToReel);
  const totalPages = Number(json?.page_total ?? json?.totalPages ?? 1);
  const pageNow = Number(json?.page_now ?? json?.page ?? page);
  const hasNextPage = json?.hasNextPage ?? pageNow < totalPages;
  const nextPage = hasNextPage ? pageNow + 1 : null;

  return {
    items,
    hasNextPage,
    nextPage,
    totalPages,
  };
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(secureMathRandom() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hashCode(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

// ─── Local DB loading (eagerly initiated at module import) ────────────────────

let localDb: Reel[] = [];
/** Single shared promise — multiple callers await the same load. */
let dbLoadPromise: Promise<void> | null = null;

function startDatabaseLoad(): Promise<void> {
  if (dbLoadPromise) return dbLoadPromise;
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    dbLoadPromise = Promise.resolve();
    return dbLoadPromise;
  }
  dbLoadPromise = (async () => {
    try {
      const localRes = await fetch("https://speaking.shortify.cc.cd/v1-reels-db.json");

      if (localRes.ok) {
        const localDbRaw = await localRes.json();
        localDb = shuffle(
          (localDbRaw as any[]).map((v, i) => ({
            id: `local-${i}-${hashCode(v.url)}`,
            source: "local" as const,
            videoUrl: v.url,
            views: v.views,
            likes: v.likes,
            title: "Watch Reels 18+",
          })),
        );
      }
    } catch (error) {
      console.error("Failed to load databases:", error);
    }
  })();
  return dbLoadPromise;
}

// Kick off the DB load immediately at import time — no waiting for first request
if (typeof window !== "undefined") {
  startDatabaseLoad();
}

async function ensureDatabasesLoaded(): Promise<void> {
  await startDatabaseLoad();
}

// ─── Network Fetching & ViralXXXPorn Shorts Proxy ────────────────────────────

const SHORTS_HEADERS: Record<string, string> = {
  accept: "application/json",
  "x-requested-with": "XMLHttpRequest",
  "user-agent":
    "Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36",
};

async function fetchWithRetry(url: string, attempts = 2): Promise<Response | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: SHORTS_HEADERS });
      if (res.ok) return res;
      if (res.status >= 400 && res.status < 500 && res.status !== 429) return null;
    } catch {}
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, 250 + secureMathRandom() * 150));
    }
  }
  return null;
}

export async function fetchShortsApi(subpath: string): Promise<any> {
  const cleanSubpath = subpath
    .replace(/^\/api\/shorts\/?/, "")
    .replace(/^https:\/\/viralxxxporn\.com\/api\/shorts\/?/, "");

  let normalized = cleanSubpath;
  if (!normalized.startsWith("/") && !normalized.startsWith("?")) {
    normalized = "/" + normalized;
  }
  if (normalized.startsWith("?")) {
    normalized = "/?" + normalized.slice(1);
  }
  const [pathname, search] = normalized.split("?");
  const safePath = pathname.endsWith("/") ? pathname : `${pathname}/`;
  const queryString = search ? `?${search}` : "";
  const proxyUrl = `/api/shorts${safePath}${queryString}`;

  try {
    const res = await fetch(proxyUrl, { headers: SHORTS_HEADERS });
    if (res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (data && (data.data || data.comments || data.status === "200")) {
          return data;
        }
      } else {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          if (data && (data.data || data.comments || data.status === "200")) {
            return data;
          }
        } catch {
          console.error("Non-JSON response received from /api/shorts/:", text.slice(0, 150));
        }
      }
    }
  } catch (err) {
    console.error("Failed to fetch shorts via proxy:", err);
  }

  return null;
}

export function mapShortToReel(item: any, source: string = "trending"): Reel {
  const model = Array.isArray(item.model) && item.model.length > 0 ? item.model[0] : null;
  // Use model_dir as the exact directory slug for API lookups and routing, and model_name for display
  const username = model?.model_dir || model?.model_name || "Creator";
  const creatorDisplayName = model?.model_name || model?.model_dir || "Creator";
  const avatarUrl =
    model?.model_foto_url && model.model_foto_url !== "None" ? model.model_foto_url : undefined;

  const categoryName =
    Array.isArray(item.categories) && item.categories.length > 0
      ? item.categories[0]?.category_name
      : undefined;

  return {
    id: `short-${item.video_id}`,
    source,
    videoUrl: item.video_preview,
    thumbnail: item.images_preview,
    title: item.video_name || "Short",
    description: item.video_description || "",
    duration: item.duration ? `${item.duration}s` : undefined,
    views: item.video_viewed ? parseInt(item.video_viewed, 10) : item.video_viewed_today || 0,
    likes: item.count_like ? parseInt(item.count_like, 10) : 0,
    timeAgo: item.added_date,
    username,
    creator_name: creatorDisplayName,
    creator_image: avatarUrl,
    category: categoryName,
    originPlayer: "normal",
    originSystem: "shorts",
    comments: [],
  };
}

export async function fetchReelComments(videoId: string, page = 1): Promise<any[]> {
  const cleanId = String(videoId)
    .replace(/^short-/, "")
    .replace(/^[a-z]+-/, "");
  if (!cleanId || !/^\d+$/.test(cleanId)) return [];

  const cacheKey = `comments::${cleanId}::p${page}`;
  const cached = await videoCache.get<any[]>(cacheKey);
  if (cached) return cached;

  const endpoint = `/comments/?video_id=${cleanId}&page=${page}`;
  const json = await fetchShortsApi(endpoint);
  const rawComments = json?.comments || json?.data || [];
  const comments = (Array.isArray(rawComments) ? rawComments : []).map((c: any, idx: number) => ({
    id: c.comment_id || `c-${idx}`,
    comment: c.comment || c.comment_text || c.text || c.content || "",
    username: c.username || c.user_name || c.user || c.name || "Anonymous",
    avatar: c.user_avatar || c.avatar_url || c.avatar || undefined,
    added_date: c.added_date || c.date || c.created_at || "recently",
    likes: c.likes_count || c.likes || 0,
  }));

  if (comments.length > 0) {
    videoCache.set(cacheKey, comments).catch(() => {});
  }
  return comments;
}

export async function fetchTrendingShorts(page: number): Promise<Reel[]> {
  const safePage = Math.max(1, page);
  const cacheKey = `shorts::trending::p${safePage}`;
  const cached = await videoCache.get<Reel[]>(cacheKey);
  if (cached) return cached;

  const endpoint = `/?page=${safePage}&sort_by=video_viewed_today&post_date_from=1`;
  const json = await fetchShortsApi(endpoint);
  const list = json?.data || [];
  const reels = (Array.isArray(list) ? list : []).map((item: any) =>
    mapShortToReel(item, "trending"),
  );

  if (reels.length > 0) {
    videoCache.set(cacheKey, reels).catch(() => {});
  }
  return reels;
}

export async function fetchAllShorts(page: number): Promise<Reel[]> {
  const safePage = Math.max(1, page);
  const cacheKey = `shorts::all::p${safePage}`;
  const cached = await videoCache.get<Reel[]>(cacheKey);
  if (cached) return cached;

  const endpoint = `/?page=${safePage}`;
  const json = await fetchShortsApi(endpoint);
  const list = json?.data || [];
  const reels = (Array.isArray(list) ? list : []).map((item: any) =>
    mapShortToReel(item, "shorts"),
  );

  if (reels.length > 0) {
    videoCache.set(cacheKey, reels).catch(() => {});
  }
  return reels;
}

async function fetchLatestReels(page: number): Promise<Reel[]> {
  const apiPage = Math.max(0, page - 1);
  const cacheKey = `shortify::latest::p${apiPage}`;

  const cached = await videoCache.get<Reel[]>(cacheKey);
  if (cached) return cached;

  const res = await fetchWithRetry(`https://love.shortify.cc.cd/api/latest-reels?page=${apiPage}`);
  if (!res) return [];
  try {
    const rawJson = await res.json();
    const arr = Array.isArray(rawJson) ? rawJson : rawJson.data || [];
    const reels: Reel[] = arr.map((v: any) => ({
      id: `latest-${v.id}`,
      source: "saved",
      originPlayer: "category",
      originSystem: "viraly",
      videoUrl: v.videoUrl,
      thumbnail: v.thumbnail,
      title: v.title,
      description: v.description,
      duration: v.duration,
      views: v.views,
      likes: v.likes,
      dislikes: v.dislikes,
      username: v.username,
      creator_image:
        v.creator_image ||
        (v.username
          ? `https://love.viraly.wtf/profileImages/${encodeURIComponent(v.username)}.jpg`
          : undefined),
    }));
    videoCache.set(cacheKey, reels).catch(() => {});
    return reels;
  } catch {
    return [];
  }
}

async function fetchCategoryReels(category: string): Promise<Reel[]> {
  const res = await fetchWithRetry(
    `https://love.shortify.cc.cd/api/categories/${encodeURIComponent(category)}`,
  );
  if (!res) return [];
  try {
    const rawJson = await res.json();
    const arr = Array.isArray(rawJson) ? rawJson : rawJson.data || [];
    const reels: Reel[] = arr.map((v: any) => ({
      id: `category-${v.id}`,
      source: "category",
      originPlayer: "category",
      originSystem: "viraly",
      videoUrl: v.videoUrl,
      thumbnail: v.thumbnail,
      title: v.title,
      description: v.description,
      duration: v.duration,
      views: v.views,
      likes: v.likes,
      dislikes: v.dislikes,
      username: v.username,
      creator_image:
        v.creator_image ||
        (v.username
          ? `https://love.viraly.wtf/profileImages/${encodeURIComponent(v.username)}.jpg`
          : undefined),
    }));
    return reels;
  } catch {
    return [];
  }
}

export const CATEGORIES = [
  "Explore",
  "18+",
  "Desi",
  "Homemade",
  "Couple",
  "College(18+)",
  "Gay",
  "Lesbian",
  "Shemale",
  "Asian",
  "JAV",
  "Japanese(JAV)",
  "American",
  "Latina",
  "Ebony",
  "Interracial",
  "Amateur",
  "AI",
  "MILF",
  "Anal",
  "Mature",
  "Big-Ass",
  "Big-Tits",
  "Curvy",
  "Petite",
  "Girlfriend",
  "Wife",
  "Threesome",
  "Group",
  "Swingers",
  "Cuckold",
  "Blowjob",
  "Oral",
  "Deepthroat",
  "Creampie",
  "Facial",
  "Cowgirl",
  "Reverse-Cowgirl",
  "Cam",
  "Self-Shot",
  "Mobile-Recorded",
  "Hidden-Cam",
  "Spy-Cam",
  "Webcam",
  "Live-Cam",
  "Flash",
  "Hentai",
  "Cosplay",
  "Roleplay",
  "Uniforms",
  "Massage",
  "Office",
  "Hotel",
  "Public",
  "Outdoor",
  "Car",
  "Gym",
  "Shower",
  "BDSM",
  "Bondage",
  "Domination",
  "Submission",
  "Foot-Fetish",
  "Stockings",
  "Latex",
  "Leather",
  "Pantyhose",
  "Fashion",
  "3D",
  "Women",
  "Men",
  "Solo-Female",
  "Solo-Male",
  "Masturbation",
  "Toys",
  "LGBT",
  "Bisexual",
  "Trans",
  "Transgender",
  "Female-Domination",
  "Romantic",
  "Passionate",
  "Slow",
  "Rough",
  "Vintage",
  "Retro",
  "Classic",
  "Hardcore",
  "Softcore",
  "Bhabhi",
  "Aunty",
  "Indian-Wife",
  "Hindi",
  "Telugu",
  "Tamil",
  "Malayalam",
  "Punjabi",
  "Bengali",
  "Desi-Village",
  "Indian-Webcam",
];

let localDbOffset = 0;

export type FeedFilter = "all" | "local" | "trending" | "latest" | `category:${string}`;

export async function fetchReelsPage(
  page: number,
  filter: FeedFilter = "all",
): Promise<{ items: Reel[]; nextPage: number }> {
  // Full feed-page cache — covers entire assembled page including local DB slices
  const feedCacheKey = `feed::${filter}::p${page}`;

  // Only use feed cache in non-random mode, and NOT for categories (which need fresh data on navigation)
  const isRandom = getRandomMode();
  if (!isRandom && !filter.startsWith("category:")) {
    const cached = await videoCache.get<{ items: Reel[]; nextPage: number }>(feedCacheKey);
    if (cached) return cached;
  }

  await ensureDatabasesLoaded();

  let selectedReels: Reel[] = [];

  switch (filter) {
    case "local": {
      if (isRandom) {
        selectedReels.push(...shuffle(localDb).slice(0, 30));
      } else {
        let slice = localDb.slice(localDbOffset, localDbOffset + 30);
        if (slice.length < 30) {
          slice = [...slice, ...localDb.slice(0, 30 - slice.length)];
        }
        localDbOffset = (localDbOffset + 30) % Math.max(1, localDb.length);
        selectedReels.push(...slice);
      }
      break;
    }

    case "trending": {
      const trending = await fetchTrendingShorts(page);
      selectedReels.push(...trending);
      break;
    }

    case "all": {
      // 1. Fetch Trending Shorts for current page
      const trending = await fetchTrendingShorts(page);

      // 2. Fetch All Shorts for current page
      const allShorts = await fetchAllShorts(page);

      // 3. Fetch Local Reels slice for current page (step-by-step per page)
      let localSlice: Reel[] = [];
      if (localDb.length > 0) {
        if (isRandom) {
          localSlice = shuffle(localDb).slice(0, 16);
        } else {
          const lOffset = ((page - 1) * 16) % localDb.length;
          localSlice = localDb.slice(lOffset, lOffset + 16);
          if (localSlice.length < 16) {
            localSlice = [...localSlice, ...localDb.slice(0, 16 - localSlice.length)];
          }
        }
      }

      // 4. Interleave trending, all-shorts, and local reels evenly:
      // [trending[0], allShorts[0], localSlice[0], trending[1], allShorts[1], localSlice[1], ...]
      const mixed: Reel[] = [];
      const maxLen = Math.max(trending.length, allShorts.length, localSlice.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < trending.length) mixed.push(trending[i]);
        if (i < allShorts.length) mixed.push(allShorts[i]);
        if (i < localSlice.length) mixed.push(localSlice[i]);
      }

      if (mixed.length > 0) {
        selectedReels.push(...mixed);
      } else if (trending.length > 0) {
        selectedReels.push(...trending);
      } else if (allShorts.length > 0) {
        selectedReels.push(...allShorts);
      } else if (localSlice.length > 0) {
        selectedReels.push(...localSlice);
      }
      break;
    }

    case "latest": {
      const res = await fetchLatestReels(page);
      selectedReels.push(...res);
      break;
    }

    default: {
      if (filter.startsWith("category:")) {
        const categoryName = filter.split(":")[1] || "Explore";
        const res = await fetchCategoryReels(categoryName);
        selectedReels.push(...res);
        break;
      }
      break;
    }
  }

  if (isRandom) {
    selectedReels = shuffle(selectedReels);
  }

  const seen = new Set<string>();
  const deduped = selectedReels.filter((r) => {
    if (seen.has(r.videoUrl)) return false;
    seen.add(r.videoUrl);
    return true;
  });

  if (deduped.length === 0) {
    // If empty for some reason, fallback to local reels to guarantee content
    if (localDb.length > 0) {
      deduped.push(...localDb.slice(0, 15));
    } else {
      throw new Error("Couldn't load reels. Please check your connection and try again.");
    }
  }

  const result = { items: deduped, nextPage: page + 1 };

  // Cache the assembled page (except for random mode and categories)
  if (!isRandom && !filter.startsWith("category:")) {
    videoCache.set(feedCacheKey, result).catch(() => {});
  }

  return result;
}

/**
 * Background-prefetch a page into the cache without returning it.
 * Call this to warm the next page before the user scrolls to it.
 */
export function prefetchReelsPage(page: number, filter: FeedFilter = "all"): void {
  fetchReelsPage(page, filter).catch(() => {});
}

export function warmAllFilters(): void {
  // Avoid unnecessary API calls upfront
}

/**
 * Resolves directory slug candidates for ViralXXXPorn shorts models
 * Handles names with spaces (e.g. "Cassie Lee" -> "cassie-lee"),
 * underscores ("Radiant_Casey" -> "u-radiant-casey"), and prefixes ("starwarros" -> "u-starwarros")
 */
export function getShortsModelCandidates(username: string): string[] {
  const raw = username.trim();
  const lower = raw.toLowerCase();
  const hyphenSlug = lower
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/^-+|-+$/g, "");
  const underscoreSlug = lower
    .replace(/[-\s]+/g, "_")
    .replace(/[^a-z0-9_]+/g, "")
    .replace(/^_+|_+$/g, "");

  const list = [
    raw,
    hyphenSlug,
    `u-${hyphenSlug}`,
    hyphenSlug.replace(/^u-/, ""),
    underscoreSlug,
    `u_${underscoreSlug}`,
  ];
  return [...new Set(list.filter(Boolean))];
}

export async function fetchCreatorReelsPage(
  username: string,
  type: "latest" | "popular",
  page: number,
  source?: "shorts" | "viraly",
): Promise<{ items: Reel[]; nextPage: number | undefined; modelInfo?: any }> {
  const cleanUser = username.trim();
  const safePage = Math.max(0, page);
  const cacheKey = `creator::${source || "any"}::${cleanUser.toLowerCase()}::${type}::p${safePage}`;

  const cached = await videoCache.get<{
    items: Reel[];
    nextPage: number | undefined;
    modelInfo?: any;
  }>(cacheKey);
  if (cached) return cached;

  // SYSTEM B: SHORTS (Normal Reels Player — ViralXXXPorn proxy ONLY)
  if (source === "shorts") {
    try {
      const modelPage = safePage === 0 ? 1 : safePage;
      const sortParam = type === "popular" ? "&sort_by=video_viewed" : "";
      const candidates = getShortsModelCandidates(cleanUser);

      for (const candidate of candidates) {
        const endpoint = `/?model=${encodeURIComponent(candidate)}&page=${modelPage}${sortParam}`;
        const json = await fetchShortsApi(endpoint);

        if (json && json.data && Array.isArray(json.data) && json.data.length > 0) {
          const reels = json.data.map((item: any) => mapShortToReel(item, "creator"));
          const totalPages = parseInt(json.page_total || "1", 10);
          const nextPage = modelPage < totalPages ? modelPage + 1 : undefined;
          const res = { items: reels, nextPage, modelInfo: json.model_info };
          videoCache.set(cacheKey, res).catch(() => {});
          return res;
        }
      }
    } catch {
      // ignore
    }
    return { items: [], nextPage: undefined };
  }

  // SYSTEM A: VIRALY (Categories, Explore, Latest — love.shortify.cc.cd ONLY)
  if (source === "viraly") {
    try {
      const viralyRes = await fetchWithRetry(
        `https://love.shortify.cc.cd/api/creator?creator=${encodeURIComponent(cleanUser)}&type=${type}&page=${safePage}`,
      );

      if (viralyRes && viralyRes.ok) {
        const rawJson = await viralyRes.json();
        const arr = Array.isArray(rawJson) ? rawJson : rawJson.data || [];
        if (arr.length > 0) {
          const reels: Reel[] = arr.map((v: any) => ({
            id: `creator-${v.id || hashCode(v.videoUrl || v.thumbnail || "")}`,
            source: "creator",
            originPlayer: "category",
            originSystem: "viraly",
            videoUrl: v.videoUrl,
            thumbnail: v.thumbnail,
            title: v.title,
            description: v.description,
            duration: v.duration,
            views: v.views,
            likes: v.likes,
            dislikes: v.dislikes,
            username: v.username || cleanUser,
            creator_image:
              v.creator_image ||
              `https://love.viraly.wtf/profileImages/${encodeURIComponent(cleanUser)}.jpg`,
          }));

          const result = {
            items: reels,
            nextPage: rawJson.hasNextPage ? (rawJson.nextPage ?? safePage + 1) : undefined,
          };
          videoCache.set(cacheKey, result).catch(() => {});
          return result;
        }
      }
    } catch {
      // ignore
    }
    return { items: [], nextPage: undefined };
  }

  // AUTO-DETECT if source is not explicitly passed:
  // Check viraly first; if count > 0 then route exclusively to viraly, else to shorts.
  try {
    const checkRes = await fetch(
      `https://love.viraly.wtf/getPostsCount/${encodeURIComponent(cleanUser)}`,
    );
    if (checkRes.ok) {
      const cData = await checkRes.json();
      if (typeof cData.count === "number" && cData.count > 0) {
        return fetchCreatorReelsPage(cleanUser, type, safePage, "viraly");
      }
    }
  } catch {}

  return fetchCreatorReelsPage(cleanUser, type, safePage, "shorts");
}
