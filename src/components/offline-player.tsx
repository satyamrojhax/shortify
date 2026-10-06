import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ChevronsDown,
  ChevronUp,
  Eye,
  Heart,
  Play,
  Repeat1,
  Volume2,
  VolumeX,
  WifiOff,
  X,
} from "lucide-react";
import { formatBytes, getOfflineBlob, type OfflineMeta } from "@/lib/offline-store";

type Props = {
  items: OfflineMeta[];
  startIndex: number;
  onClose: () => void;
};

/** Number formatter: 1.2K / 3.4M */
function compact(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

/**
 * Full-screen, vertical-snap player that plays reels straight from IndexedDB —
 * zero network requests, so it works with the device fully offline.
 */
export function OfflinePlayer({ items, startIndex, onClose }: Props) {
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
      className="fixed inset-0 z-[300] bg-black text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Offline reels player"
    >
      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent p-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:p-5">
        <button
          onClick={onClose}
          aria-label="Close player"
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/25"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="pointer-events-none flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur">
          <WifiOff className="h-3.5 w-3.5 text-emerald-300" />
          <span>Offline</span>
          <span className="opacity-60">·</span>
          <span className="tabular-nums">
            {Math.min(active + 1, items.length)} / {items.length}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAutoNext((v) => !v)}
            aria-label={autoNext ? "Auto-next on" : "Loop current reel"}
            title={autoNext ? "Auto-next: on" : "Looping current reel"}
            className={`pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full backdrop-blur transition ${
              autoNext ? "bg-emerald-400/90 text-black" : "bg-white/15 hover:bg-white/25"
            }`}
          >
            {autoNext ? <ChevronsDown className="h-5 w-5" /> : <Repeat1 className="h-5 w-5" />}
          </button>
          <button
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Unmute" : "Mute"}
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/25"
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Desktop arrows */}
      <div className="absolute right-8 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-4 md:flex">
        <button
          onClick={() => goTo(active - 1)}
          disabled={active <= 0}
          aria-label="Previous reel"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/25 disabled:opacity-20"
        >
          <ChevronUp className="h-6 w-6" />
        </button>
        <button
          onClick={() => goTo(active + 1)}
          disabled={active >= items.length - 1}
          aria-label="Next reel"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/25 disabled:opacity-20"
        >
          <ChevronDown className="h-6 w-6" />
        </button>
      </div>

      {/* Slides */}
      <div
        ref={containerRef}
        className="no-scrollbar h-full w-full snap-y snap-mandatory overflow-y-scroll overscroll-contain"
      >
        {items.map((meta, i) => (
          <section
            key={meta.url}
            data-idx={i}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            className="relative flex h-full w-full snap-start snap-always items-center justify-center"
          >
            <Slide
              meta={meta}
              near={Math.abs(i - active) <= 1}
              active={i === active}
              muted={muted}
              loop={!autoNext}
              onEnded={() => handleEnded(i)}
              onAutoplayBlocked={() => setMuted(true)}
            />
          </section>
        ))}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

// ─── One slide ────────────────────────────────────────────────────────────────

type SlideProps = {
  meta: OfflineMeta;
  near: boolean;
  active: boolean;
  muted: boolean;
  loop: boolean;
  onEnded: () => void;
  onAutoplayBlocked: () => void;
};

function Slide({ meta, near, active, muted, loop, onEnded, onAutoplayBlocked }: SlideProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [paused, setPaused] = useState(false);

  // Only materialise the blob for the current ± 1 slides, release the rest.
  useEffect(() => {
    if (!near) {
      setSrc(null);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    void getOfflineBlob(meta.url).then((blob) => {
      if (cancelled) return;
      if (!blob) {
        setMissing(true);
        return;
      }
      objectUrl = URL.createObjectURL(blob);
      setSrc(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [near, meta.url]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = muted;
  }, [muted, src]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !src) return;
    if (active) {
      v.currentTime = 0;
      setPaused(false);
      v.play().catch(() => {
        // Autoplay with sound was blocked — fall back to muted playback.
        v.muted = true;
        onAutoplayBlocked();
        v.play().catch(() => setPaused(true));
      });
    } else {
      v.pause();
      v.currentTime = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, src]);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-black md:h-[min(100%,920px)] md:w-auto md:aspect-[9/16] md:max-w-[min(100%,520px)] md:rounded-2xl">
      {missing ? (
        <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-white/70">
          This reel's offline file is missing. Re-download it from the downloads page.
        </div>
      ) : (
        <video
          ref={videoRef}
          src={src ?? undefined}
          playsInline
          loop={loop}
          preload="auto"
          disablePictureInPicture
          onClick={toggle}
          onEnded={onEnded}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (barRef.current && v.duration) {
              barRef.current.style.width = `${(v.currentTime / v.duration) * 100}%`;
            }
          }}
          onContextMenu={(e) => e.preventDefault()}
          className="absolute inset-0 h-full w-full cursor-pointer object-cover md:object-contain"
        />
      )}

      {/* Spinner while the blob is being read */}
      {near && !src && !missing && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      )}

      {paused && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black/40 backdrop-blur">
            <Play className="h-10 w-10 fill-white text-white" />
          </div>
        </div>
      )}

      {/* Caption */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-16">
        <p className="text-base font-bold drop-shadow">Reel #{meta.index + 1}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-white/80">
          {meta.views != null && (
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" /> {compact(meta.views)}
            </span>
          )}
          {meta.likes != null && (
            <span className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" /> {compact(meta.likes)}
            </span>
          )}
          <span>{formatBytes(meta.size)}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/20">
        <div ref={barRef} className="h-full w-0 bg-white" />
      </div>
    </div>
  );
}
