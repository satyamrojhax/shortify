import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Heart, Play, ChevronLeft } from "lucide-react";
import { Reel } from "@/lib/reels";
import { ReelModal } from "@/components/reel-modal";
import { ExtraReelsPlayer } from "@/components/extra-reels-player";

export const Route = createFileRoute("/_app/search")({
  component: SearchPage,
});

function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Reel[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedReel, setSelectedReel] = useState<Reel | null>(null);
  const [isMobile, setIsMobile] = useState(() => 
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const observer = useRef<IntersectionObserver | null>(null);

  const lastElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && query.trim() !== "") {
        setPage(prev => prev + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore, query]);

  const fetchResults = async (searchQuery: string, pageNum: number, isNewSearch = false) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasMore(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`https://love.shortify.cc.cd/api/search?query=${encodeURIComponent(searchQuery)}&page=${pageNum}`);
      const json = await res.json();
      const newItems = Array.isArray(json) ? json : (json.data || []);
      
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setHasMore(true);
        if (isNewSearch) {
          setResults(newItems);
        } else {
          setResults(prev => [...prev, ...newItems]);
        }
      }
    } catch (e) {
      console.error(e);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search trigger (2 seconds)
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      fetchResults(query, 0, true);
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  // Pagination trigger
  useEffect(() => {
    if (page > 0) {
      fetchResults(query, page, false);
    }
  }, [page]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10">
      
      {/* Header */}
      <div className="flex items-center gap-2 md:gap-4 mb-8">
        <button 
          onClick={() => navigate({ to: "/explore" })}
          className="p-1 md:p-2 shrink-0 rounded-full hover:bg-charcoal/5 dark:hover:bg-cream/5 transition"
        >
          <ChevronLeft className="w-6 h-6 text-cocoa dark:text-cream" />
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-2 md:gap-3 bg-dew dark:bg-secondary rounded-xl px-3 py-2 md:px-4 md:py-3">
          <Search className="w-4 h-4 md:w-5 md:h-5 shrink-0 text-charcoal/50 dark:text-cream/50" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="w-full min-w-0 bg-transparent border-none outline-none text-sm md:text-base text-charcoal dark:text-cream placeholder-charcoal/50 dark:text-cream/50"
            autoFocus
          />
        </div>
      </div>

      {/* Grid */}
      {query.trim() === "" ? (
        <div className="flex flex-col items-center justify-center py-20 text-charcoal/50 dark:text-cream/50">
          <Search className="w-12 h-12 mb-4 opacity-50" />
          <p className="font-display text-xl lowercase">Search for reels</p>
        </div>
      ) : loading && results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-charcoal/50 dark:text-cream/50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-charcoal/30 border-t-charcoal dark:border-cream/30 dark:border-t-cream mb-4"></div>
          <p className="font-display text-xl lowercase">Searching...</p>
        </div>
      ) : results.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-charcoal/50 dark:text-cream/50">
          <p className="font-display text-xl lowercase">No results found for "{query}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 md:gap-4">
          {results.map((reel, index) => (
            <div 
              ref={index === results.length - 1 ? lastElementRef : null}
              key={reel.id} 
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
          {loading && [...Array(3)].map((_, i) => (
            <div key={`loading-${i}`} className="aspect-[9/16] bg-dew dark:bg-secondary animate-pulse rounded-md" />
          ))}
        </div>
      )}

      {selectedReel && (
        isMobile ? (
          <ExtraReelsPlayer 
            reels={results} 
            initialIndex={results.findIndex(r => r.id === selectedReel.id)} 
            onClose={() => setSelectedReel(null)} 
            feedType="search"
          />
        ) : (
          <ReelModal 
            reels={results} 
            initialIndex={results.findIndex(r => r.id === selectedReel.id)} 
            onClose={() => setSelectedReel(null)} 
          />
        )
      )}
    </div>
  );
}
