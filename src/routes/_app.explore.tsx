import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { Search, Heart, Play, Eye, MessageCircle } from "lucide-react";
import { Reel } from "@/lib/reels";
import { ReelModal } from "@/components/reel-modal";
import { ExtraReelsPlayer } from "@/components/extra-reels-player";

export const Route = createFileRoute("/_app/explore")({
  component: ExplorePage,
});

let cachedForYouReels: Reel[] = [];
let cachedTrendingReels: Reel[] = [];

function ExplorePage() {
  const [activeTab, setActiveTab] = useState<"foryou" | "trending">("foryou");
  const [forYouReels, setForYouReels] = useState<Reel[]>(cachedForYouReels);
  const [trendingReels, setTrendingReels] = useState<Reel[]>(cachedTrendingReels);
  const [loading, setLoading] = useState(!cachedForYouReels.length);
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
      const newItems = json.data || [];
      cachedForYouReels = [...cachedForYouReels, ...newItems];
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
      const newItems = json.data || [];
      cachedTrendingReels = [...cachedTrendingReels, ...newItems];
      setTrendingReels(cachedTrendingReels);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "foryou") {
      if (forYouReels.length === 0) fetchForYou();
    } else {
      if (trendingReels.length === 0) fetchTrending();
    }
  }, [activeTab]);

  // Infinite Scroll Observer
  const observerTarget = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          if (activeTab === "foryou") {
            fetchForYou();
          }
        }
      },
      { threshold: 0.1 },
    );
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    return () => observer.disconnect();
  }, [loading, activeTab]);

  const currentReels = activeTab === "foryou" ? forYouReels : trendingReels;

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
      <div className="flex items-center gap-6 mb-8 border-b border-charcoal/10 dark:border-cream/10">
        <button
          onClick={() => setActiveTab("foryou")}
          className={`pb-4 text-lg font-display lowercase transition-colors relative ${activeTab === "foryou" ? "text-cocoa dark:text-cream" : "text-charcoal/50 dark:text-cream/50"}`}
        >
          For you
          {activeTab === "foryou" && (
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-cocoa dark:bg-cream" />
          )}
        </button>
        <button
          onClick={() => setActiveTab("trending")}
          className={`pb-4 text-lg font-display lowercase transition-colors relative ${activeTab === "trending" ? "text-cocoa dark:text-cream" : "text-charcoal/50 dark:text-cream/50"}`}
        >
          Trending now
          {activeTab === "trending" && (
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-cocoa dark:bg-cream" />
          )}
        </button>
      </div>

      {/* Grid */}
      {loading && currentReels.length === 0 ? (
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
          {currentReels.map((reel) => (
            <div
              key={reel.id}
              className="relative aspect-[9/16] bg-black group cursor-pointer overflow-hidden rounded-sm md:rounded-md"
              onClick={() => setSelectedReel(reel)}
            >
              <img
                src={reel.thumbnail}
                alt={reel.title || "Reel"}
                className="w-full h-full object-cover transition duration-300 group-hover:brightness-50"
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
      {activeTab === "foryou" && (
        <div ref={observerTarget} className="py-8 flex justify-center">
          {loading && currentReels.length > 0 && (
            <div className="flex gap-2">
              {[0, 150, 300].map((d) => (
                <div
                  key={d}
                  className="h-2 w-2 md:h-3 md:w-3 animate-bounce rounded-full bg-charcoal/50 dark:bg-cream/50 shadow-lg"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {selectedReel &&
        (isMobile ? (
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
