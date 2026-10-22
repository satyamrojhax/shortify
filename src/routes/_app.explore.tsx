import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Search, Heart, Play, Eye, MessageCircle, Radio } from "lucide-react";
import { Reel, LiveWebcamItem, fetchLiveWebcams } from "@/lib/reels";
import { ReelModal } from "@/components/reel-modal";
import { ExtraReelsPlayer } from "@/components/extra-reels-player";
import { UserAvatar } from "@/components/ui/user-avatar";

type ExploreSearch = {
  tab?: string;
  [key: string]: unknown;
};

export const Route = createFileRoute("/_app/explore")({
  validateSearch: (s: Record<string, unknown>): ExploreSearch => ({
    ...s,
    tab: typeof s.tab === "string" ? s.tab : undefined,
  }),
  component: ExplorePage,
});

type ExploreTab = "foryou" | "trending" | "live";

function normalizeTab(rawTab?: string): ExploreTab {
  if (!rawTab) return "foryou";
  const lower = rawTab.toLowerCase().trim();
  if (lower === "for-you" || lower === "foryou") return "foryou";
  if (lower === "trending" || lower === "trending-now") return "trending";
  if (lower === "live" || lower === "live-now" || lower === "livenow") return "live";
  return "foryou";
}

function tabToParam(tab: ExploreTab): string {
  if (tab === "trending") return "trending";
  if (tab === "live") return "live";
  return "for-you";
}

let cachedForYouReels: Reel[] = [];
let cachedTrendingReels: Reel[] = [];
let cachedLiveReels: Reel[] = [];

function dedupeReelsList(list: Reel[]): Reel[] {
  const seen = new Set<string>();
  const out: Reel[] = [];
  for (const r of list) {
    const k = r.id || r.videoUrl;
    if (!k || seen.has(k)) continue;
    seen.add(k);
    if (r.videoUrl) seen.add(r.videoUrl);
    out.push(r);
  }
  return out;
}

