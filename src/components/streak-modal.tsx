import { useEffect, useState } from "react";
// force reload
import { updateStreak, type StreakData } from "@/lib/storage";
import { Flame, X } from "lucide-react";

export function StreakModal() {
  const [show, setShow] = useState(false);
  const [streakData, setStreakData] = useState<StreakData | null>(null);

  useEffect(() => {
    // Timeout to not interrupt initial load too aggressively
    const timer = setTimeout(() => {
      const { updated, streak } = updateStreak();
      if (updated && streak.current > 0) {
        setStreakData(streak);
        setShow(true);
      }
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);

    if (!show || !streakData) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div 
            className="bg-background w-full max-w-sm sm:max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl relative border-[3px] border-orange-500/20 text-center overflow-hidden mx-4 animate-in zoom-in-95 duration-500 ease-out"
          >
            {/* Background elements */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl" />
            
            <button 
              onClick={() => setShow(false)}
              className="absolute top-4 right-4 p-2 bg-foreground/5 hover:bg-foreground/10 rounded-full text-foreground/50 hover:text-foreground transition-colors z-10"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative z-10 flex flex-col items-center pt-4 pb-2">
              <div className="relative">
                <div className="absolute inset-0 bg-orange-500 blur-xl opacity-40 animate-pulse" />
                <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-rose-600 rounded-full flex items-center justify-center relative shadow-inner">
                  <Flame className="h-12 w-12 text-white fill-white" />
                </div>
              </div>
              
              <h2 className="mt-6 font-display text-3xl sm:text-4xl text-foreground">
                {streakData.current} day streak!
              </h2>
              <p className="mt-2 text-foreground/70 font-medium text-sm sm:text-base">
                you're on fire! keep coming back daily to build your streak.
              </p>
              
              <div className="mt-8 w-full bg-foreground/5 rounded-2xl p-4 flex justify-between items-center border border-foreground/10">
                <div className="text-left">
                  <div className="text-[10px] sm:text-xs uppercase tracking-wider text-foreground/50 font-bold mb-1">Current</div>
                  <div className="font-display text-xl sm:text-2xl text-orange-500 flex items-center gap-1">
                    <Flame className="h-4 w-4" /> {streakData.current}
                  </div>
                </div>
                <div className="h-8 w-[1px] bg-foreground/10" />
                <div className="text-right">
                  <div className="text-[10px] sm:text-xs uppercase tracking-wider text-foreground/50 font-bold mb-1">Best</div>
                  <div className="font-display text-xl sm:text-2xl text-foreground flex items-center gap-1 justify-end">
                    <Flame className="h-4 w-4 text-foreground/40" /> {streakData.best}
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setShow(false)}
                className="mt-6 w-full py-4 bg-foreground text-background rounded-xl font-bold uppercase tracking-wider text-sm hover:opacity-90 transition-opacity"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
    );
}
