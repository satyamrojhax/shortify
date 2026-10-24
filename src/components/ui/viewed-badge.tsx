import * as React from "react";
import { Check, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ViewedBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "badge" | "pill" | "inline";
  size?: "sm" | "md";
  showIcon?: boolean;
}

export function ViewedBadge({
  className,
  variant = "badge",
  size = "sm",
  showIcon = true,
  ...props
}: ViewedBadgeProps) {
  if (variant === "inline") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 select-none",
          size === "sm" ? "text-[11px]" : "text-xs",
          className,
        )}
        {...props}
      >
        {showIcon && <Check className={size === "sm" ? "h-3 w-3 stroke-[2.5]" : "h-3.5 w-3.5 stroke-[2.5]"} />}
        <span>Viewed</span>
      </span>
    );
  }

  if (variant === "pill") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-full bg-black/65 backdrop-blur-md text-emerald-400 border border-emerald-500/30 shadow-lg pointer-events-none select-none animate-in fade-in duration-200",
          size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
          className,
        )}
        {...props}
      >
        {showIcon && <Check className={size === "sm" ? "h-3 w-3 stroke-[2.5]" : "h-3.5 w-3.5 stroke-[2.5]"} />}
        <span>Viewed</span>
      </div>
    );
  }

  // Default: "badge" suitable for reel card thumbnails
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 font-extrabold uppercase tracking-wider rounded bg-black/75 backdrop-blur-md text-emerald-400 border border-emerald-500/35 shadow-md pointer-events-none select-none transition-all duration-200",
        size === "sm"
          ? "px-1.5 py-0.5 text-[9px] sm:text-[10px]"
          : "px-2 py-1 text-[11px]",
        className,
      )}
      {...props}
    >
      {showIcon && (
        <Check
          className={
            size === "sm"
              ? "h-2.5 w-2.5 sm:h-3 sm:w-3 stroke-[2.75]"
              : "h-3.5 w-3.5 stroke-[2.75]"
          }
        />
      )}
      <span>Viewed</span>
    </div>
  );
}