function ExplorePage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const activeTab = normalizeTab(search.tab);

  const handleTabChange = (newTab: ExploreTab) => {
    navigate({
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        tab: tabToParam(newTab),
      }),
      replace: true,
      resetScroll: false,
    });
  };

  useEffect(() => {
    if (!search.tab) {
      navigate({
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          tab: "for-you",
        }),
        replace: true,
        resetScroll: false,
      });
    }
  }, [search.tab, navigate]);

  const [forYouReels, setForYouReels] = useState<Reel[]>(cachedForYouReels);
  const [trendingReels, setTrendingReels] = useState<Reel[]>(cachedTrendingReels);
  const [liveReels, setLiveReels] = useState<Reel[]>(cachedLiveReels);
  const [loading, setLoading] = useState(() => {
    if (activeTab === "foryou") return !cachedForYouReels.length;
    if (activeTab === "trending") return !cachedTrendingReels.length;
    return false;
  });
  const [loadingLive, setLoadingLive] = useState(() => {
    if (activeTab === "live") return !cachedLiveReels.length;
    return false;
  });
  const [livePage, setLivePage] = useState(1);
  const [liveHasNext, setLiveHasNext] = useState(true);
  const [selectedReel, setSelectedReel] = useState<Reel | null>(null);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchForYou = async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("https://love.shortify.cc.cd/api/for-you");
      const json = await res.json();
      const rawList = Array.isArray(json) ? json : json.data || [];
      const newItems: Reel[] = rawList.map((v: any) => ({
        ...v,
        originPlayer: "category",
        originSystem: "viraly",
        creator_image:
          v.creator_image ||
          (v.username
            ? `https://love.viraly.wtf/profileImages/${encodeURIComponent(v.username)}.jpg`
            : undefined),
      }));
      cachedForYouReels = dedupeReelsList([...cachedForYouReels, ...newItems]);
      setForYouReels(cachedForYouReels);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrending = async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("https://love.shortify.cc.cd/api/trending/videos");
      const json = await res.json();
      const rawList = Array.isArray(json) ? json : json.data || [];
      const newItems: Reel[] = rawList.map((v: any) => ({
        ...v,
        originPlayer: "category",
        originSystem: "viraly",
        creator_image:
          v.creator_image ||
          (v.username
            ? `https://love.viraly.wtf/profileImages/${encodeURIComponent(v.username)}.jpg`
            : undefined),
      }));
      cachedTrendingReels = dedupeReelsList([...cachedTrendingReels, ...newItems]);
      setTrendingReels(cachedTrendingReels);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLive = async (pageToFetch = 1) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setLoadingLive(false);
      return;
    }
    setLoadingLive(true);
    try {
      const result = await fetchLiveWebcams(pageToFetch);
      const mappedItems = result.items.map((r) => ({ ...r, isLive: true }));
      if (pageToFetch === 1) {
        cachedLiveReels = dedupeReelsList(mappedItems);
      } else {
        cachedLiveReels = dedupeReelsList([...cachedLiveReels, ...mappedItems]);
      }
      setLiveReels(cachedLiveReels);
      setLiveHasNext(result.hasNextPage);
      setLivePage(result.nextPage ?? pageToFetch + 1);
    } catch (e) {
      console.error("Failed to fetch live webcams:", e);
    } finally {
      setLoadingLive(false);
    }
  };

  useEffect(() => {
    if (activeTab === "foryou") {
      if (forYouReels.length === 0) fetchForYou();
    } else if (activeTab === "trending") {
      if (trendingReels.length === 0) fetchTrending();
    } else if (activeTab === "live") {
      if (liveReels.length === 0) fetchLive(1);
    }
  }, [activeTab]);

  // Infinite Scroll Observer
  const observerTarget = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          if (activeTab === "foryou" && !loading) {
            fetchForYou();
          } else if (activeTab === "live" && !loadingLive && liveHasNext) {
            fetchLive(livePage);
          }
        }
      },
      { threshold: 0.1 },
    );
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    return () => observer.disconnect();
  }, [loading, loadingLive, activeTab, liveHasNext, livePage]);

  const currentReels =
    activeTab === "foryou" ? forYouReels : activeTab === "trending" ? trendingReels : liveReels;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10">
      {/* Search Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link
          to="/search"
          className="flex-1 max-w-xl flex items-center gap-3 bg-dew dark:bg-secondary rounded-xl px-4 py-3 text-charcoal/60 dark:text-cream/60 transition hover:bg-charcoal/5 dark:hover:bg-cream/5"
        >
          <Search className="w-5 h-5" />
          <span className="text-base">Search...</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 mb-8 border-b border-charcoal/10 dark:border-cream/10 overflow-x-auto no-scrollbar">
        <button
          onClick={() => handleTabChange("foryou")}
          className={`pb-4 text-base sm:text-lg font-display lowercase transition-colors relative shrink-0 ${activeTab === "foryou" ? "text-cocoa dark:text-cream font-bold" : "text-charcoal/50 dark:text-cream/50"}`}
        >
          For you
          {activeTab === "foryou" && (
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-cocoa dark:bg-cream" />
          )}
        </button>

        <button
          onClick={() => handleTabChange("trending")}
          className={`pb-4 text-base sm:text-lg font-display lowercase transition-colors relative shrink-0 ${activeTab === "trending" ? "text-cocoa dark:text-cream font-bold" : "text-charcoal/50 dark:text-cream/50"}`}
        >
          Trending now
          {activeTab === "trending" && (
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-cocoa dark:bg-cream" />
          )}
        </button>

        <button
          onClick={() => handleTabChange("live")}
          className={`pb-4 text-base sm:text-lg font-display lowercase transition-colors relative shrink-0 flex items-center gap-2 ${activeTab === "live" ? "text-cocoa dark:text-cream font-bold" : "text-charcoal/50 dark:text-cream/50"}`}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
          <span>Live now</span>
          {activeTab === "live" && (
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-red-500" />
          )}
        </button>
      </div>

      {/* Grid Content */}
      {activeTab === "live" ? (
        /* LIVE NOW GRID */
        loadingLive && liveReels.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 md:gap-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] sm:aspect-[9/16] bg-dew dark:bg-secondary animate-pulse rounded-xl md:rounded-2xl"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 md:gap-4">
            {liveReels.map((reel, idx) => (
              <div
                key={`live-${reel.id}-${idx}`}
                className="relative aspect-[3/4] sm:aspect-[9/16] bg-black group cursor-pointer overflow-hidden rounded-xl md:rounded-2xl border border-charcoal/10 dark:border-cream/10 shadow-sm hover:shadow-xl transition-all duration-300"
                onClick={() => setSelectedReel({ ...reel, isLive: true })}
              >
                {/* Live Stream Snapshot */}
                <img
                  src={reel.thumbnail}
                  alt={reel.username || "Live Stream"}
                  className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Top Badges: LIVE Mark & Viewer Count */}
                <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-1 z-10 pointer-events-none">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600 text-white font-bold text-[10px] sm:text-xs uppercase tracking-wider shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <span>LIVE</span>
                  </div>

                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] sm:text-xs font-semibold shadow-md">
                    <Eye size={12} className="text-white/80" />
                    <span>{(reel.viewersCount || 0).toLocaleString()}</span>
                  </div>
                </div>

                {/* Hover Play Button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-2xs">
                  <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                </div>

                {/* Bottom Overlay: Avatar & Broadcaster Name */}
                <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2.5 sm:p-3 flex items-center gap-2">
                  <UserAvatar
                    name={reel.username}
                    src={reel.creator_image}
                    size="sm"
                    className="shrink-0 ring-2 ring-red-500/80 w-7 h-7 sm:w-8 sm:h-8"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-white font-bold text-xs sm:text-sm truncate drop-shadow-md">
                      {reel.username}
                    </div>
                    <div className="text-white/75 text-[10px] sm:text-xs truncate flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span>{(reel.viewersCount || 0).toLocaleString()} watching</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : /* FOR YOU & TRENDING GRID */
      loading && currentReels.length === 0 ? (
        <div className="grid grid-cols-3 gap-1 md:gap-4">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="aspect-[9/16] bg-dew dark:bg-secondary animate-pulse rounded-md"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 md:gap-4">
          {currentReels.map((reel, idx) => (
            <div
              key={`explore-${reel.id}-${idx}`}
              className="relative aspect-[9/16] bg-black group cursor-pointer overflow-hidden rounded-sm md:rounded-md"
              onClick={() => setSelectedReel(reel)}
            >
              <img
                src={reel.thumbnail}
                alt={reel.title || "Reel"}
                className="w-full h-full object-cover transition duration-300 group-hover:brightness-50"
                loading="lazy"
              />

              {/* Default View Count (Bottom Left) */}
              <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs md:text-sm font-semibold opacity-100 group-hover:opacity-0 transition drop-shadow-md">
                <Play className="w-3 h-3 md:w-4 md:h-4 fill-white" />
                <span>{reel.views ? reel.views.toLocaleString() : "0"}</span>
              </div>

              {/* Hover Overlay: Likes & Comments (Centered), Title (Bottom) */}
              <div className="absolute inset-0 flex flex-col p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                <div className="flex-1 flex items-center justify-center gap-4">
                  <div className="flex items-center gap-1 md:gap-2 text-white font-bold text-xs md:text-base">
                    <Heart className="w-4 h-4 md:w-5 md:h-5 fill-white" />
                    <span>{reel.likes ? reel.likes.toLocaleString() : "0"}</span>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2 text-white font-bold text-xs md:text-base">
                    <MessageCircle className="w-4 h-4 md:w-5 md:h-5 fill-white" />
                    <span>
                      {reel.comments?.length ? reel.comments.length.toLocaleString() : "0"}
                    </span>
                  </div>
                </div>
                {reel.title && (
                  <div className="w-full text-left mt-auto pb-1">
                    <p className="text-white text-[11px] md:text-xs font-medium line-clamp-3 drop-shadow-md break-words whitespace-pre-wrap">
                      {reel.title}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading Indicator / Intersection Target */}
      <div ref={observerTarget} className="py-8 flex justify-center">
        {((activeTab === "live" && loadingLive && liveReels.length > 0) ||
          (activeTab !== "live" && loading && currentReels.length > 0)) && (
          <div className="flex gap-2">
            {[0, 150, 300].map((d) => (
              <div
                key={d}
                className={`h-2 w-2 md:h-3 md:w-3 animate-bounce rounded-full shadow-lg ${activeTab === "live" ? "bg-red-500" : "bg-charcoal/50 dark:bg-cream/50"}`}
                style={{ animationDelay: `${d}ms` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal / Video Player: Always uses ReelModal for live streams as requested */}
      {selectedReel &&
        (activeTab === "live" || selectedReel.isLive ? (
          <ReelModal
            reels={
              activeTab === "live"
                ? currentReels.map((r) => ({ ...r, isLive: true }))
                : currentReels
            }
            initialIndex={currentReels.findIndex((r) => r.id === selectedReel.id)}
            onClose={() => setSelectedReel(null)}
          />
        ) : isMobile ? (
          <ExtraReelsPlayer
            reels={currentReels}
            initialIndex={currentReels.findIndex((r) => r.id === selectedReel.id)}
            onClose={() => setSelectedReel(null)}
            feedType={`explore_${activeTab}`}
          />
        ) : (
          <ReelModal
            reels={currentReels}
            initialIndex={currentReels.findIndex((r) => r.id === selectedReel.id)}
            onClose={() => setSelectedReel(null)}
          />
        ))}
    </div>
  );
}
