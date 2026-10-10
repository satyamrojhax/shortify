import { sanitizeUrl } from "@/lib/utils";
import React, { useState } from "react";
import { getUserAvatarUrl, getDiceBearAvatar, type DiceBearStyle } from "@/lib/avatar";

export interface UserAvatarProps {
  username?: string | null;
  name?: string | null;
  seed?: string | null;
  style?: DiceBearStyle | string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  avatarClassName?: string;
  alt?: string;
  showBorder?: boolean;
  src?: string | null;
}

const sizeClasses: Record<string, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-xl",
  "2xl": "h-20 w-20 text-2xl",
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  username,
  name,
  seed,
  style = "avataaars",
  size = "md",
  className = "",
  avatarClassName = "",
  alt,
  showBorder = true,
  src,
}) => {
  const [srcError, setSrcError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // If a custom src is provided and hasn't errored, use it. Otherwise, use DiceBear API.
  const activeSeed = seed || username || name || "user";
  const dicebearUrl = getDiceBearAvatar(activeSeed, style);
  const imageUrl = src && !srcError ? src : dicebearUrl;
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 ${
        showBorder ? "border-[1.5px] border-twilight-navy/20 dark:border-cream-linen/20" : ""
      } ${sizeClass} ${className}`}
    >
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-muted/60" />
      )}
      <img
        src={imageUrl}
        alt={alt || username || name || "User avatar"}
        className={`h-full w-full object-cover transition-opacity duration-200 ${
          loaded ? "opacity-100" : "opacity-0"
        } ${avatarClassName}`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (src && !srcError) {
            // Fallback to DiceBear if custom src failed
            setSrcError(true);
            setLoaded(false);
          }
        }}
      />
    </div>
  );
};
