import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { fetchCreatorReelsPage, type Reel } from "@/lib/reels";
import { ReelPlayer } from "@/components/reel-player";
import { KEYS, get, set, getAutoScroll, getFavoriteSince, toggleFavorite } from "@/lib/storage";
import { useVideoPrewarmer } from "@/hooks/use-video-prewarmer";
import { AlertTriangle, RefreshCw, ChevronLeft, ChevronUp, ChevronDown, Play, Heart, ImageOff } from "lucide-react";

export const Route = createFileRoute("/_app/creator/$username")({
  component: CreatorPage,
});

function CreatorPage() {
  const { username } = Route.useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"latest" | "popular">("latest");
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["creator-reels", username, activeTab],
    queryFn: ({ pageParam }) => fetchCreatorReelsPage(username, activeTab, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextPage,
    staleTime: 5 * 60_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["creator-stats", username],
    queryFn: () => fetchCreatorStats(username!),
    staleTime: 5 * 60_000,
  });

  const reels = useMemo(() => {
    return data?.pages.flatMap((p) => p.items) ?? [];
  }, [data]);

  // Full Screen Player State
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Array<HTMLElement | null>>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const [favSince, setFavSince] = useState<number | null>(null);

  useEffect(() => {
    setMuted(get<boolean>(KEYS.muted, true));
    setFavSince(getFavoriteSince(username));
  }, [username]);

  const handleFollow = () => {
    toggleFavorite(username);
    setFavSince(getFavoriteSince(username));
  };



  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      set(KEYS.muted, next);
      return next;
    });
  }, []);

  const scrollToIdx = useCallback((i: number, behavior: ScrollBehavior = "auto") => {
    const el = slideRefs.current[i];
    if (el) {
      el.scrollIntoView({ behavior });
      setActiveIdx(i);
    }
  }, []);

  useEffect(() => {
    if (playingIdx === null) return;
    const root = containerRef.current;
    if (!root) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio >= 0.7) {
            const idx = Number((e.target as HTMLElement).dataset.idx);
            setActiveIdx(idx);
          }
        });
      },
      { root, threshold: [0.7] },
    );
    slideRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [reels, playingIdx]);

  useEffect(() => {
    if (playingIdx === null) return;
    if (!hasNextPage || isFetchingNextPage) return;
    if (reels.length - activeIdx <= 5) fetchNextPage();
  }, [activeIdx, reels.length, hasNextPage, isFetchingNextPage, fetchNextPage, playingIdx]);

  useVideoPrewarmer(playingIdx !== null ? reels : [], activeIdx);

  const bumpWatched = useCallback(() => {
    const n = get<number>(KEYS.watched, 0);
    set(KEYS.watched, n + 1);
  }, []);

  const handleReelEnd = useCallback(() => {
    bumpWatched();
    if (getAutoScroll()) {
      setTimeout(() => {
        if (activeIdx < reels.length - 1) {
          scrollToIdx(activeIdx + 1, "smooth");
        }
      }, 500);
    }
  }, [activeIdx, reels.length, scrollToIdx, bumpWatched]);

  // If in grid view and scrolling to the bottom, fetch more
  const bottomObserverRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (playingIdx !== null) return;
    const el = bottomObserverRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }
      },
      { root: null, rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [playingIdx, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (playingIdx !== null) {
    // FULL SCREEN PLAYER MODE
    return (
      <div className="relative h-[100dvh] w-full bg-black overflow-hidden">
        {/* Back Button */}
        <button
          onClick={() => setPlayingIdx(null)}
          className="absolute left-4 top-14 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-all hover:bg-black/60 md:top-6 md:left-8 md:h-12 md:w-auto md:px-5 md:gap-2 shadow-xl border border-white/10"
        >
          <ChevronLeft className="h-6 w-6 md:h-5 md:w-5" />
          <span className="hidden md:block font-semibold">Back</span>
        </button>

        {/* Desktop Navigation Arrows */}
        <div className="absolute right-8 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-4 md:flex">
          <button
            onClick={() => activeIdx > 0 && scrollToIdx(activeIdx - 1, "smooth")}
            disabled={activeIdx === 0}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-20 disabled:cursor-not-allowed backdrop-blur"
          >
            <ChevronUp className="h-6 w-6" />
          </button>
          <button
            onClick={() => activeIdx < reels.length - 1 && scrollToIdx(activeIdx + 1, "smooth")}
            disabled={activeIdx === reels.length - 1}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-20 disabled:cursor-not-allowed backdrop-blur"
          >
            <ChevronDown className="h-6 w-6" />
          </button>
        </div>

        <div
          ref={containerRef}
          className="no-scrollbar h-full w-full snap-y snap-mandatory overflow-y-scroll"
        >
          {reels.map((r, i) => {
            const near = Math.abs(i - activeIdx) <= 2;
            const composite = `reel::${r.source}::${r.id}::${i}`;
            return (
              <section
                key={composite}
                data-idx={i}
                ref={(el) => {
                  slideRefs.current[i] = el;
                }}
                className="relative h-[100dvh] w-full snap-start snap-always"
              >
                {near ? (
                  <ReelPlayer
                    key={`player::${r.id}`}
                    reel={r}
                    active={i === activeIdx}
                    distance={Math.abs(i - activeIdx)}
                    muted={muted}
                    onToggleMute={toggleMute}
                    onEnded={handleReelEnd}
                    onWatched={bumpWatched}
                  />
                ) : (
                  <div key={`ph::${r.id}`} className="h-full w-full bg-black">
                    {r.thumbnail && (
                      <img
                        src={r.thumbnail}
                        alt=""
                        className="h-full w-full object-cover opacity-40"
                        loading="lazy"
                      />
                    )}
                  </div>
                )}
              </section>
            );
          })}
          
          {isFetchingNextPage && (
            <div className="flex h-24 items-center justify-center bg-black">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-white/60" style={{ animationDelay: "0ms" }} />
                <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-white/60" style={{ animationDelay: "150ms" }} />
                <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-white/60" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // PROFILE / GRID VIEW MODE
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Profile Header section */}
      <div className="w-full bg-background/80 backdrop-blur-3xl pt-4 pb-6 px-4 md:px-8 border-b border-border shadow-sm flex flex-col items-center">
        {/* Top nav */}
        <div className="w-full flex items-center justify-between mb-2">
          <button onClick={() => window.history.back()} className="p-2 -ml-2 rounded-full hover:bg-muted text-foreground transition-colors">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-extrabold text-foreground tracking-tight truncate">@{username}</h1>
          <div className="w-10"></div> {/* Placeholder to center the title */}
        </div>

        {/* Avatar & Stats row */}
        <div className="flex flex-col items-center w-full max-w-lg mt-2">
          {/* Avatar with gradient border */}
          <div className="relative h-24 w-24 md:h-28 md:w-28 rounded-full bg-gradient-to-tr from-cobalt-pop via-periwinkle-sky to-magenta-haze p-1 shadow-xl">
            <div className="h-full w-full rounded-full bg-background flex items-center justify-center border-[4px] border-background">
               <span className="text-4xl font-black uppercase text-foreground">{username?.[0]}</span>
            </div>
          </div>
          
          <h2 className="mt-4 text-2xl font-black text-foreground">@{username}</h2>
          <p className="text-muted-foreground text-sm font-medium mt-1">Creator</p>
          
          {/* Stats */}
          <div className="flex items-center gap-8 md:gap-12 mt-6 w-full justify-center">
            <div className="flex flex-col items-center">
              <span className="text-xl md:text-2xl font-bold text-foreground">
                {stats?.postsCount !== undefined ? formatViews(stats.postsCount) : "..."}
              </span>
              <span className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">Videos</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xl md:text-2xl font-bold text-foreground">
                {stats?.followersCount !== undefined ? formatViews(stats.followersCount) : "..."}
              </span>
              <span className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-1">Followers</span>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full mt-6 px-4 md:px-0">
            <button 
               onClick={handleFollow}
               className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all border shadow-sm ${
                 favSince 
                 ? "bg-muted border-border text-foreground hover:bg-muted/80" 
                 : "bg-cobalt-pop border-cobalt-pop text-white hover:bg-cobalt-pop/90 shadow-cobalt-pop/20 shadow-md"
               }`}
            >
              {favSince ? "Following" : "Follow"}
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Tabs */}
      <div className="sticky top-0 z-20 flex bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
        <button
          onClick={() => setActiveTab("latest")}
          className={`flex-1 py-3.5 text-sm font-bold transition-colors relative ${
            activeTab === "latest" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Latest
          {activeTab === "latest" && (
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-foreground rounded-t-full mx-10"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab("popular")}
          className={`flex-1 py-3.5 text-sm font-bold transition-colors relative ${
            activeTab === "popular" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Popular
          {activeTab === "popular" && (
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-foreground rounded-t-full mx-10"></div>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-0.5 md:p-4 w-full max-w-5xl mx-auto">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <AlertTriangle className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">Couldn't load reels.</p>
            <button onClick={() => refetch()} className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium">
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        ) : reels.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            No reels found.
          </div>
        ) : (
          <div className="grid grid-cols-3 md:grid-cols-4 gap-0.5 md:gap-3 lg:gap-4">
            {reels.map((reel, idx) => (
              <div
                key={reel.id}
                className="group relative aspect-[9/16] cursor-pointer overflow-hidden bg-muted md:rounded-md"
                onClick={() => {
                  setActiveIdx(idx);
                  setPlayingIdx(idx);
                  // Ensure scroll resets when opening the player
                  setTimeout(() => {
                    const el = slideRefs.current[idx];
                    if (el) {
                      el.scrollIntoView({ behavior: "instant" });
                    }
                  }, 50);
                }}
              >
                <CreatorThumb src={reel.thumbnail} alt={reel.title || "Reel thumbnail"} />
                <div className="absolute inset-0 bg-black/10 transition-opacity md:group-hover:bg-black/40" />
                
                {/* Views Counter (Hidden on PC hover) */}
                <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs font-semibold text-white drop-shadow-md transition-opacity md:group-hover:opacity-0">
                  <Play className="h-3 w-3 fill-white" />
                  {reel.views ? formatViews(reel.views) : "0"}
                </div>

                {/* PC Hover Overlay: Likes & Title */}
                <div className="absolute inset-0 hidden md:flex flex-col p-3 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none z-10">
                  <div className="flex-1 flex items-center justify-center">
                    <div className="flex items-center gap-1.5 text-white font-bold text-base drop-shadow-lg">
                      <Heart className="h-5 w-5 fill-white" />
                      <span>{reel.likes ? formatViews(reel.likes) : "0"}</span>
                    </div>
                  </div>
                  {reel.title && (
                    <div className="w-full text-white text-xs font-medium text-center line-clamp-3 drop-shadow-md pb-1">
                      {reel.title}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {isFetchingNextPage && (
          <div className="flex h-20 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-foreground" />
          </div>
        )}
        
        {/* Invisible element to trigger intersection observer for infinite scroll */}
        <div ref={bottomObserverRef} className="h-4 w-full" />
      </div>
    </div>
  );
}

function formatViews(views: number) {
  if (views >= 1000000) return (views / 1000000).toFixed(1) + "M";
  if (views >= 1000) return (views / 1000).toFixed(1) + "K";
  return views.toString();
}

/** Thumbnail with graceful fallback for mobile CORS / load failures */
function CreatorThumb({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!src || failed) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/20">
        <ImageOff className="h-8 w-8 text-muted-foreground/40" />
      </div>
    );
  }

  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        className={`h-full w-full object-cover transition-all duration-300 group-hover:scale-105 ${loaded ? "opacity-100" : "opacity-0"}`}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        onLoad={() => setLoaded(true)}
        ref={(img) => {
          if (img?.complete) {
            setLoaded(true);
          }
        }}
      />
    </>
  );
}

async function fetchCreatorStats(username: string) {
  const [postsRes, userRes] = await Promise.all([
    fetch(`https://love.viraly.wtf/getPostsCount/${username}`).catch(() => null),
    fetch(`https://love.viraly.wtf/getuser/${username}`).catch(() => null),
  ]);
  
  let postsCount = 0;
  let followersCount = 0;
  
  if (postsRes && postsRes.ok) {
    const pData = await postsRes.json();
    postsCount = pData.count || 0;
  }
  
  if (userRes && userRes.ok) {
    const uData = await userRes.json();
    if (uData.followers && Array.isArray(uData.followers)) {
      followersCount = uData.followers.length;
    }
  }
  
  return { postsCount, followersCount };
}
