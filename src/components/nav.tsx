import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Film,
  Heart,
  Bookmark,
  Settings,
  ShoppingBag,
  BadgeCheck,
  Compass,
  PlaySquare,
  Menu,
  X,
  Mic,
  Instagram,
  WandSparkles,
  Users,
  Download,
  Clapperboard,
  Flame,
  GraduationCap,
  Wrench,
  AudioLines,
  Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { hasUnlocked, getAvatarStyle, getAvatarSeed, getStreak } from "@/lib/storage";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useState, useEffect } from "react";

const CourseIcon = ({ className }: { className?: string; strokeWidth?: number }) => (
  <img
    src="https://d2bps9p1kiy4ka.cloudfront.net/5eb393ee95fab7468a79d189/162d2968-abb3-44e0-a6e9-65704b722ce0.png"
    alt="Courses"
    className={className}
  />
);

const bottomItems: { to: any; label: string; icon: any }[] = [
  { to: "/home", label: "home", icon: Home },
  { to: "/explore", label: "search", icon: Search },
  { to: "/reels", label: "reels", icon: PlaySquare },
  { to: "/skills", label: "skills", icon: Wrench },
  { to: "/settings", label: "settings", icon: Settings },
];

const sidebarItems: { to: any; label: string; icon: any }[] = [
  { to: "/home", label: "home", icon: Home },
  { to: "/reels", label: "reels", icon: PlaySquare },
  { to: "/category", label: "instant reels", icon: Flame },
  { to: "/explore", label: "search", icon: Search },
  { to: "/skills", label: "skills", icon: Wrench },
  { to: "/english-course", label: "speaking", icon: AudioLines },
  { to: "/my-courses", label: "my courses", icon: CourseIcon },
  { to: "/settings", label: "settings", icon: Settings },
];

const allItems = [
  { to: "/home", label: "home", icon: Home },
  { to: "/reels", label: "reels", icon: PlaySquare },
  { to: "/category", label: "instant reels", icon: Flame },
  { to: "/explore", label: "search", icon: Search },
  { to: "/skills", label: "skills", icon: Wrench },
  { to: "/english-course", label: "speaking", icon: AudioLines },
  { to: "/my-courses", label: "my courses", icon: CourseIcon },
  { to: "/settings", label: "settings", icon: Settings },
];

function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <span
      className="font-script leading-none text-twilight-navy dark:text-cream-linen"
      style={{ fontSize: size, transform: "translateY(2px)" }}
    >
      Shortify
    </span>
  );
}

