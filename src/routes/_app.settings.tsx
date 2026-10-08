import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme, type Theme } from "@/hooks/use-theme";
import {
  getLiked,
  getSaved,
  KEYS,
  get,
  set,
  setLiked,
  setSaved,
  getFavorites,
  setFavorites,
  getCoins,
  hasUnlocked,
  getRandomMode,
  setRandomMode,
  getAvatarStyle,
  setAvatarStyle,
  getAvatarSeed,
  setAvatarSeed,
} from "@/lib/storage";
import { fetchUserProfile } from "@/lib/db";
import { useHydrated } from "@/hooks/use-hydrated";
import { usePwa } from "@/hooks/use-pwa";
import { DICEBEAR_STYLES } from "@/lib/avatar";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  Eye,
  EyeOff,
  LogOut,
  Moon,
  Sun,
  Monitor,
  Trash2,
  Coins,
  Download,
  BadgeCheck,
  Gift,
  Heart,
  Bookmark,
  ShoppingBag,
  Users,
  Sparkles,
  RefreshCw,
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
  const [showPin, setShowPin] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [likedCount, setLikedCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [watched, setWatched] = useState(0);
  const [coins, setCoins] = useState(0);
  const [randomMode, setRandomModeState] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [avatarStyle, setAvatarStyleState] = useState<string>("avataaars");
  const [avatarSeed, setAvatarSeedState] = useState<string>("");

  useEffect(() => {
    if (!hydrated) return;
    setLikedCount(getLiked().length);
    setSavedCount(getSaved().length);
    setFavoritesCount(getFavorites().length);
    setWatched(get<number>(KEYS.watched, 0));
    setCoins(getCoins());
    setRandomModeState(getRandomMode());
    setAvatarStyleState(getAvatarStyle());
    setAvatarSeedState(getAvatarSeed(username || ""));

    const uid = typeof localStorage !== "undefined" ? localStorage.getItem("ig.user_id") : null;
    if (uid) {
      fetchUserProfile(uid)
        .then(data => {
          setEmail(data.email || "");
          setPassword(data.password || "");
        })
        .catch(console.error);
    }
  }, [hydrated, username]);

  const handleStyleChange = (newStyle: string) => {
    setAvatarStyleState(newStyle);
    setAvatarStyle(newStyle);
  };

  const handleRandomizeAvatar = () => {
    const randomSeed = `${username || "user"}_${Math.random().toString(36).substring(2, 7)}`;
    setAvatarSeedState(randomSeed);
    setAvatarSeed(randomSeed);
  };

  const themes: { key: Theme; label: string; icon: typeof Sun }[] = [
    { key: "light", label: "light", icon: Sun },
    { key: "dark", label: "dark", icon: Moon },
    { key: "system", label: "system", icon: Monitor },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <p className="font-display text-marker text-xl lowercase italic">your little corner —</p>
      <h1 className="mt-2 font-display text-[48px] leading-[1.05] lowercase text-cocoa md:text-[64px] dark:text-cream">
        settings.
      </h1>

      {/* Profile */}
      <section className="paper-card mt-8 p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="relative group">
            <UserAvatar
              username={username}
              seed={avatarSeed || username}
              style={avatarStyle}
              size="2xl"
              className="h-20 w-20 shadow-md ring-2 ring-cobalt-pop/30"
            />
            <button
              onClick={handleRandomizeAvatar}
              className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-cobalt-pop text-white shadow-md transition-transform hover:scale-110 active:scale-95"
              title="Roll random avatar variation"
              aria-label="Randomize avatar"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="text-center sm:text-left flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 font-display text-2xl lowercase text-cocoa dark:text-cream">
              @{username}
              {hasUnlocked("badge_verified") && <BadgeCheck className="h-6 w-6 text-blue-500" />}
            </div>
            <div className="text-sm text-marker">a reels reader</div>
            <div className="mt-1 text-xs text-charcoal/60 dark:text-cream/60">
              dropped from universe
            </div>
          </div>
        </div>

        {/* DiceBear Avatar Style Selector */}
        <div className="mt-6 border-t border-charcoal/10 dark:border-cream/10 pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-charcoal/60 dark:text-cream/60">
              choose avatar style
            </span>
            <button
              onClick={handleRandomizeAvatar}
              className="flex items-center gap-1.5 text-xs font-semibold text-cobalt-pop hover:underline"
            >
              <Sparkles className="h-3.5 w-3.5" />
              randomize
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
            {DICEBEAR_STYLES.map((st) => {
              const active = avatarStyle === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => handleStyleChange(st.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl p-2 transition-all border ${
                    active
                      ? "border-cobalt-pop bg-cobalt-pop/10 dark:bg-cobalt-pop/20 shadow-sm"
                      : "border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <UserAvatar
                    username={username}
                    seed={avatarSeed || username}
                    style={st.id}
                    size="sm"
                    className="h-8 w-8"
                  />
                  <span className="text-[10px] font-medium truncate max-w-[60px] text-cocoa dark:text-cream">
                    {st.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {/* Email */}
          <div className="flex items-center justify-between rounded-lg border-[1.5px] border-charcoal/80 bg-dew px-4 py-3 dark:border-cream/50 dark:bg-secondary">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-charcoal/60 dark:text-cream/60">
                email
              </div>
              <div className="mt-0.5 font-mono text-base text-cocoa dark:text-cream">
                {email || "loading..."}
              </div>
            </div>
          </div>

          {/* Password */}
          <div className="flex items-center justify-between rounded-lg border-[1.5px] border-charcoal/80 bg-dew px-4 py-3 dark:border-cream/50 dark:bg-secondary">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-charcoal/60 dark:text-cream/60">
                password
              </div>
              <div className="mt-0.5 font-mono text-base text-cocoa dark:text-cream">
                {showPassword ? password : "••••••••"}
              </div>
            </div>
            <button
              onClick={() => setShowPassword((s) => !s)}
              className="text-charcoal/70 hover:text-cocoa dark:text-cream/70 dark:hover:text-cream"
              aria-label="Toggle Password visibility"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {/* PIN */}
          <div className="flex items-center justify-between rounded-lg border-[1.5px] border-charcoal/80 bg-dew px-4 py-3 dark:border-cream/50 dark:bg-secondary">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-charcoal/60 dark:text-cream/60">
                pin
              </div>
              <div className="mt-0.5 font-mono text-base text-cocoa dark:text-cream">
                {showPin ? "000111" : "••••••"}
              </div>
            </div>
            <button
              onClick={() => setShowPin((s) => !s)}
              className="text-charcoal/70 hover:text-cocoa dark:text-cream/70 dark:hover:text-cream"
              aria-label="Toggle PIN visibility"
            >
              {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mt-4 grid grid-cols-2 gap-3">
        <div className="paper-card p-5">
          <div className="font-display text-4xl text-cocoa dark:text-cream">{likedCount}</div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-charcoal/60 dark:text-cream/60">
            liked reels
          </div>
        </div>
        <div className="paper-card p-5">
          <div className="font-display text-4xl text-cocoa dark:text-cream">{savedCount}</div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-charcoal/60 dark:text-cream/60">
            saved reels
          </div>
        </div>
        <div className="paper-card p-5">
          <div className="font-display text-4xl text-cocoa dark:text-cream">{watched}</div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-charcoal/60 dark:text-cream/60">
            reels watched
          </div>
        </div>
        <div className="paper-card p-5">
          <div className="flex items-center gap-2">
            <div className="font-display text-4xl text-cocoa dark:text-cream">{coins}</div>
            <Coins className="h-6 w-6 text-yellow-500" />
          </div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-charcoal/60 dark:text-cream/60">
            coins earned
          </div>
        </div>
      </section>

      {/* Theme */}
      <section className="paper-card mt-4 p-6">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-charcoal/60 dark:text-cream/60">
          appearance
        </h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {themes.map((t) => {
            const Icon = t.icon;
            const active = theme === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTheme(t.key)}
                className={`flex flex-col items-center gap-2 rounded-lg border-[1.5px] px-3 py-4 text-sm lowercase transition ${active
                  ? "border-charcoal bg-dew font-medium text-cocoa dark:border-cream dark:bg-secondary dark:text-cream"
                  : "border-charcoal/30 text-charcoal/70 hover:bg-dew dark:border-cream/30 dark:text-cream/70 dark:hover:bg-secondary"
                  }`}
              >
                <Icon className="h-5 w-5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Activity */}
      <section className="paper-card mt-4 p-6">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-charcoal/60 dark:text-cream/60">
          activity
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          <Link
            to="/history"
            className="flex items-center gap-3 rounded-lg border-[1.5px] border-charcoal/30 px-4 py-3 text-sm text-cocoa transition hover:bg-dew dark:border-cream/30 dark:text-cream dark:hover:bg-secondary"
          >
            <Eye className="h-5 w-5" />
            Watched History
          </Link>
        </div>
      </section>

      {/* Playback */}
      <section className="mt-4">
        <div className="paper-card p-6">
          <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-charcoal/60 dark:text-cream/60">
            playback
          </h2>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <div className="font-display text-lg lowercase text-cocoa dark:text-cream">
                show random reels
              </div>
              <div className="text-sm text-charcoal/70 dark:text-cream/70">
                mix all sources randomly across tabs.
              </div>
            </div>
            <button
              onClick={() => {
                const next = !randomMode;
                setRandomModeState(next);
                setRandomMode(next);
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${randomMode ? "bg-marker" : "bg-charcoal/20 dark:bg-cream/20"
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${randomMode ? "translate-x-6" : "translate-x-1"
                  }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* App */}
      {canInstall && (
        <section className="mt-4">
          <button
            onClick={() => install()}
            className="paper-card flex w-full items-center justify-between p-5 text-left transition hover:bg-dew dark:hover:bg-secondary"
          >
            <div>
              <div className="font-display text-lg lowercase text-cocoa dark:text-cream">
                install app
              </div>
              <div className="text-sm text-charcoal/70 dark:text-cream/70">
                add to home screen for a better experience.
              </div>
            </div>
            <Download className="h-5 w-5 text-cocoa dark:text-cream" />
          </button>
        </section>
      )}

      {/* Downloads */}
      <section className="mt-4">
        <Link
          to="/downloaded"
          className="paper-card flex w-full items-center justify-between p-5 text-left transition hover:bg-dew dark:hover:bg-secondary"
        >
          <div>
            <div className="font-display text-lg lowercase text-cocoa dark:text-cream">
              downloads
            </div>
            <div className="text-sm text-charcoal/70 dark:text-cream/70">
              manage offline reels and download more.
            </div>
          </div>
          <Download className="h-5 w-5 text-cocoa dark:text-cream" />
        </Link>
      </section>

      {/* Shop */}
      <section className="mt-4">
        <Link
          to="/shop"
          className="paper-card flex w-full items-center justify-between p-5 text-left transition hover:bg-dew dark:hover:bg-secondary"
        >
          <div>
            <div className="font-display text-lg lowercase text-cocoa dark:text-cream">shop</div>
            <div className="text-sm text-charcoal/70 dark:text-cream/70">
              browse the store and redeem your coins.
            </div>
          </div>
          <ShoppingBag className="h-5 w-5 text-cocoa dark:text-cream" />
        </Link>
      </section>

      {/* Bookmarks & Likes */}
      <section className="mt-4 space-y-3">
        <Link
          to="/liked"
          className="paper-card flex w-full items-center justify-between p-5 text-left transition hover:bg-dew dark:hover:bg-secondary"
        >
          <div>
            <div className="font-display text-lg lowercase text-cocoa dark:text-cream">
              liked reels
            </div>
            <div className="text-sm text-charcoal/70 dark:text-cream/70">
              view your {likedCount} liked reels.
            </div>
          </div>
          <Heart className="h-5 w-5 text-cocoa dark:text-cream" />
        </Link>

        <Link
          to="/saved"
          className="paper-card flex w-full items-center justify-between p-5 text-left transition hover:bg-dew dark:hover:bg-secondary"
        >
          <div>
            <div className="font-display text-lg lowercase text-cocoa dark:text-cream">
              saved reels
            </div>
            <div className="text-sm text-charcoal/70 dark:text-cream/70">
              view your {savedCount} saved reels.
            </div>
          </div>
          <Bookmark className="h-5 w-5 text-cocoa dark:text-cream" />
        </Link>

        <Link
          to="/favorites"
          className="paper-card flex w-full items-center justify-between p-5 text-left transition hover:bg-dew dark:hover:bg-secondary"
        >
          <div>
            <div className="font-display text-lg lowercase text-cocoa dark:text-cream">
              favorites
            </div>
            <div className="text-sm text-charcoal/70 dark:text-cream/70">
              view your {favoritesCount} favorite creators.
            </div>
          </div>
          <Users className="h-5 w-5 text-cocoa dark:text-cream" />
        </Link>
      </section>

      {/*Earnings */}
      <section className="mt-4">
        <Link
          to="/redeem"
          className="paper-card flex w-full items-center justify-between p-5 text-left transition hover:bg-dew border-magenta-haze/30 bg-magenta-haze/5 dark:hover:bg-secondary dark:border-periwinkle-sky/30 dark:bg-periwinkle-sky/5"
        >
          <div>
            <div className="font-display text-lg lowercase text-magenta-haze dark:text-periwinkle-sky">
              earnings
            </div>
            <div className="text-sm text-charcoal/70 dark:text-cream/70">
              you have {coins} coins. redeem them for rewards.
            </div>
          </div>
          <Gift className="h-6 w-6 text-magenta-haze dark:text-periwinkle-sky" />
        </Link>
      </section>

      {/* About */}
      <section className="mt-4">
        <button
          onClick={() => navigate({ to: "/about" })}
          className="paper-card flex w-full items-center justify-between p-5 text-left transition hover:bg-dew dark:hover:bg-secondary"
        >
          <div>
            <div className="font-display text-lg lowercase text-cocoa dark:text-cream">
              about us
            </div>
            <div className="text-sm text-charcoal/70 dark:text-cream/70">
              learn more about this app.
            </div>
          </div>
        </button>
      </section>

      {/* Danger */}
      <section className="mt-4 space-y-2">
        <button
          onClick={() => setShowResetConfirm(true)}
          className="paper-card flex w-full items-center justify-between p-5 text-left transition hover:bg-dew dark:hover:bg-secondary"
        >
          <div>
            <div className="font-display text-lg lowercase text-cocoa dark:text-cream">
              reset all stats
            </div>
            <div className="text-sm text-charcoal/70 dark:text-cream/70">
              clear all liked, saved, coins and watched reels.
            </div>
          </div>
          <Trash2 className="h-5 w-5 text-charcoal/60 dark:text-cream/60" />
        </button>
        <button
          onClick={() => {
            logout();
            navigate({ to: "/login" });
          }}
          className="paper-card flex w-full items-center justify-between p-5 text-left transition hover:bg-dew dark:hover:bg-secondary"
        >
          <div>
            <div className="font-display text-lg lowercase text-marker">log out</div>
            <div className="text-sm text-charcoal/70 dark:text-cream/70">
              sign out of this device.
            </div>
          </div>
          <LogOut className="h-5 w-5 text-marker" />
        </button>
      </section>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="paper-card max-w-sm w-full p-6">
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
