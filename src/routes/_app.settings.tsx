import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme, type Theme } from "@/hooks/use-theme";
import {
  getLiked,
  getSaved,
  KEYS,
  get,
  getFavorites,
  getCoins,
  hasUnlocked,
  getRandomMode,
  setRandomMode,
  getAvatarStyle,
  getAvatarSeed,
  getStreak,
} from "@/lib/storage";
import { useHydrated } from "@/hooks/use-hydrated";
import { usePwa } from "@/hooks/use-pwa";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  Moon,
  Sun,
  Monitor,
  Trash2,
  Download,
  BadgeCheck,
  Gift,
  Heart,
  Bookmark,
  ShoppingBag,
  Users,
  Eye,
  Trophy,
  Flame,
  ChevronRight,
  LogOut,
  Info
} from "lucide-react";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const { username, logout } = useAuth();
  const { canInstall, install } = usePwa();
  const { theme, setTheme } = useTheme();
  const hydrated = useHydrated();
  
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  const [likedCount, setLikedCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [watched, setWatched] = useState(0);
  const [coins, setCoins] = useState(0);
  const [streak, setStreak] = useState(0);
  const [randomMode, setRandomModeState] = useState(false);

  const [avatarStyle, setAvatarStyleState] = useState<string>("avataaars");
  const [avatarSeed, setAvatarSeedState] = useState<string>("");

  useEffect(() => {
    if (!hydrated) return;
    setLikedCount(getLiked().length);
    setSavedCount(getSaved().length);
    setFavoritesCount(getFavorites().length);
    setWatched(get<number>(KEYS.watched, 0));
    setCoins(getCoins());
    setStreak(getStreak().current);
    setRandomModeState(getRandomMode());
    setAvatarStyleState(getAvatarStyle());
    setAvatarSeedState(getAvatarSeed(username || ""));
  }, [hydrated, username]);

  const themes: { key: Theme; label: string; icon: typeof Sun }[] = [
    { key: "light", label: "light", icon: Sun },
    { key: "dark", label: "dark", icon: Moon },
    { key: "system", label: "system", icon: Monitor },
  ];

  if (!hydrated) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-10">
      <p className="font-display text-marker text-xl lowercase italic">your little corner —</p>
      <h1 className="mt-2 font-display text-[48px] leading-[1.05] lowercase text-cocoa md:text-[64px] dark:text-cream">
        settings.
      </h1>

      {/* Profile summary */}
      <section className="mt-8">
        <Link 
          to="/profile" 
          className="paper-card p-4 sm:p-6 flex items-center justify-between group transition hover:-translate-y-1 hover:shadow-lg"
        >
          <div className="flex items-center gap-4">
            <UserAvatar
              username={username}
              seed={avatarSeed || username}
              style={avatarStyle}
              size="lg"
              className="h-16 w-16 shadow-sm ring-2 ring-cobalt-pop/20"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-2 font-display text-2xl lowercase text-cocoa dark:text-cream">
                @{username}
                {hasUnlocked("badge_verified") && <BadgeCheck className="h-5 w-5 text-blue-500" />}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-charcoal/60 dark:text-cream/60">
                <span>a reels reader</span>
                <span>•</span>
                <span className="flex items-center text-orange-500 font-medium">
                  <Flame className="h-3 w-3 mr-0.5" /> {streak}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-dew dark:bg-secondary text-cocoa dark:text-cream group-hover:bg-marker group-hover:text-white transition-colors">
            <ChevronRight className="h-5 w-5" />
          </div>
        </Link>
      </section>

      {/* Preferences */}
      <section className="mt-8">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-charcoal/50 dark:text-cream/50 mb-3 px-2">
          Preferences
        </h2>
        
        <div className="paper-card p-4 sm:p-6 flex flex-col gap-6">
          {/* Theme */}
          <div>
            <div className="font-display text-lg lowercase text-cocoa dark:text-cream mb-3">
              appearance
            </div>
            <div className="grid grid-cols-3 gap-2">
              {themes.map((t) => {
                const Icon = t.icon;
                const active = theme === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTheme(t.key)}
                    className={`flex flex-col items-center gap-2 rounded-lg border-[1.5px] px-3 py-3 text-sm lowercase transition ${
                      active
                        ? "border-charcoal bg-dew font-medium text-cocoa dark:border-cream dark:bg-secondary dark:text-cream"
                        : "border-charcoal/30 text-charcoal/70 hover:bg-dew dark:border-cream/30 dark:text-cream/70 dark:hover:bg-secondary"
                    }`}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-charcoal/10 dark:border-cream/10" />

          {/* Random Mode */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-display text-lg lowercase text-cocoa dark:text-cream">
                show random reels
              </div>
              <div className="text-xs sm:text-sm text-charcoal/70 dark:text-cream/70">
                mix all sources randomly across tabs.
              </div>
            </div>
            <button
              onClick={() => {
                const next = !randomMode;
                setRandomModeState(next);
                setRandomMode(next);
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                randomMode ? "bg-marker" : "bg-charcoal/20 dark:bg-cream/20"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  randomMode ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Install App */}
          {canInstall && (
            <>
              <hr className="border-charcoal/10 dark:border-cream/10" />
              <button
                onClick={() => install()}
                className="flex w-full items-center justify-between text-left group"
              >
                <div>
                  <div className="font-display text-lg lowercase text-cocoa dark:text-cream group-hover:text-marker transition-colors">
                    install app
                  </div>
                  <div className="text-xs sm:text-sm text-charcoal/70 dark:text-cream/70">
                    add to home screen for a better experience.
                  </div>
                </div>
                <Download className="h-5 w-5 text-cocoa dark:text-cream group-hover:text-marker transition-colors" />
              </button>
            </>
          )}
        </div>
      </section>

      {/* Your Content */}
      <section className="mt-8">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-charcoal/50 dark:text-cream/50 mb-3 px-2">
          Your Content
        </h2>
        
        <div className="flex flex-col gap-2">
          <Link
            to="/liked"
            className="paper-card flex w-full items-center justify-between p-4 sm:p-5 text-left transition hover:-translate-y-1 hover:shadow-md group"
          >
            <div>
              <div className="font-display text-lg lowercase text-cocoa dark:text-cream group-hover:text-marker transition-colors">
                liked reels
              </div>
              <div className="text-xs sm:text-sm text-charcoal/70 dark:text-cream/70">
                view your {likedCount} liked reels.
              </div>
            </div>
            <Heart className="h-5 w-5 text-cocoa dark:text-cream group-hover:text-marker transition-colors" />
          </Link>

          <Link
            to="/saved"
            className="paper-card flex w-full items-center justify-between p-4 sm:p-5 text-left transition hover:-translate-y-1 hover:shadow-md group"
          >
            <div>
              <div className="font-display text-lg lowercase text-cocoa dark:text-cream group-hover:text-marker transition-colors">
                saved reels
              </div>
              <div className="text-xs sm:text-sm text-charcoal/70 dark:text-cream/70">
                view your {savedCount} saved reels.
              </div>
            </div>
            <Bookmark className="h-5 w-5 text-cocoa dark:text-cream group-hover:text-marker transition-colors" />
          </Link>

          <Link
            to="/favorites"
            className="paper-card flex w-full items-center justify-between p-4 sm:p-5 text-left transition hover:-translate-y-1 hover:shadow-md group"
          >
            <div>
              <div className="font-display text-lg lowercase text-cocoa dark:text-cream group-hover:text-marker transition-colors">
                favorites
              </div>
              <div className="text-xs sm:text-sm text-charcoal/70 dark:text-cream/70">
                view your {favoritesCount} favorite creators.
              </div>
            </div>
            <Users className="h-5 w-5 text-cocoa dark:text-cream group-hover:text-marker transition-colors" />
          </Link>
          
          <Link
            to="/history"
            className="paper-card flex w-full items-center justify-between p-4 sm:p-5 text-left transition hover:-translate-y-1 hover:shadow-md group"
          >
            <div>
              <div className="font-display text-lg lowercase text-cocoa dark:text-cream group-hover:text-marker transition-colors">
                watch history
              </div>
              <div className="text-xs sm:text-sm text-charcoal/70 dark:text-cream/70">
                revisit reels you've watched ({watched}).
              </div>
            </div>
            <Eye className="h-5 w-5 text-cocoa dark:text-cream group-hover:text-marker transition-colors" />
          </Link>

          <Link
            to="/downloaded"
            className="paper-card flex w-full items-center justify-between p-4 sm:p-5 text-left transition hover:-translate-y-1 hover:shadow-md group"
          >
            <div>
              <div className="font-display text-lg lowercase text-cocoa dark:text-cream group-hover:text-marker transition-colors">
                downloads
              </div>
              <div className="text-xs sm:text-sm text-charcoal/70 dark:text-cream/70">
                manage offline reels and download more.
              </div>
            </div>
            <Download className="h-5 w-5 text-cocoa dark:text-cream group-hover:text-marker transition-colors" />
          </Link>
        </div>
      </section>

      {/* Community & Rewards */}
      <section className="mt-8">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-charcoal/50 dark:text-cream/50 mb-3 px-2">
          Community & Rewards
        </h2>
        
        <div className="flex flex-col gap-2">
          <Link
            to="/leaderboard"
            className="paper-card flex w-full items-center justify-between p-4 sm:p-5 text-left transition hover:-translate-y-1 hover:shadow-md group"
          >
            <div>
              <div className="font-display text-lg lowercase text-cocoa dark:text-cream group-hover:text-marker transition-colors">
                leaderboard
              </div>
              <div className="text-xs sm:text-sm text-charcoal/70 dark:text-cream/70">
                see the top creators and rankings.
              </div>
            </div>
            <Trophy className="h-5 w-5 text-cocoa dark:text-cream group-hover:text-marker transition-colors" />
          </Link>

          <Link
            to="/shop"
            className="paper-card flex w-full items-center justify-between p-4 sm:p-5 text-left transition hover:-translate-y-1 hover:shadow-md group"
          >
            <div>
              <div className="font-display text-lg lowercase text-cocoa dark:text-cream group-hover:text-marker transition-colors">
                shop
              </div>
              <div className="text-xs sm:text-sm text-charcoal/70 dark:text-cream/70">
                browse the store and redeem your coins.
              </div>
            </div>
            <ShoppingBag className="h-5 w-5 text-cocoa dark:text-cream group-hover:text-marker transition-colors" />
          </Link>
          
          <Link
            to="/redeem"
            className="paper-card flex w-full items-center justify-between p-4 sm:p-5 text-left transition hover:-translate-y-1 hover:shadow-md border-magenta-haze/30 bg-magenta-haze/5 dark:border-periwinkle-sky/30 dark:bg-periwinkle-sky/5 group"
          >
            <div>
              <div className="font-display text-lg lowercase text-magenta-haze dark:text-periwinkle-sky group-hover:opacity-80 transition-opacity">
                earnings
              </div>
              <div className="text-xs sm:text-sm text-charcoal/70 dark:text-cream/70">
                you have {coins} coins. redeem them for rewards.
              </div>
            </div>
            <Gift className="h-6 w-6 text-magenta-haze dark:text-periwinkle-sky group-hover:opacity-80 transition-opacity" />
          </Link>
        </div>
      </section>

      {/* General & Account */}
      <section className="mt-8">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-charcoal/50 dark:text-cream/50 mb-3 px-2">
          General & Account
        </h2>
        
        <div className="flex flex-col gap-2">
          <Link
            to="/about"
            className="paper-card flex w-full items-center justify-between p-4 sm:p-5 text-left transition hover:-translate-y-1 hover:shadow-md group"
          >
            <div>
              <div className="font-display text-lg lowercase text-cocoa dark:text-cream group-hover:text-marker transition-colors">
                about us
              </div>
              <div className="text-xs sm:text-sm text-charcoal/70 dark:text-cream/70">
                learn more about this app.
              </div>
            </div>
            <Info className="h-5 w-5 text-cocoa dark:text-cream group-hover:text-marker transition-colors" />
          </Link>

          <button
            onClick={() => setShowResetConfirm(true)}
            className="paper-card flex w-full items-center justify-between p-4 sm:p-5 text-left transition hover:-translate-y-1 hover:shadow-md group"
          >
            <div>
              <div className="font-display text-lg lowercase text-cocoa dark:text-cream group-hover:text-red-500 transition-colors">
                reset all stats
              </div>
              <div className="text-xs sm:text-sm text-charcoal/70 dark:text-cream/70">
                clear all liked, saved, coins and watched reels.
              </div>
            </div>
            <Trash2 className="h-5 w-5 text-charcoal/60 dark:text-cream/60 group-hover:text-red-500 transition-colors" />
          </button>
          
          <button
            onClick={() => {
              logout();
              navigate({ to: "/login" });
            }}
            className="paper-card flex w-full items-center justify-between p-4 sm:p-5 text-left transition hover:-translate-y-1 hover:shadow-md group"
          >
            <div>
              <div className="font-display text-lg lowercase text-marker">log out</div>
              <div className="text-xs sm:text-sm text-charcoal/70 dark:text-cream/70">
                sign out of this device.
              </div>
            </div>
            <img src="data:image/svg+xml;base64,CiAgICA8c3ZnCiAgICAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgICAgZmlsbD0ibm9uZSIKICAgICAgdmlld0JveD0iMCAwIDI0IDI0IgogICAgICBzdHJva2Utd2lkdGg9IjEuNSIKICAgICAgc3Ryb2tlPSJjdXJyZW50Q29sb3IiCiAgICAgIAogICAgPgogICAgICA8cGF0aAogICAgICAgIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIKICAgICAgICBzdHJva2UtbGluZWpvaW49InJvdW5kIgogICAgICAgIGQ9Ik01LjYzNiA1LjYzNmE5IDkgMCAxIDAgMTIuNzI4IDBNMTIgM3Y5IgogICAgICAvPgogICAgPC9zdmc+CiA=" alt="logout" className="h-5 w-5 text-marker" />
          </button>
        </div>
      </section>

      <div className="mt-12 mb-8 flex flex-col items-center justify-center">
        <img src="https://static.pw.live/5eb393ee95fab7468a79d189/ADMIN/884f4b16-1d2b-42ce-856b-eef1b49c0850.svg" alt="Love Learning" className="h-20 sm:h-24 object-contain mb-3 drop-shadow-sm" />
        <p className="text-xs font-medium text-charcoal/70 dark:text-cream/70">
          Made with ❤️ in India
        </p>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 animate-in fade-in duration-200">
          <div className="paper-card max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
            <h2 className="font-display text-2xl lowercase text-cocoa dark:text-cream">
              reset all stats?
            </h2>
            <p className="mt-2 text-sm text-charcoal/70 dark:text-cream/70">
              this will clear all your liked reels, saved reels, coins and watch count. this action
              cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 rounded-lg border-[1.5px] border-charcoal px-4 py-2.5 font-display text-sm lowercase text-cocoa transition hover:bg-dew dark:border-cream dark:text-cream dark:hover:bg-secondary"
              >
                cancel
              </button>
              <button
                onClick={async () => {
                  const { clearAllStats } = await import("@/lib/storage");
                  await clearAllStats();
                  setLikedCount(0);
                  setSavedCount(0);
                  setFavoritesCount(0);
                  setWatched(0);
                  setCoins(0);
                  setShowResetConfirm(false);
                  window.location.reload();
                }}
                className="flex-1 rounded-lg border-[1.5px] border-marker bg-marker px-4 py-2.5 font-display text-sm lowercase text-white transition hover:bg-marker/90"
              >
                reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
