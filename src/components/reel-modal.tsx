import React, { useState, useRef, useEffect, memo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  X,
} from "lucide-react";
import { Reel } from "@/lib/reels";
import { isLiked, toggleLike, isSaved, toggleSave } from "@/lib/storage";
import { UserAvatar } from "@/components/ui/user-avatar";

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

function CommentItem({ c, isReply }: { c: any; isReply?: boolean }) {
  const [showReplies, setShowReplies] = useState(false);

  return (
    <div className="flex gap-3 mb-5 group">
      <Link to="/creator/$username" params={{ username: c.user || c.repliedUser || "unknown" }}>
        <UserAvatar
          username={c.user || c.repliedUser}
          src={`https://love.viraly.wtf/profileImages/${c.user || c.repliedUser}.jpg`}
          size="sm"
          className="w-8 h-8 flex-shrink-0"
        />
      </Link>
      <div className="flex-1 text-sm min-w-0">
        <Link
          to="/creator/$username"
          params={{ username: c.user || c.repliedUser || "unknown" }}
          className="font-semibold text-charcoal dark:text-cream mr-2 hover:underline"
        >
          {c.user || c.repliedUser}
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
                  <CommentItem key={idx} c={r} isReply={true} />
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
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const reel = (reels && reels[currentIndex]) || singleReel;

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

  if (!reel) return null;

  useEffect(() => {
    setLiked(isLiked(reel.id));
    setSaved(isSaved(reel.id));
    setLikesCount(reel.likes || 0);
  }, [reel.id]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleLike = () => {
    const active = toggleLike(reel);
    if (active && !liked) {
      setLikesCount((prev) => prev + 1);
    } else if (!active && liked) {
      setLikesCount((prev) => prev - 1);
    }
    setLiked(active);
  };

  const handleSave = () => {
    const active = toggleSave(reel);
    setSaved(active);
  };

  const profileImageUrl =
    reel.creator_image || `https://love.viraly.wtf/profileImages/${reel.username}.jpg`;

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
            className="relative bg-black flex items-center justify-center h-full group shrink-0 transition-all duration-300 w-full md:w-auto"
            style={{
              aspectRatio:
                typeof window !== "undefined" && window.innerWidth >= 768 ? videoRatio : "auto",
              maxWidth:
                typeof window !== "undefined" && window.innerWidth >= 768
                  ? "calc(100% - 350px)"
                  : "100%",
            }}
            onClick={togglePlay}
          >
            <video
              ref={videoRef}
              src={reel.videoUrl?.startsWith("http") || reel.videoUrl?.startsWith("/") ? reel.videoUrl : "about:blank"}
              poster={reel.thumbnail}
              className="w-full h-full object-contain md:object-cover"
              autoPlay
              loop
              muted={isMuted}
              playsInline
              onLoadedMetadata={handleLoadedMetadata}
            />

            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                <div className="bg-black/50 p-4 rounded-full text-white backdrop-blur-md">
                  <Play className="w-10 h-10 fill-current" />
                </div>
              </div>
            )}

            <Timeline videoRef={videoRef} active={true} />

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
                  let y = e.clientY - rect.top - 8;
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
                  let y = e.clientY - rect.top - 8;
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
              <div className="flex items-center gap-3">
                <Link
                  to="/creator/$username"
                  params={{ username: reel.username || "unknown" }}
                  className="flex items-center gap-3"
                >
                  <UserAvatar
                    username={reel.username}
                    src={profileImageUrl}
                    size="md"
                    className="w-10 h-10"
                  />
                  <span className="font-semibold text-charcoal dark:text-cream text-sm hover:underline">
                    {reel.username}
                  </span>
                </Link>
                <span className="text-charcoal/50 dark:text-cream/50 text-sm">•</span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setIsFollowing(!isFollowing);
                  }}
                  className={`font-semibold text-sm transition ${isFollowing ? "text-muted-foreground" : "text-[#0095f6] hover:text-[#0077c5] dark:hover:text-white"}`}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              </div>
            </div>

            {/* Comments & Description Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {/* Description as first "comment" */}
              <div className="flex gap-3 mb-6">
                <Link to="/creator/$username" params={{ username: reel.username || "unknown" }}>
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
              {reel.comments?.map((c: any, i: number) => (
                <CommentItem key={i} c={c} />
              ))}
            </div>

            {/* Action Buttons & Info */}
            <div className="p-4 border-t border-charcoal/10 dark:border-cream/10 bg-dew dark:bg-secondary">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleLike}
                    className="text-charcoal hover:opacity-70 dark:text-cream transition"
                  >
                    <Heart className={`w-6 h-6 ${liked ? "fill-red-500 text-red-500" : ""}`} />
                  </button>
                  <button className="text-charcoal hover:opacity-70 dark:text-cream transition">
                    <MessageCircle className="w-6 h-6" />
                  </button>
                  <button
                    onClick={handleShare}
                    className="text-charcoal hover:opacity-70 dark:text-cream transition"
                  >
                    <Share2 className="w-6 h-6" />
                  </button>
                </div>
                <button
                  onClick={handleSave}
                  className="text-charcoal hover:opacity-70 dark:text-cream transition"
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
          </div>
        </div>
      </div>
    </div>
  );
}
