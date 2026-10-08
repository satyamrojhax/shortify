import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { Trophy, Eye, TrendingUp, Medal } from "lucide-react";

interface LeaderboardItem {
  rank: number;
  username: string;
  totalMonthlyViews: number;
  totalAllTimeViews: number;
}

export const Route = createFileRoute("/_app/leaderboard")({
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const hydrated = useHydrated();
  const [items, setItems] = useState<LeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated) return;
    
    async function fetchLeaderboard() {
      try {
        const response = await fetch("https://loveupload.viraly.wtf/leaderboard/top-monthly-views");
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        if (data && data.data) {
          setItems(data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchLeaderboard();
  }, [hydrated]);

  if (!hydrated) return null;

  return (
    <div className="mx-auto max-w-[1200px] px-4 md:px-6 py-6 md:py-10">
      <div className="mb-6 md:mb-8">
        <p className="font-display text-marker text-lg md:text-xl lowercase italic">
          top creators —
        </p>
        <h1 className="mt-1 md:mt-2 font-display text-4xl leading-[1.05] lowercase text-cocoa md:text-[64px] dark:text-cream flex items-center gap-3 md:gap-4">
          leaderboard <Trophy className="h-8 w-8 md:h-10 md:w-10 text-yellow-500" />
        </h1>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-charcoal/10 rounded-2xl dark:bg-cream/10" />
          ))}
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {items.map((item, i) => (
            <div key={item.username} className="paper-card flex items-center gap-3 md:gap-4 p-3 sm:p-4 md:p-6 transition hover:-translate-y-1">
              <div className="w-10 md:w-12 text-center flex-shrink-0">
                {item.rank === 1 ? (
                  <Medal className="h-8 w-8 md:h-10 md:w-10 mx-auto text-yellow-500" />
                ) : item.rank === 2 ? (
                  <Medal className="h-6 w-6 md:h-8 md:w-8 mx-auto text-slate-400" />
                ) : item.rank === 3 ? (
                  <Medal className="h-6 w-6 md:h-8 md:w-8 mx-auto text-amber-600" />
                ) : (
                  <span className="font-display text-xl md:text-2xl text-charcoal/40 dark:text-cream/40">#{item.rank}</span>
                )}
              </div>
              
              <Link to="/creator/$username" params={{ username: item.username }} className="flex items-center gap-3 md:gap-4 flex-1 group min-w-0">
                <img 
                  src={`https://love.viraly.wtf/profileImages/${item.username}.jpg`} 
                  alt={item.username}
                  className="h-12 w-12 md:h-14 md:w-14 rounded-full object-cover border-[1.5px] border-charcoal/20 dark:border-cream/20 group-hover:border-marker transition shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/9.x/avataaars/svg?seed=${item.username}`;
                  }}
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-display text-lg md:text-xl lowercase text-cocoa dark:text-cream group-hover:text-marker transition truncate">
                    @{item.username}
                  </span>
                  <span className="text-[10px] md:text-xs text-charcoal/60 dark:text-cream/60 flex items-center gap-1 mt-0.5 md:mt-1">
                    <TrendingUp className="h-3 w-3 md:h-3.5 md:w-3.5" />
                    creator
                  </span>
                </div>
              </Link>
              
              <div className="flex flex-col md:flex-row items-end md:items-center gap-1 md:gap-8 flex-shrink-0">
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 md:gap-1.5 text-cocoa dark:text-cream font-display text-lg md:text-xl">
                    {item.totalMonthlyViews.toLocaleString()} <Eye className="h-3.5 w-3.5 md:h-4 md:w-4 text-marker" />
                  </div>
                  <div className="text-[8px] md:text-[10px] uppercase tracking-widest text-charcoal/50 dark:text-cream/50 mt-0.5 md:mt-1">
                    monthly views
                  </div>
                </div>
                
                <div className="text-right hidden sm:block opacity-60">
                  <div className="flex items-center justify-end gap-1.5 text-cocoa dark:text-cream font-display text-base md:text-lg">
                    {item.totalAllTimeViews.toLocaleString()}
                  </div>
                  <div className="text-[8px] md:text-[10px] uppercase tracking-widest text-charcoal/50 dark:text-cream/50 mt-0.5 md:mt-1">
                    all time
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
