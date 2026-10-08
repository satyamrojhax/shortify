import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  getLiked,
  getSaved,
  KEYS,
  get,
  getCoins,
  hasUnlocked,
  getAvatarStyle,
  setAvatarStyle,
  getAvatarSeed,
  setAvatarSeed,
  getStreak,
} from "@/lib/storage";
import { fetchUserProfile } from "@/lib/db";
import { useHydrated } from "@/hooks/use-hydrated";
import { DICEBEAR_STYLES } from "@/lib/avatar";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  BadgeCheck,
  Flame,
  RefreshCw,
  Sparkles,
  Eye,
  EyeOff,
  Coins,
  ArrowLeft
} from "lucide-react";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { username } = useAuth();
  const hydrated = useHydrated();
  
  const [showPin, setShowPin] = useState(false);
  const [likedCount, setLikedCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [watched, setWatched] = useState(0);
  const [coins, setCoins] = useState(0);
  const [streak, setStreak] = useState(0);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [avatarStyle, setAvatarStyleState] = useState<string>("avataaars");
  const [avatarSeed, setAvatarSeedState] = useState<string>("");

  useEffect(() => {
    if (!hydrated) return;
    setLikedCount(getLiked().length);
    setSavedCount(getSaved().length);
    setWatched(get<number>(KEYS.watched, 0));
    setCoins(getCoins());
    setStreak(getStreak().current);
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

  if (!hydrated) return null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <button 
        onClick={() => navigate({ to: "/settings" })}
        className="flex items-center gap-2 text-charcoal/60 hover:text-cocoa dark:text-cream/60 dark:hover:text-cream transition mb-6 font-display text-sm lowercase"
      >
        <ArrowLeft className="h-4 w-4" />
        back to settings
      </button>

      <p className="font-display text-marker text-xl lowercase italic">who you are —</p>
      <h1 className="mt-2 font-display text-[48px] leading-[1.05] lowercase text-cocoa md:text-[64px] dark:text-cream">
        profile.
      </h1>

      <section className="paper-card mt-8 p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="relative group">
            <UserAvatar
              username={username}
              seed={avatarSeed || username}
              style={avatarStyle}
              size="2xl"
              className="h-24 w-24 shadow-md ring-2 ring-cobalt-pop/30"
            />
            <button
              onClick={handleRandomizeAvatar}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-cobalt-pop text-white shadow-md transition-transform hover:scale-110 active:scale-95"
              title="Roll random avatar variation"
              aria-label="Randomize avatar"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          <div className="text-center sm:text-left flex-1 mt-2">
            <div className="flex items-center justify-center sm:justify-start gap-2 font-display text-3xl lowercase text-cocoa dark:text-cream">
              @{username}
              {hasUnlocked("badge_verified") && <BadgeCheck className="h-7 w-7 text-blue-500" />}
            </div>
            <div className="text-sm text-marker">a reels reader</div>
            <div className="mt-2 text-sm text-charcoal/60 dark:text-cream/60 flex items-center justify-center sm:justify-start gap-1.5">
              <span>dropped from universe</span>
              <span>•</span>
              <span className="flex items-center text-orange-500 font-bold">
                <Flame className="h-4 w-4 mr-0.5" /> {streak} day streak
              </span>
            </div>
          </div>
        </div>

        {/* DiceBear Avatar Style Selector */}
        <div className="mt-8 border-t border-charcoal/10 dark:border-cream/10 pt-6">
          <div className="flex items-center justify-between mb-4">
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

        <div className="mt-8 flex flex-col gap-3">
          {/* Email */}
          <div className="flex items-center justify-between rounded-lg border-[1.5px] border-charcoal/80 bg-dew px-4 py-3 dark:border-cream/50 dark:bg-secondary">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-charcoal/60 dark:text-cream/60">
                login username
              </div>
              <div className="mt-0.5 font-mono text-base text-cocoa dark:text-cream">
                {email ? email.split('@')[0] : "loading..."}
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
      <section className="mt-6 grid grid-cols-2 gap-3">
        <div className="paper-card p-5 flex flex-col items-center justify-center text-center">
          <div className="font-display text-4xl text-cocoa dark:text-cream">{likedCount}</div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-charcoal/60 dark:text-cream/60">
            liked reels
          </div>
        </div>
        <div className="paper-card p-5 flex flex-col items-center justify-center text-center">
          <div className="font-display text-4xl text-cocoa dark:text-cream">{savedCount}</div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-charcoal/60 dark:text-cream/60">
            saved reels
          </div>
        </div>
        <div className="paper-card p-5 flex flex-col items-center justify-center text-center">
          <div className="font-display text-4xl text-cocoa dark:text-cream">{watched}</div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-charcoal/60 dark:text-cream/60">
            reels watched
          </div>
        </div>
        <div className="paper-card p-5 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-2">
            <div className="font-display text-4xl text-cocoa dark:text-cream">{coins}</div>
            <Coins className="h-6 w-6 text-yellow-500" />
          </div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-charcoal/60 dark:text-cream/60">
            coins earned
          </div>
        </div>
      </section>
    </div>
  );
}
