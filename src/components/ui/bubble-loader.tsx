import * as React from "react"
import { cn } from "@/lib/utils"

interface BubbleLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
}

export function BubbleLoader({ className, size = "md", ...props }: BubbleLoaderProps) {
  const sizeClasses = {
    sm: "h-1.5 w-1.5",
    md: "h-2 w-2",
    lg: "h-3 w-3"
  }
  
  const containerClasses = {
    sm: "gap-1",
    md: "gap-1.5",
    lg: "gap-2"
  }

  return (
    <div className={cn("flex items-center justify-center", containerClasses[size], className)} {...props}>
      <div className={cn("rounded-full bg-current animate-bounce", sizeClasses[size])} style={{ animationDelay: "0ms" }} />
      <div className={cn("rounded-full bg-current animate-bounce", sizeClasses[size])} style={{ animationDelay: "150ms" }} />
      <div className={cn("rounded-full bg-current animate-bounce", sizeClasses[size])} style={{ animationDelay: "300ms" }} />
    </div>
  )
}
