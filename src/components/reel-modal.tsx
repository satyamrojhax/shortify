import React, { useState, useRef, useEffect, memo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Play,
  Volume2,
  VolumeX,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  X,
  Radio,
  VideoOff,
  Eye,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Reel, fetchReelComments } from "@/lib/reels";
import { isLiked, toggleLike, isSaved, toggleSave } from "@/lib/storage";
import { UserAvatar } from "@/components/ui/user-avatar";
import { LiveChat } from "@/components/live-chat";
import Hls from "hls.js";

const renderTextWithLinks = (text: string) => {
  if (!text) return text;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part?.startsWith("http") || part?.startsWith("/") ? part : "about:blank"}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

function CommentItem({ c, isReply, isViraly }: { c: any; isReply?: boolean; isViraly?: boolean }) {
  const [showReplies, setShowReplies] = useState(false);
  const author = c.user || c.repliedUser || c.username || "unknown";

  return (
    <div className="flex gap-3 mb-5 group">
      <Link
        to="/creator/$username"
        params={{ username: author }}
        search={{ source: isViraly ? "viraly" : "shorts" }}
      >
        <UserAvatar
          username={author}
          src={
            c.avatar ||
            (isViraly
              ? `https://love.viraly.wtf/profileImages/${encodeURIComponent(author)}.jpg`
              : undefined)
          }
          size="sm"
          className="w-8 h-8 flex-shrink-0"
        />
      </Link>
      <div className="flex-1 text-sm min-w-0">
        <Link
          to="/creator/$username"
          params={{ username: author }}
          search={{ source: isViraly ? "viraly" : "shorts" }}
          className="font-semibold text-charcoal dark:text-cream mr-2 hover:underline"
        >
          {author}
        </Link>
        <span className="text-charcoal/90 dark:text-cream/90 break-words whitespace-pre-wrap block mt-1">
          {renderTextWithLinks(c.comment || c.reply || c.repliedComment)}
        </span>
        <div className="flex items-center gap-4 mt-2 text-xs text-charcoal/50 dark:text-cream/50 font-medium">
          {c.likes > 0 && <span>{c.likes} likes</span>}
        </div>
        {c.replies?.length > 0 && (
          <div className="mt-3 pl-2 border-l border-charcoal/20 dark:border-cream/20">
            <button
              onClick={() => setShowReplies(!showReplies)}
              className="text-xs text-charcoal/50 dark:text-cream/50 font-semibold flex items-center gap-2"
            >
              <span className="w-6 h-[1px] bg-charcoal/30 dark:bg-cream/30"></span>
              {showReplies ? "Hide replies" : `View replies (${c.replies.length})`}
            </button>

            {showReplies && (
              <div className="mt-4 flex flex-col gap-4">
                {c.replies.map((r: any, idx: number) => (
                  <CommentItem key={idx} c={r} isReply={true} isViraly={isViraly} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const Timeline = memo(
  ({
    videoRef,
    active,
  }: {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    active: boolean;
  }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
      const v = videoRef.current;
      if (!v) return;
      const onTime = () => setProgress((v.currentTime / (v.duration || 1)) * 100);
      v.addEventListener("timeupdate", onTime);
      return () => v.removeEventListener("timeupdate", onTime);
    }, [active, videoRef]);

    return (
      <div
        className="absolute bottom-0 left-0 right-0 h-4 z-30 group/timeline flex items-end"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20 group-hover/timeline:h-2.5 transition-all">
          <div
            className="h-full bg-white transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progress || 0}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={(e) => {
            const v = videoRef.current;
            if (v && v.duration) v.currentTime = (parseFloat(e.target.value) / 100) * v.duration;
          }}
        />
      </div>
    );
  },
);

interface ReelModalContentProps {
  reel: Reel;
  reels?: Reel[];
  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  onClose: () => void;
}

function ReelModalContent({
  reel,
  reels,
  currentIndex,
  setCurrentIndex,
  onClose,
}: ReelModalContentProps) {

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [volumeHovered, setVolumeHovered] = useState(false);
  const [volumeInteracting, setVolumeInteracting] = useState(false);
  const [volume, setVolume] = useState(1);
  const [videoRatio, setVideoRatio] = useState<string>("9 / 16");
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isStreamEnded, setIsStreamEnded] = useState(false);
  const [isLoadingStream, setIsLoadingStream] = useState(true);
  const [is2x, setIs2x] = useState(false);
  const holdTimer = useRef<number | null>(null);
  const heldRef = useRef(false);
  const suppressClickRef = useRef(false);
  const holdStartPos = useRef<{ x: number; y: number } | null>(null);
  const isPointerDownRef = useRef(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const lastWheelTime = useRef(0);

  const isLive = Boolean(reel?.isLive || reel?.source === "live" || reel?.id?.startsWith("live-"));

  useEffect(() => {
    if (!reel) return;
    if (isLive) {
      setLiked(false);
      setSaved(false);
      setLikesCount(0);
      return;
    }
    setLiked(isLiked(reel.id));
    setSaved(isSaved(reel.id));
    setLikesCount(reel.likes || 0);
  }, [reel?.id, reel?.likes, isLive]);

  useEffect(() => {
    clearHold();
  }, [reel?.id]);

  // HLS stream setup & management
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !reel) return;

    setIsStreamEnded(false);
    setIsLoadingStream(true);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const streamUrl = reel.videoUrl || reel.streamUrl;
    if (!streamUrl) {
      setIsStreamEnded(true);
      setIsLoadingStream(false);
      return;
    }

    const isHls = streamUrl.includes(".m3u8") || reel.isLive;

    if (isHls) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: Boolean(reel.isLive),
          backBufferLength: 30,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
        });
        hlsRef.current = hls;

        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoadingStream(false);
          setIsStreamEnded(false);
          video.play().catch(() => { });
        });

        hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
          if (data.fatal) {
            console.warn("HLS fatal error:", data.type, data.details);
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                setIsStreamEnded(true);
                setIsLoadingStream(false);
                hls.destroy();
                hlsRef.current = null;
                break;
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        if (video.src !== streamUrl) video.src = streamUrl;
        const onLoaded = () => {
          setIsLoadingStream(false);
          setIsStreamEnded(false);
          video.play().catch(() => { });
        };
        const onError = () => {
          setIsStreamEnded(true);
          setIsLoadingStream(false);
        };
        video.addEventListener("loadedmetadata", onLoaded);
        video.addEventListener("error", onError);

        return () => {
          video.removeEventListener("loadedmetadata", onLoaded);
          video.removeEventListener("error", onError);
        };
      } else {
        setIsStreamEnded(true);
        setIsLoadingStream(false);
      }
    } else {
      if (video.src !== streamUrl) {
        video.src = streamUrl;
      }
      video.play().catch(() => { });
      setIsLoadingStream(false);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [reel?.id, reel?.videoUrl, reel?.streamUrl, reel?.isLive]);

  const retryStream = () => {
    setIsStreamEnded(false);
    setIsLoadingStream(true);
    const video = videoRef.current;
    if (!video) return;

    const streamUrl = reel.videoUrl || reel.streamUrl;
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported() && (streamUrl?.includes(".m3u8") || reel.isLive)) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;
      hls.loadSource(streamUrl || "");
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoadingStream(false);
        setIsStreamEnded(false);
        video.play().catch(() => { });
      });
      hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
        if (data.fatal) {
          setIsStreamEnded(true);
          setIsLoadingStream(false);
          hls.destroy();
          hlsRef.current = null;
        }
      });
    } else if (streamUrl) {
      video.src = streamUrl;
      video.load();
      video.play().catch(() => { });
    }
  };

  useEffect(() => {
    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    window.addEventListener("contextmenu", handleContextMenu, { capture: true, passive: false });
    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
    };
  }, []);

  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const isSwiping = useRef(false);

  const startHold = (clientX?: number, clientY?: number) => {
    if (isLive) return;
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    heldRef.current = false;
    if (clientX !== undefined && clientY !== undefined) {
      holdStartPos.current = { x: clientX, y: clientY };
    }
    holdTimer.current = window.setTimeout(() => {
      const v = videoRef.current;
      if (v) v.playbackRate = 2;
      heldRef.current = true;
      setIs2x(true);
    }, 250);
  };

  const clearHold = () => {
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    holdStartPos.current = null;
    isPointerDownRef.current = false;
    const v = videoRef.current;
    if (v && v.playbackRate !== 1) v.playbackRate = 1;
    if (heldRef.current) {
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 350);
    }
    heldRef.current = false;
    setIs2x(false);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    isPointerDownRef.current = true;
    startHold(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!holdStartPos.current) return;
    const dist = Math.hypot(e.clientX - holdStartPos.current.x, e.clientY - holdStartPos.current.y);
    if (dist > 10) {
      clearHold();
    }
  };

  const handlePointerUp = () => {
    clearHold();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isTransitioning) return;
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
    isSwiping.current = false;
    setIsDragging(true);
    if (!isPointerDownRef.current && e.touches[0]) {
      startHold(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null || touchStartX.current === null || isTransitioning) return;
    const diffY = e.touches[0].clientY - touchStartY.current;
    const diffX = e.touches[0].clientX - touchStartX.current;
    if (Math.abs(diffY) > 8 || Math.abs(diffX) > 8) {
      isSwiping.current = true;
      clearHold();
    }
    if (Math.abs(diffY) > Math.abs(diffX) && reels && reels.length > 1) {
      if ((currentIndex === 0 && diffY > 0) || (currentIndex === reels.length - 1 && diffY < 0)) {
        setDragOffset(diffY * 0.25);
      } else {
        setDragOffset(diffY);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    clearHold();
    if (touchStartY.current === null || isTransitioning) {
      setIsDragging(false);
      setDragOffset(0);
      return;
    }
    const touchEndY = e.changedTouches[0]?.clientY ?? touchStartY.current;
    const diffY = touchEndY - touchStartY.current;
    const threshold = 45;

    setIsDragging(false);

    if (diffY < -threshold && reels && currentIndex < reels.length - 1) {
      // Smooth animated scroll to next
      setIsTransitioning(true);
      setDragOffset(-window.innerHeight * 0.4);
      setTimeout(() => {
        setCurrentIndex((i) => i + 1);
        setDragOffset(0);
        setIsTransitioning(false);
      }, 220);
    } else if (diffY > threshold && reels && currentIndex > 0) {
      // Smooth animated scroll to prev
      setIsTransitioning(true);
      setDragOffset(window.innerHeight * 0.4);
      setTimeout(() => {
        setCurrentIndex((i) => i - 1);
        setDragOffset(0);
        setIsTransitioning(false);
      }, 220);
    } else {
      setDragOffset(0);
    }

    touchStartY.current = null;
    touchStartX.current = null;
    setTimeout(() => {
      isSwiping.current = false;
    }, 150);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!reels || reels.length <= 1 || isTransitioning) return;
    const now = Date.now();
    if (now - lastWheelTime.current < 350) return;
    if (Math.abs(e.deltaY) > 35) {
      lastWheelTime.current = now;
      if (e.deltaY > 0 && currentIndex < reels.length - 1) {
        setIsTransitioning(true);
        setDragOffset(-window.innerHeight * 0.3);
        setTimeout(() => {
          setCurrentIndex((i) => i + 1);
          setDragOffset(0);
          setIsTransitioning(false);
        }, 220);
      } else if (e.deltaY < 0 && currentIndex > 0) {
        setIsTransitioning(true);
        setDragOffset(window.innerHeight * 0.3);
        setTimeout(() => {
          setCurrentIndex((i) => i - 1);
          setDragOffset(0);
          setIsTransitioning(false);
        }, 220);
      }
    }
  };

  const togglePlay = () => {
    if (isSwiping.current || suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const handleLike = () => {
    if (isLive) return;
    const active = toggleLike(reel);
    if (active && !liked) {
      setLikesCount((prev) => prev + 1);
    } else if (!active && liked) {
      setLikesCount((prev) => prev - 1);
    }
    setLiked(active);
  };

  const handleSave = () => {
    if (isLive) return;
    const active = toggleSave(reel);
    setSaved(active);
  };

  const [modalComments, setModalComments] = useState<any[]>(reel.comments || []);
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    setModalComments(reel.comments || []);
    const vidId = String(reel.id || "").replace(/^short-/, "");
    if (vidId && /^\d+$/.test(vidId)) {
      setLoadingComments(true);
      fetchReelComments(vidId)
        .then((cmts) => {
          if (cmts && cmts.length > 0) {
            setModalComments(cmts);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingComments(false));
    }
  }, [reel.id]);

  const isGeneric =
    !reel.username ||
    reel.username === "local" ||
    reel.source === "local";

  const isShorts =
    reel.originSystem === "shorts" ||
    reel.originPlayer === "normal" ||
    reel.source === "trending" ||
    reel.source === "shorts";

  let profileImageUrl: string | undefined = reel.creator_image;
  if (!profileImageUrl && !isGeneric && !reel.isLive && !isShorts && reel.username) {
    profileImageUrl = `https://love.viraly.wtf/profileImages/${encodeURIComponent(reel.username)}.jpg`;
  }
  if (profileImageUrl && profileImageUrl.includes("/local.jpg")) {
    profileImageUrl = undefined;
  }

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: reel.title || "Check out this reel!",
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.target as HTMLVideoElement;
    if (video.videoWidth && video.videoHeight) {
      setVideoRatio(`${video.videoWidth} / ${video.videoHeight}`);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/80 backdrop-blur-sm p-0 md:p-8">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white z-[60] p-2 hover:bg-white/10 rounded-full transition"
      >
        <X className="w-8 h-8" />
      </button>

      {reels && currentIndex > 0 && (
        <button
          onClick={() => setCurrentIndex((i) => i - 1)}
          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-[60] p-3 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      )}

      {reels && currentIndex < reels.length - 1 && (
        <button
          onClick={() => setCurrentIndex((i) => i + 1)}
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-[60] p-3 bg-black/50 text-white rounded-full hover:bg-black/70 backdrop-blur"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      )}

      <div className="relative flex justify-center w-full max-w-[1200px] h-[100dvh] md:h-[90vh] md:max-h-[900px]">
        <div className="flex w-full md:w-fit max-w-full bg-background rounded-none md:rounded-xl overflow-hidden border border-charcoal/10 dark:border-cream/10 shadow-2xl relative z-10">
          {/* Left Side: Video */}
          <div
            className="relative bg-black flex items-center justify-center h-full group shrink-0 w-full md:w-auto select-none"
            style={{
              aspectRatio:
                typeof window !== "undefined" && window.innerWidth >= 768 ? videoRatio : "auto",
              maxWidth:
                typeof window !== "undefined" && window.innerWidth >= 768
                  ? "calc(100% - 350px)"
                  : "100%",
              transform: `translateY(${dragOffset}px)`,
              transition: isDragging
                ? "none"
                : "transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1)",
              WebkitTouchCallout: "none",
              WebkitUserSelect: "none",
              userSelect: "none",
            }}
            onClick={togglePlay}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              return false;
            }}
          >
            {/* 2x Speed Indicator */}
            {is2x && !isLive && (
              <div className="absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-full bg-black/80 px-4 py-1.5 text-sm font-bold text-white pointer-events-none drop-shadow-md animate-fade-in">
                2× Speed
              </div>
            )}

            <video
              ref={videoRef}
              poster={reel.thumbnail}
              className="w-full h-full object-contain md:object-cover select-none pointer-events-none"
              style={{
                pointerEvents: "none",
                WebkitTouchCallout: "none",
                WebkitUserSelect: "none",
                userSelect: "none",
              }}
              autoPlay
              loop={!reel.isLive}
              muted={isMuted}
              playsInline
              disablePictureInPicture
              disableRemotePlayback
              controlsList="nodownload nofullscreen noremoteplayback"
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                return false;
              }}
              onLoadedMetadata={handleLoadedMetadata}
              onWaiting={() => setIsLoadingStream(true)}
              onPlaying={() => setIsLoadingStream(false)}
              onCanPlay={() => setIsLoadingStream(false)}
              onCanPlayThrough={() => setIsLoadingStream(false)}
              onSeeked={() => setIsLoadingStream(false)}
              onTimeUpdate={() => {
                if (isLoadingStream) setIsLoadingStream(false);
              }}
              onError={() => {
                if (reel.isLive) {
                  setIsStreamEnded(true);
                  setIsLoadingStream(false);
                }
              }}
            />

            {/* LIVE Badge & Viewers Count (Top Left) */}
            {reel.isLive && (
              <div className="absolute top-4 left-4 z-30 flex items-center gap-2 pointer-events-none animate-fade-in">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span>LIVE</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-semibold shadow-lg">
                  <Eye size={13} className="text-white/80" />
                  <span>{(reel.viewersCount || reel.views || 0).toLocaleString()} viewers</span>
                </div>
              </div>
            )}

            {/* Connecting Live Loader */}
            {isLoadingStream && !isStreamEnded && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 pointer-events-none">
                <div className="flex flex-col items-center gap-3 text-white">
                  <div className="flex gap-2">
                    {[0, 150, 300].map((d) => (
                      <div
                        key={d}
                        className="h-3 w-3 animate-bounce rounded-full bg-red-500 shadow-lg"
                        style={{ animationDelay: `${d}ms` }}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wider text-white/80">
                    {reel.isLive ? "Connecting Live Stream..." : "Buffering..."}
                  </span>
                </div>
              </div>
            )}

            {/* Stream Has Been Ended Overlay */}
            {isStreamEnded && (
              <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-6 text-center text-white animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-red-500/15 text-red-500 flex items-center justify-center mb-4 ring-8 ring-red-500/10">
                  <VideoOff className="w-8 h-8" />
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
                  Offline
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight mb-2">
                  Stream has been ended
                </h3>
                <p className="text-xs sm:text-sm text-white/70 max-w-sm mb-6 leading-relaxed">
                  {reel.username ? `${reel.username}'s live broadcast` : "This live stream"} is
                  currently offline or has concluded.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      retryStream();
                    }}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
                  >
                    <RefreshCw size={13} />
                    <span>Try Again</span>
                  </button>
                  {reels && currentIndex < reels.length - 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentIndex((i) => i + 1);
                      }}
                      className="px-4 py-2 rounded-xl bg-primary text-primary-foreground active:scale-95 text-xs font-semibold flex items-center gap-1.5 transition hover:opacity-90 cursor-pointer shadow-lg"
                    >
                      <span>Next Stream</span>
                      <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Play/Pause Overlay Icon */}
            {!isPlaying && !isStreamEnded && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                <div className="bg-black/50 p-4 rounded-full text-white backdrop-blur-md">
                  <Play className="w-10 h-10 fill-current" />
                </div>
              </div>
            )}

            {/* Mobile Bottom Caption Info */}
            <div className="absolute bottom-4 left-4 right-16 z-20 md:hidden pointer-events-auto">
              <div className="flex items-center gap-2.5">
                <UserAvatar
                  name={reel.username}
                  src={profileImageUrl}
                  size="sm"
                  className={`shrink-0 ${reel.isLive ? "ring-2 ring-red-500" : ""}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-white font-bold text-sm truncate drop-shadow-md flex items-center gap-1.5">
                    <span>{reel.username}</span>
                    {reel.isLive && (
                      <span className="text-[10px] bg-red-600 px-1.5 py-0.2 rounded text-white font-bold uppercase tracking-wider">
                        LIVE
                      </span>
                    )}
                  </div>
                  <div className="text-white/70 text-xs truncate">
                    {reel.isLive
                      ? `${(reel.viewersCount || reel.views || 0).toLocaleString()} watching`
                      : reel.title}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline or Live Bar */}
            {reel.isLive ? (
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-red-600/30">
                <div className="h-full bg-red-600 w-full animate-pulse" />
              </div>
            ) : (
              <Timeline videoRef={videoRef} active={true} />
            )}

            {/* Volume Control */}
            <div
              className={`absolute bottom-6 right-6 flex flex-col items-center gap-2 p-2 px-3 rounded-full opacity-0 group-hover:opacity-100 transition backdrop-blur-md ${volumeHovered ? "bg-black/70" : "bg-black/50"}`}
              onMouseEnter={() => setVolumeHovered(true)}
              onMouseLeave={() => setVolumeHovered(false)}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="overflow-hidden transition-all duration-300 ease-out relative flex items-center justify-center touch-none cursor-pointer"
                style={{ height: volumeHovered ? 88 : 0, width: 28 }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  setVolumeInteracting(true);

                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top - 8;
                  let val = 1 - y / 72;
                  val = Math.max(0, Math.min(1, val));
                  setVolume(val);
                  if (videoRef.current) {
                    videoRef.current.volume = val;
                    if (val > 0 && isMuted) {
                      videoRef.current.muted = false;
                      setIsMuted(false);
                    }
                    if (val === 0 && !isMuted) {
                      videoRef.current.muted = true;
                      setIsMuted(true);
                    }
                  }
                }}
                onPointerMove={(e) => {
                  if (!volumeInteracting) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top - 8;
                  let val = 1 - y / 72;
                  val = Math.max(0, Math.min(1, val));
                  setVolume(val);
                  if (videoRef.current) {
                    videoRef.current.volume = val;
                    if (val > 0 && isMuted) {
                      videoRef.current.muted = false;
                      setIsMuted(false);
                    }
                    if (val === 0 && !isMuted) {
                      videoRef.current.muted = true;
                      setIsMuted(true);
                    }
                  }
                }}
                onPointerUp={(e) => {
                  (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                  setVolumeInteracting(false);
                  setVolumeHovered(false);
                }}
                onPointerCancel={(e) => {
                  (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
                  setVolumeInteracting(false);
                  setVolumeHovered(false);
                }}
              >
                {/* Track */}
                <div className="relative w-1 h-[72px] bg-white/30 rounded-full overflow-hidden pointer-events-none">
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-white"
                    style={{ height: `${(isMuted ? 0 : volume) * 100}%` }}
                  />
                </div>
                {/* Thumb */}
                <div
                  className="absolute w-3 h-3 bg-white rounded-full pointer-events-none shadow-md"
                  style={{ bottom: 8 + (isMuted ? 0 : volume) * 72 - 6 }}
                />
              </div>
              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.muted = !isMuted;
                    setIsMuted(!isMuted);
                  }
                }}
                className="text-white"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Right Side: Sidebar */}
          <div className="hidden md:flex flex-col w-[350px] bg-dew dark:bg-secondary border-l border-charcoal/10 dark:border-cream/10 h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-charcoal/10 dark:border-cream/10">
              <div className="flex items-center gap-3 min-w-0">
                {isLive ? (
                  <div className="flex items-center gap-3 min-w-0 select-none">
                    <UserAvatar
                      username={reel.username}
                      src={profileImageUrl}
                      size="md"
                      className="w-10 h-10 shrink-0 ring-2 ring-red-500"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-charcoal dark:text-cream text-sm truncate">
                          {reel.username}
                        </span>
                        <span className="shrink-0 px-1.5 py-0.2 bg-red-600 text-white font-bold text-[9px] rounded uppercase tracking-wider">
                          LIVE
                        </span>
                      </div>
                      <div className="text-xs text-red-500 dark:text-red-400 font-medium flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span>
                          {(reel.viewersCount || reel.views || 0).toLocaleString()} watching
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Link
                      to="/creator/$username"
                      params={{ username: reel.username || "unknown" }}
                      search={{ source: isShorts ? "shorts" : "viraly" }}
                      className="flex items-center gap-3 min-w-0"
                    >
                      <UserAvatar
                        username={reel.username}
                        src={profileImageUrl}
                        size="md"
                        className="w-10 h-10 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-charcoal dark:text-cream text-sm hover:underline truncate">
                            {reel.username}
                          </span>
                        </div>
                      </div>
                    </Link>
                    <span className="text-charcoal/50 dark:text-cream/50 text-sm">•</span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setIsFollowing(!isFollowing);
                      }}
                      className={`font-semibold text-sm transition shrink-0 ${isFollowing ? "text-muted-foreground" : "text-[#0095f6] hover:text-[#0077c5] dark:hover:text-white"}`}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Live Chat for PC live streams OR Comments for standard videos */}
            {isLive ? (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <LiveChat
                  key={reel.id}
                  modelId={reel.modelId || reel.id}
                  reelId={reel.id}
                  streamUrl={reel.videoUrl || reel.streamUrl}
                  modelName={reel.username}
                  viewersCount={reel.viewersCount || reel.views}
                />
              </div>
            ) : (
              <>
                {/* Comments & Description Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  {/* Description as first "comment" */}
                  <div className="flex gap-3 mb-6">
                    <Link
                      to="/creator/$username"
                      params={{ username: reel.username || "unknown" }}
                      search={{ source: isShorts ? "shorts" : "viraly" }}
                    >
                      <UserAvatar
                        username={reel.username}
                        src={profileImageUrl}
                        size="sm"
                        className="w-8 h-8 flex-shrink-0"
                      />
                    </Link>
                    <div className="text-sm min-w-0 flex-1">
                      <Link
                        to="/creator/$username"
                        params={{ username: reel.username || "unknown" }}
                        search={{ source: isShorts ? "shorts" : "viraly" }}
                        className="font-semibold text-charcoal dark:text-cream mr-2 hover:underline"
                      >
                        {reel.username}
                      </Link>
                      <span className="text-charcoal/90 dark:text-cream/90 break-words whitespace-pre-wrap">
                        {reel.title} {reel.description}
                      </span>
                    </div>
                  </div>

                  {/* Actual Comments */}
                  {loadingComments && (
                    <div className="flex items-center justify-center py-4 text-xs text-charcoal/50 dark:text-cream/50 gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Loading comments...</span>
                    </div>
                  )}
                  {modalComments?.map((c: any, i: number) => (
                    <CommentItem key={i} c={c} isViraly={!isShorts} />
                  ))}
                  {!loadingComments && !modalComments?.length && (
                    <div className="text-center text-xs text-charcoal/50 dark:text-cream/50 py-6">
                      No comments yet.
                    </div>
                  )}
                </div>

                {/* Action Buttons & Info */}
                <div className="p-4 border-t border-charcoal/10 dark:border-cream/10 bg-dew dark:bg-secondary">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={handleLike}
                        className="text-charcoal hover:opacity-70 dark:text-cream transition"
                        aria-label="Like reel"
                      >
                        <Heart className={`w-6 h-6 ${liked ? "fill-red-500 text-red-500" : ""}`} />
                      </button>
                      <button
                        className="text-charcoal hover:opacity-70 dark:text-cream transition"
                        aria-label="Comments"
                      >
                        <MessageCircle className="w-6 h-6" />
                      </button>
                      <button
                        onClick={handleShare}
                        className="text-charcoal hover:opacity-70 dark:text-cream transition"
                        aria-label="Share"
                      >
                        <Share2 className="w-6 h-6" />
                      </button>
                    </div>
                    <button
                      onClick={handleSave}
                      className="text-charcoal hover:opacity-70 dark:text-cream transition"
                      aria-label="Save reel"
                    >
                      <Bookmark className={`w-6 h-6 ${saved ? "fill-charcoal dark:fill-cream" : ""}`} />
                    </button>
                  </div>

                  <div className="font-semibold text-charcoal dark:text-cream text-sm mb-1">
                    {likesCount > 0
                      ? `${likesCount.toLocaleString()} likes`
                      : `${(reel.views || 0).toLocaleString()} views`}
                  </div>
                  <div className="text-charcoal/50 dark:text-cream/50 text-[10px] uppercase tracking-wide">
                    {reel.timeAgo || "Some moment ago"}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReelModal({
  reel: singleReel,
  reels,
  initialIndex = 0,
  onClose,
}: {
  reel?: Reel;
  reels?: Reel[];
  initialIndex?: number;
  onClose: () => void;
}) {
  const safeInitial = Math.max(0, initialIndex ?? 0);
  const [currentIndex, setCurrentIndex] = useState(safeInitial);

  useEffect(() => {
    if (initialIndex !== undefined && initialIndex >= 0) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex]);

  const reel = (reels && reels[currentIndex]) || singleReel;

  if (!reel) return null;

  return (
    <ReelModalContent
      reel={reel}
      reels={reels}
      currentIndex={currentIndex}
      setCurrentIndex={setCurrentIndex}
      onClose={onClose}
    />
  );
}
