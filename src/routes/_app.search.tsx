import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Heart, Play, ChevronLeft, X } from "lucide-react";
import { Reel } from "@/lib/reels";
import { ReelModal } from "@/components/reel-modal";
import { ExtraReelsPlayer } from "@/components/extra-reels-player";
import { BubbleLoader } from "@/components/ui/bubble-loader";

type SearchParams = {
  q?: string;
  [key: string]: unknown;
};

export const Route = createFileRoute("/_app/search")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    ...s,
    q: typeof s.q === "string" && s.q.trim() !== "" ? s.q : undefined,
  }),
  component: SearchPage,
});

const DEBOUNCE_DELAY_MS = 2000; // 2 seconds debounce

function SearchPage() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const initialUrlQ = search.q ?? "";

  const [query, setQuery] = useState(initialUrlQ);
  const [results, setResults] = useState<Reel[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedReel, setSelectedReel] = useState<Reel | null>(null);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );

  const lastSearchedQueryRef = useRef<string>(initialUrlQ.trim());
  const isInitialMount = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fetchResults = async (searchQuery: string, pageNum: number, isNewSearch = false) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults([]);
      setHasMore(false);
      setLoading(false);
      return;
    }

    if (isNewSearch) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      setResults([]);
    }

    setLoading(true);
    try {
      const signal = isNewSearch ? abortControllerRef.current?.signal : undefined;
      const res = await fetch(
        `https://love.shortify.cc.cd/api/search?query=${encodeURIComponent(trimmed)}&page=${pageNum}`,
        { signal },
      );
      const json = await res.json();
      const newItems = Array.isArray(json) ? json : json.data || [];

      if (newItems.length === 0) {
        setHasMore(false);
        if (isNewSearch) {
          setResults([]);
        }
      } else {
        setHasMore(true);
        const dedupe = (items: Reel[]) => {
          const seen = new Set<string>();
          return items.filter((r) => {
            const k = r.id || r.videoUrl;
            if (!k || seen.has(k)) return false;
            seen.add(k);
            return true;
          });
        };
        if (isNewSearch) {
          setResults(dedupe(newItems));
        } else {
          setResults((prev) => dedupe([...prev, ...newItems]));
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      console.error(e);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const triggerSearch = useCallback(
    (searchQuery: string) => {
      const trimmed = searchQuery.trim();
      lastSearchedQueryRef.current = trimmed;

      // Synchronize /search?q={} in URL (or /search if empty)
      navigate({
        search: (prev) => ({
          ...prev,
          q: trimmed || undefined,
        }),
        replace: true,
      });

      setPage(0);

      if (!trimmed) {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        setResults([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      fetchResults(trimmed, 0, true);
    },
    [navigate],
  );

  // Sync when mounted with ?q=... or when URL changes externally (e.g. back/forward navigation)
  useEffect(() => {
    const currentUrlQ = (search.q ?? "").trim();
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (currentUrlQ) {
        lastSearchedQueryRef.current = currentUrlQ;
        fetchResults(currentUrlQ, 0, true);
      }
      return;
    }

    if (currentUrlQ !== lastSearchedQueryRef.current) {
      lastSearchedQueryRef.current = currentUrlQ;
      setQuery(search.q ?? "");
      setPage(0);
      if (currentUrlQ) {
        fetchResults(currentUrlQ, 0, true);
      } else {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        setResults([]);
        setHasMore(false);
        setLoading(false);
      }
    }
  }, [search.q]);

  // Debounced search trigger (2 seconds)
  useEffect(() => {
    if (isInitialMount.current) return;

    if (query.trim() === lastSearchedQueryRef.current) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      triggerSearch(query);
    }, DEBOUNCE_DELAY_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, triggerSearch]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (query.trim() !== lastSearchedQueryRef.current) {
        triggerSearch(query);
      }
    }
  };

  const handleClear = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setQuery("");
    if (lastSearchedQueryRef.current !== "") {
      triggerSearch("");
    }
  };

  // Pagination trigger
  useEffect(() => {
    if (page > 0 && lastSearchedQueryRef.current) {
      fetchResults(lastSearchedQueryRef.current, page, false);
    }
  }, [page]);

  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore && lastSearchedQueryRef.current !== "") {
          setPage((prev) => prev + 1);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, hasMore],
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10">
      {/* Header */}
      <div className="flex items-center gap-2 md:gap-4 mb-8">
        <button
          onClick={() => navigate({ to: "/explore" })}
          className="p-1 md:p-2 shrink-0 rounded-full hover:bg-charcoal/5 dark:hover:bg-cream/5 transition"
          aria-label="Back to explore"
        >
          <ChevronLeft className="w-6 h-6 text-cocoa dark:text-cream" />
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-2 md:gap-3 bg-dew dark:bg-secondary rounded-xl px-3 py-2 md:px-4 md:py-3">
          <Search className="w-4 h-4 md:w-5 md:h-5 shrink-0 text-charcoal/50 dark:text-cream/50" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search..."
            className="w-full min-w-0 bg-transparent border-none outline-none text-sm md:text-base text-charcoal dark:text-cream placeholder-charcoal/50 dark:text-cream/50"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full hover:bg-charcoal/10 dark:hover:bg-cream/10 text-charcoal/50 dark:text-cream/50 transition shrink-0"
              title="Clear search"
            >
              <X className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {lastSearchedQueryRef.current === "" && query.trim() === "" && results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-charcoal/50 dark:text-cream/50">
          <Search className="w-12 h-12 mb-4 opacity-50" />
          <p className="font-display text-xl lowercase">Search for reels</p>
        </div>
      ) : loading && results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-charcoal/50 dark:text-cream/50">
          <BubbleLoader className="mb-4" size="lg" />
          <p className="font-display text-xl lowercase">Searching...</p>
        </div>
      ) : results.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-charcoal/50 dark:text-cream/50">
          <p className="font-display text-xl lowercase">
            No results found for "{lastSearchedQueryRef.current || query}"
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 md:gap-4">
          {results.map((reel, index) => (
            <div
              ref={index === results.length - 1 ? lastElementRef : null}
              key={`search-${reel.id}-${index}`}
              className="relative aspect-[9/16] bg-black group cursor-pointer overflow-hidden rounded-sm md:rounded-md"
              onClick={() => setSelectedReel(reel)}
            >
              <img
                src={reel.thumbnail}
                alt={reel.title || "Reel"}
                className="w-full h-full object-cover transition duration-300 group-hover:brightness-50"
              />

              <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs md:text-sm font-semibold opacity-100 group-hover:opacity-0 transition drop-shadow-md">
                <Play className="w-3 h-3 md:w-4 md:h-4 fill-white" />
                <span>{reel.views ? reel.views.toLocaleString() : "0"}</span>
              </div>

              {/* Hover Overlay: Likes, Views, Title */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 p-2 text-center">
                <div className="flex items-center gap-4">
                  {reel.likes !== undefined && (
                    <div className="flex items-center gap-1 md:gap-2 text-white font-bold text-xs md:text-base">
                      <Heart className="w-4 h-4 md:w-5 md:h-5 fill-white" />
                      <span>{reel.likes.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 md:gap-2 text-white font-bold text-xs md:text-base">
                    <Play className="w-4 h-4 md:w-5 md:h-5 fill-white" />
                    <span>{reel.views ? reel.views.toLocaleString() : "0"}</span>
                  </div>
                </div>
                {reel.title && (
                  <p className="text-white text-[10px] md:text-xs font-medium line-clamp-2 mt-1 drop-shadow-md px-1">
                    {reel.title}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Loading placeholders for pagination */}
          {loading &&
            [...Array(3)].map((_, i) => (
              <div
                key={`loading-${i}`}
                className="aspect-[9/16] bg-dew dark:bg-secondary animate-pulse rounded-md"
              />
            ))}
        </div>
      )}

      {selectedReel &&
        (isMobile ? (
          <ExtraReelsPlayer
            reels={results}
            initialIndex={results.findIndex((r) => r.id === selectedReel.id)}
            onClose={() => setSelectedReel(null)}
            feedType="search"
          />
        ) : (
          <ReelModal
            reels={results}
            initialIndex={results.findIndex((r) => r.id === selectedReel.id)}
            onClose={() => setSelectedReel(null)}
          />
        ))}
    </div>
  );
}
