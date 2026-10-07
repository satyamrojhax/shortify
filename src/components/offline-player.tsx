import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronsDown, ChevronUp, Repeat1, WifiOff, X } from "lucide-react";
import type { OfflineMeta } from "@/lib/offline-store";
import type { Reel } from "@/lib/reels";
import { ReelPlayer } from "./reel-player";

type Props = {
  items: OfflineMeta[];
  startIndex: number;
  catalog?: Reel[] | null;
  onClose: () => void;
};

export function OfflinePlayer({ items, startIndex, catalog, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Array<HTMLElement | null>>([]);
  const [active, setActive] = useState(startIndex);
  const [muted, setMuted] = useState(false);
  const [autoNext, setAutoNext] = useState(true);

  // Jump straight to the tapped reel (no visible scroll)
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = startIndex * el.clientHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock page scroll behind the overlay
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Track which slide is on screen
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.7) {
            setActive(Number((e.target as HTMLElement).dataset.idx));
          }
        }
      },
      { root, threshold: [0.7] },
    );
    slideRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [items.length]);

  const goTo = useCallback(
    (i: number, smooth = true) => {
      const el = slideRefs.current[Math.max(0, Math.min(items.length - 1, i))];
      el?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    },
    [items.length],
  );

  const handleEnded = useCallback(
    (i: number) => {
      if (autoNext && i < items.length - 1) goTo(i + 1);
    },
    [autoNext, goTo, items.length],
  );

  // Keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        goTo(active + 1);
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        goTo(active - 1);
      } else if (e.key === "m") setMuted((m) => !m);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, goTo, onClose]);

  const node = (
    <div
      className="fixed inset-0 z-[50] bg-background text-foreground md:left-[72px] md:z-[20]"
      role="dialog"
      aria-modal="true"
      aria-label="Offline reels player"
    >
      {/* Header controls (Close & Loop) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))] md:p-6">
        <button
          onClick={onClose}
          aria-label="Close player"
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-background/80 border border-border/50 text-foreground backdrop-blur transition hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => setAutoNext((v) => !v)}
            aria-label={autoNext ? "Auto-next on" : "Loop current reel"}
            title={autoNext ? "Auto-next: on" : "Looping current reel"}
            className={`pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full backdrop-blur transition border ${
              autoNext ? "bg-foreground text-background border-foreground" : "bg-background/80 border-border/50 text-foreground hover:bg-muted"
            }`}
          >
            {autoNext ? <ChevronsDown className="h-5 w-5" /> : <Repeat1 className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Center Tabs (Offline indicator) - Same position as Reels Page */}
      <div className="absolute left-0 right-0 top-14 z-30 flex w-full justify-center px-4 md:top-6 md:justify-end md:pr-24 pointer-events-none">
        <div className="no-scrollbar flex items-center justify-center gap-2 overflow-x-auto sm:gap-3 pointer-events-auto">
          <div className="flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition sm:px-4 sm:text-xs bg-foreground text-background">
            <WifiOff className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>Offline</span>
            <span className="opacity-60 px-0.5">·</span>
            <span className="tabular-nums">
              {Math.min(active + 1, items.length)} / {items.length}
            </span>
          </div>
        </div>
      </div>

      {/* Desktop right sidebar - Arrows only */}
      <div className="absolute right-8 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-4 md:flex">

        {/* Navigation Arrows */}
        <button
          onClick={() => goTo(active - 1)}
          disabled={active <= 0}
          aria-label="Previous reel"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-mist/20 dark:bg-white/10 text-twilight-navy dark:text-cream-linen transition hover:bg-slate-mist/30 dark:hover:bg-white/20 disabled:opacity-20 disabled:cursor-not-allowed backdrop-blur"
        >
          <ChevronUp className="h-6 w-6" />
        </button>
        <button
          onClick={() => goTo(active + 1)}
          disabled={active >= items.length - 1}
          aria-label="Next reel"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-mist/20 dark:bg-white/10 text-twilight-navy dark:text-cream-linen transition hover:bg-slate-mist/30 dark:hover:bg-white/20 disabled:opacity-20 disabled:cursor-not-allowed backdrop-blur"
        >
          <ChevronDown className="h-6 w-6" />
        </button>
      </div>

      {/* Slides */}
      <div
        ref={containerRef}
        className="no-scrollbar h-full w-full snap-y snap-mandatory overflow-y-scroll overscroll-contain"
      >
        {items.map((meta, i) => {
          const reel = catalog?.find((r) => r.videoUrl === meta.url || r.id === meta.reelId) || {
            id: meta.reelId || meta.url,
            videoUrl: meta.url,
            source: "local",
            likes: meta.likes ?? 0,
            views: meta.views ?? 0,
            title: `Reel #${meta.index + 1}`,
            username: "offline_user",
            description: "",
            thumbnail: "",
          };

          return (
            <section
              key={meta.url}
              data-idx={i}
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              className="relative flex h-full w-full snap-start snap-always items-center justify-center bg-background"
            >
              {Math.abs(i - active) <= 2 && (
                <ReelPlayer
                  reel={reel as Reel}
                  active={i === active}
                  muted={muted}
                  onToggleMute={() => setMuted(!muted)}
                  onEnded={() => handleEnded(i)}
                  onWatched={() => {}}
                  distance={Math.abs(i - active)}
                  feedType="offline"
                />
              )}
            </section>
          );
        })}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
