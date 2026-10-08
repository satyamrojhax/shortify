import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/maintenance")({
  component: MaintenancePage,
});

function MaintenancePage() {
  // Call useAuth so that the real-time listener works.
  // If maintenance ends, useAuth's internal effect will redirect the user back.
  useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-6 text-center relative">
      <div className="mb-6 w-24 h-24 bg-foreground/5 rounded-full flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/80">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
        </svg>
      </div>
      <h1 className="font-display text-4xl mb-4 lowercase tracking-tight">System <span className="text-marker">Maintenance</span></h1>
      <p className="text-foreground/60 max-w-md text-lg leading-relaxed mb-8">
        We are currently upgrading InstaReels for a better experience. We'll be back online shortly!
      </p>
      
      {/* Small subtle text at the bottom for admin to login if needed */}
      <a href="/login?admin=true" className="absolute bottom-6 text-xs text-foreground/20 hover:text-foreground/40 transition-colors uppercase tracking-widest font-display">
        admin access
      </a>
    </div>
  );
}
