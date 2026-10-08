import { useEffect, useRef, useState } from "react";
import { Reel } from "@/lib/reels";
import { ReelPlayer } from "@/components/reel-player";
import { ChevronLeft } from "lucide-react";

export function ExtraReelsPlayer({
  reels,
  initialIndex,
  onClose,
  feedType,
}: {
  reels: Reel[];
  initialIndex: number;
  onClose: () => void;
  feedType?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [muted, setMuted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  // Scroll to initial index on mount
  useEffect(() => {
    if (containerRef.current && !initialized.current) {
      const el = containerRef.current.children[initialIndex] as HTMLElement;
      if (el) {
        el.scrollIntoView({ behavior: "instant" });
        initialized.current = true;
      }
    }
  }, [initialIndex]);

  // Handle snap scrolling
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const index = Math.round(container.scrollTop / container.clientHeight);
    if (index !== activeIndex && index >= 0 && index < reels.length) {
      setActiveIndex(index);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-[110] p-2 text-white drop-shadow-md transition"
      >
        <ChevronLeft className="w-8 h-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
      </button>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-scroll snap-y snap-mandatory no-scrollbar relative"
        onScroll={handleScroll}
      >
        {reels.map((reel, idx) => (
          <div key={reel.id} className="h-[100dvh] w-full snap-start snap-always relative">
            <ReelPlayer
              reel={reel}
              active={idx === activeIndex}
              muted={muted}
              onToggleMute={() => setMuted(!muted)}
              onEnded={() => {
                if (idx < reels.length - 1 && containerRef.current) {
                  const el = containerRef.current.children[idx + 1] as HTMLElement;
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }
              }}
              onWatched={() => {}}
              distance={Math.abs(idx - activeIndex)}
              feedType={feedType}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
