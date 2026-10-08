import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Heart,
  Shield,
  Zap,
  Smartphone,
  Moon,
  Award,
  Play,
  Bookmark,
  Coins,
  Gauge,
  Sparkles,
  Cloud,
  Layers,
  Terminal,
  Tv,
  Music,
  ExternalLink,
  Gift,
  Flame,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/_app/about")({
  component: AboutPage,
});

function AboutPage() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 pb-28">
      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 border-b border-charcoal/10 dark:border-cream/10 pb-8">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl ig-gradient-bg shadow-xl ring-4 ring-twilight-navy/10 dark:ring-cream-linen/10">
          <Play className="h-10 w-10 fill-white text-white ml-1" />
        </div>
        <div className="text-center sm:text-left flex-1">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-cobalt-pop/30 bg-cobalt-pop/10 px-3 py-1 text-xs font-semibold text-cobalt-pop mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Next-Gen Video Platform</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lowercase text-cocoa dark:text-cream leading-tight">
            Shortify
          </h1>
          <p className="mt-1 text-base text-charcoal/70 dark:text-cream/70 max-w-xl">
            An ultra-fast, immersive short video platform built with modern web technologies,
            cloud persistence, and zero interruptions.
          </p>
        </div>
      </div>

      {/* Stats Quick Bar */}
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="paper-card p-4 text-center">
          <div className="font-display text-2xl text-cocoa dark:text-cream">100%</div>
          <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-charcoal/60 dark:text-cream/60 mt-0.5">
            Ad-Free
          </div>
        </div>
        <div className="paper-card p-4 text-center">
          <div className="font-display text-2xl text-cocoa dark:text-cream">Cloud</div>
          <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-charcoal/60 dark:text-cream/60 mt-0.5">
            Supabase DB
          </div>
        </div>
        <div className="paper-card p-4 text-center">
          <div className="font-display text-2xl text-cocoa dark:text-cream">DiceBear</div>
          <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-charcoal/60 dark:text-cream/60 mt-0.5">
            Vector Avatars
          </div>
        </div>
        <div className="paper-card p-4 text-center">
          <div className="font-display text-2xl text-cocoa dark:text-cream">PWA</div>
          <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-charcoal/60 dark:text-cream/60 mt-0.5">
            Offline Ready
          </div>
        </div>
      </div>

      <section className="mt-8 space-y-6">
        {/* Mission / Overview */}
        <div className="paper-card p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="h-5 w-5 text-marker" />
            <h2 className="font-display text-2xl lowercase text-cocoa dark:text-cream">
              what is Shortify?
            </h2>
          </div>
          <p className="text-sm sm:text-base text-charcoal/70 dark:text-cream/70 leading-relaxed">
            Shortify is crafted to redefine how you experience short-form videos. Built from the
            ground up without bloated trackers or invasive ads, it provides instant playback,
            continuous auto-scrolling, high-definition streaming, and rich creator discovery. Every
            interaction is optimized for lightning speed, whether you are browsing on mobile,
            tablet, or desktop.
          </p>
        </div>

        {/* Core Capabilities */}
        <div className="paper-card p-6 sm:p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl lowercase text-cocoa dark:text-cream">
              featured highlights
            </h2>
            <span className="text-xs text-marker font-mono uppercase tracking-wider">v2.4</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FeatureCard
              icon={<Play className="h-4 w-4" />}
              title="Endless Reel Feeds"
              desc="Browse categories, trending feeds, creator pages, and random discovery."
            />
            <FeatureCard
              icon={<Sparkles className="h-4 w-4" />}
              title="DiceBear Avatars"
              desc="Deterministic vector avatars with 9 selectable artistic collections."
            />
            <FeatureCard
              icon={<Cloud className="h-4 w-4" />}
              title="Cloud Database Sync"
              desc="Likes, bookmarks, coins, and settings securely synced across your devices."
            />
            <FeatureCard
              icon={<Coins className="h-4 w-4" />}
              title="Coin Earnings & Shop"
              desc="Earn coins by watching and unlock exclusive badges, themes, and sound effects."
            />

            <FeatureCard
              icon={<Music className="h-4 w-4" />}
              title="Meme Soundboard"
              desc="Add fun auditory feedback and confetti bursts to your likes."
            />
            <FeatureCard
              icon={<Zap className="h-4 w-4" />}
              title="2× Speed & Gestures"
              desc="Press and hold for 2× playback speed, double-tap to like, and instant mute toggle."
            />
            <FeatureCard
              icon={<Gift className="h-4 w-4" />}
              title="Redemption Tracking"
              desc="Submit real rewards redemptions with live database status history."
            />
            <FeatureCard
              icon={<Shield className="h-4 w-4" />}
              title="Secure PIN Protection"
              desc="Biometric / DOB-derived security verification keeping your account private."
            />
            <FeatureCard
              icon={<Smartphone className="h-4 w-4" />}
              title="Progressive Web App"
              desc="Install directly onto iOS, Android, and Desktop with offline video cache."
            />
          </div>
        </div>

        {/* Security & Cloud Architecture */}
        <div className="paper-card p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-5 w-5 text-cobalt-pop" />
            <h2 className="font-display text-2xl lowercase text-cocoa dark:text-cream">
              security & privacy
            </h2>
          </div>
          <p className="text-sm text-charcoal/70 dark:text-cream/70 leading-relaxed">
            Your data and privacy are paramount. Authentication and relational user data are secured
            by enterprise-grade PostgreSQL via Supabase with row-level security. Client credentials
            and sensitive tokens remain shielded behind internal middle-proxy endpoints, ensuring
            no backend URLs or confidential tokens are ever exposed to the public web.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge label="Encrypted Session Token" />
            <Badge label="Proxied Backend Endpoints" />
            <Badge label="Zero Third-Party Trackers" />
            <Badge label="Row-Level Security" />
          </div>
        </div>

        {/* Tech Stack */}
        <div className="paper-card p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="h-5 w-5 text-cocoa dark:text-cream" />
            <h2 className="font-display text-2xl lowercase text-cocoa dark:text-cream">
              technology stack
            </h2>
          </div>
          <p className="text-sm text-charcoal/70 dark:text-cream/70 mb-4">
            Engineered with the modern JavaScript ecosystem for maximum performance and fluid animations:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <TechItem label="React 18" sub="UI Framework" />
            <TechItem label="TypeScript" sub="Type Safety" />
            <TechItem label="TanStack Router" sub="Type-Safe Routing" />
            <TechItem label="Supabase" sub="PostgreSQL DB & Auth" />
            <TechItem label="Tailwind CSS" sub="Design System" />
            <TechItem label="DiceBear API" sub="Dynamic Avatars" />
          </div>
        </div>

        {/* Credits & Developer Attribution */}
        <div className="paper-card p-6 sm:p-8 border-cobalt-pop/30 bg-cobalt-pop/5 dark:bg-secondary/40">
          <h2 className="font-display text-2xl lowercase text-cocoa dark:text-cream mb-2">
            development & credits
          </h2>
          <p className="text-sm text-charcoal/80 dark:text-cream/80 leading-relaxed">
            Shortify is designed, architected, and maintained by{" "}
            <a
              href="https://lfrdcatechnologies.cc.cd"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-cobalt-pop underline underline-offset-2 decoration-cobalt-pop/40 hover:text-cobalt-pop/80 transition-colors"
            >
              LFRDCA Technologies
            </a>
            . We believe in providing open, accessible, and delightful digital experiences.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="https://lfrdcatechnologies.cc.cd"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-charcoal/20 bg-background px-4 py-2 text-xs font-semibold text-cocoa dark:text-cream shadow-sm hover:border-cobalt-pop transition-all"
            >
              <span>Visit LFRDCA Technologies</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <a
              href="https://t.me/kritilfrdca"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0088cc] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#0088cc]/20 hover:bg-[#0077b5] active:scale-95 transition-all"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.08-.19-.09-.05-.21-.02-.3.01-.13.04-2.26 1.45-6.38 4.23-.6.41-1.14.61-1.63.6-.53-.01-1.54-.3-2.29-.54-.92-.3-1.64-.46-1.59-.97.03-.26.41-.53 1.15-.81 4.53-1.97 7.55-3.27 9.05-3.89 4.3-1.78 5.2 2.08 5.16 2.09z" />
              </svg>
              <span>Telegram Support</span>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-charcoal/50 dark:text-cream/50 space-y-2">
        <p>
          © {currentYear} Shortify · All rights reserved.
        </p>
        <p>
          Developed with ❤️ by{" "}
          <a
            href="https://lfrdcatechnologies.cc.cd"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-cobalt-pop font-medium transition-colors"
          >
            LFRDCA Technologies
          </a>
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-charcoal/10 bg-background/60 p-3.5 transition-all hover:border-cobalt-pop/40 hover:bg-background dark:border-cream/10">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cobalt-pop/10 text-cobalt-pop">
        {icon}
      </div>
      <div className="min-w-0">
        <h4 className="text-sm font-bold text-cocoa dark:text-cream">{title}</h4>
        <p className="mt-0.5 text-xs text-charcoal/70 dark:text-cream/70 leading-snug">{desc}</p>
      </div>
    </div>
  );
}

function TechItem({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="rounded-lg border border-charcoal/10 bg-background/50 p-2.5 text-center dark:border-cream/10">
      <div className="text-xs font-bold text-cocoa dark:text-cream">{label}</div>
      <div className="text-[10px] text-charcoal/60 dark:text-cream/60">{sub}</div>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-charcoal/15 bg-background/60 px-2.5 py-1 text-[11px] font-medium text-cocoa dark:border-cream/15 dark:text-cream">
      <CheckCircle2 className="h-3 w-3 text-green-500" />
      {label}
    </span>
  );
}