export function Sidebar({ username }: { username: string | null }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isVerified = hasUnlocked("badge_verified");
  const isVip = hasUnlocked("badge_vip");
  const avatarStyle = getAvatarStyle();
  const avatarSeed = getAvatarSeed(username || "");
  return (
    <aside className="group/sidebar sticky top-0 z-30 hidden h-screen shrink-0 w-[72px] hover:w-[244px] transition-all duration-300 flex-col border-r border-twilight-navy bg-cloud-white px-3 hover:px-6 py-8 md:flex dark:bg-dusk-indigo dark:border-periwinkle-sky/40 overflow-hidden">
      <Link
        to="/home"
        className="mb-10 flex items-center shrink-0 w-full overflow-hidden whitespace-nowrap pl-1 h-10 group-hover/sidebar:pl-0 transition-all"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center transition-all duration-300 group-hover/sidebar:hidden">
          <Instagram
            className="h-7 w-7 text-twilight-navy dark:text-cream-linen"
            strokeWidth={1.75}
          />
        </div>
        <div className="hidden h-full items-center opacity-0 transition-opacity duration-300 group-hover/sidebar:flex group-hover/sidebar:opacity-100">
          <BrandMark size={34} />
        </div>
      </Link>
      <nav className="flex-1 space-y-2 w-full">
        {sidebarItems.map((it) => {
          const active = pathname === it.to;
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`group relative flex items-center gap-4 rounded-md px-3 py-2.5 text-[15px] transition ${
                active
                  ? "bg-periwinkle-sky text-twilight-navy dark:bg-secondary dark:text-cream-linen"
                  : "text-twilight-navy hover:bg-periwinkle-sky/30 dark:text-cream-linen/80 dark:hover:bg-secondary/60"
              }`}
            >
              <Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={active ? 2.25 : 1.75} />
              <span
                className={`whitespace-nowrap transition-opacity duration-300 opacity-0 group-hover/sidebar:opacity-100 ${active ? "font-medium" : ""}`}
              >
                {it.label}
              </span>
              {active && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-cobalt-pop opacity-0 group-hover/sidebar:opacity-100 transition-opacity" />
              )}
            </Link>
          );
        })}
      </nav>
      {username && (
        <Link
          to="/settings"
          className="mt-6 flex items-center gap-3 rounded-md border border-slate-mist bg-cream-linen p-2 dark:border-periwinkle-sky/40 dark:bg-secondary whitespace-nowrap overflow-hidden transition-all duration-300 w-[44px] group-hover/sidebar:w-full hover:border-cobalt-pop"
        >
          <UserAvatar
            username={username}
            style={avatarStyle}
            seed={avatarSeed || username}
            size="xs"
            className="h-7 w-7"
          />
          <div className="min-w-0 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300">
            <div className="flex items-center gap-1 truncate text-sm font-medium text-twilight-navy dark:text-cream-linen">
              <span className={isVip ? "vip-text" : ""}>@{username}</span>
              {isVip && <span title="VIP">👑</span>}
              {isVerified && <BadgeCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />}
            </div>
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-mist">
              signed in
            </div>
          </div>
        </Link>
      )}
    </aside>
  );
}

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-4 left-1/2 z-40 flex h-14 -translate-x-1/2 items-center gap-1 rounded-full border border-twilight-navy bg-cloud-white px-2 md:hidden dark:border-periwinkle-sky dark:bg-dusk-indigo">
      {bottomItems.map((it) => {
        const active = pathname === it.to;
        const Icon = it.icon;
        return (
          <Link
            key={it.to}
            to={it.to}
            replace={true}
            className={`flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-twilight-navy transition dark:text-cream-linen ${
              active ? "bg-periwinkle-sky dark:bg-secondary" : ""
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
            {active && <span className="ml-2 text-xs lowercase">{it.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function MarqueeStrip() {
  const msg =
    "free shipping on daydreams · pastel sunsets · press hold for 2× · double-tap to like · ";
  const repeated = msg.repeat(6);
  return (
    <div className="marquee-strip">
      <div className="animate-[marquee_45s_linear_infinite] inline-block">{repeated}</div>
      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 bg-background py-3 px-4 text-center text-xs text-muted-foreground md:pl-[244px]"></footer>
  );
}

export function MobileHeader({ username }: { username?: string | null }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const avatarStyle = getAvatarStyle();
  const avatarSeed = getAvatarSeed(username || "");

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-twilight-navy/10 bg-background/80 px-4 backdrop-blur-md md:hidden dark:border-periwinkle-sky/10">
        <Link to="/home" className="flex items-center gap-2">
          <BrandMark size={24} />
        </Link>
        <div className="flex items-center gap-2.5">
          {username && (
            <Link to="/profile" aria-label="Profile">
              <UserAvatar
                username={username}
                style={avatarStyle}
                seed={avatarSeed || username}
                size="xs"
                className="h-8 w-8 ring-1 ring-twilight-navy/20 dark:ring-cream-linen/20"
              />
            </Link>
          )}
          <button
            onClick={() => setOpen(true)}
            className="rounded-md p-1.5 text-twilight-navy transition-colors hover:bg-slate-mist/20 dark:text-cream-linen dark:hover:bg-secondary/60"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 w-3/4 max-w-sm border-l border-twilight-navy/10 bg-background p-6 shadow-xl dark:border-periwinkle-sky/10">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-semibold text-twilight-navy dark:text-cream-linen">Menu</span>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-twilight-navy transition-colors hover:bg-slate-mist/20 dark:text-cream-linen dark:hover:bg-secondary/60"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {username && (
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="mb-6 flex items-center gap-3 rounded-lg border border-slate-mist bg-cream-linen p-3 dark:border-periwinkle-sky/40 dark:bg-secondary"
              >
                <UserAvatar
                  username={username}
                  style={avatarStyle}
                  seed={avatarSeed || username}
                  size="sm"
                  className="h-9 w-9"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-twilight-navy dark:text-cream-linen">
                    @{username}
                  </div>
                  <div className="text-[10px] text-slate-mist">view profile</div>
                </div>
              </Link>
            )}
            <nav className="flex flex-col space-y-2">
              {allItems.map((it) => {
                const active = pathname === it.to;
                const Icon = it.icon;
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition ${
                      active
                        ? "bg-periwinkle-sky text-twilight-navy dark:bg-secondary dark:text-cream-linen"
                        : "text-twilight-navy/80 hover:bg-slate-mist/20 dark:text-cream-linen/80 dark:hover:bg-secondary/60"
                    }`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                    {it.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

export { BrandMark };
