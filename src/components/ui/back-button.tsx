import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

interface BackButtonProps {
  className?: string;
  variant?: "floating" | "inline";
}

export function BackButton({ className = "", variant = "inline" }: BackButtonProps) {
  const navigate = useNavigate();
  
  const baseClasses = "inline-flex items-center justify-center rounded-full transition-colors z-50";
  
  const variants = {
    floating: "absolute top-4 left-4 h-10 w-10 bg-black/40 text-white hover:bg-black/60 backdrop-blur-md shadow-lg",
    inline: "mb-6 h-10 w-10 bg-dew text-cocoa hover:bg-charcoal/10 dark:bg-secondary dark:text-cream dark:hover:bg-cream/10",
  };

  return (
    <button 
      onClick={() => window.history.back()} 
      className={`${baseClasses} ${variants[variant]} ${className}`}
      aria-label="Go back"
    >
      <ChevronLeft className="h-6 w-6" />
    </button>
  );
}
