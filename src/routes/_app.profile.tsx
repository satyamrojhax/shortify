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
import { fetchUserProfile, updateUserProfileDetails } from "@/lib/db";
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
  ArrowLeft,
  Pencil,
  Check,
  X,
  User,
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

  const [displayName, setDisplayName] = useState(
    typeof localStorage !== "undefined" ? localStorage.getItem("ig.real_name") || "" : "",
  );
  const [bio, setBio] = useState(
    typeof localStorage !== "undefined"
      ? localStorage.getItem("ig.bio") || "a reels reader"
      : "a reels reader",
  );

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [isRollingAvatar, setIsRollingAvatar] = useState(false);
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);

  const [avatarStyle, setAvatarStyleState] = useState<string>("avataaars");
  const [avatarSeed, setAvatarSeedState] = useState<string>("");

  const loadStats = () => {
    setLikedCount(getLiked().length);
    setSavedCount(getSaved().length);
    setWatched(get<number>(KEYS.watched, 0));
    setCoins(getCoins());
    setStreak(getStreak().current);
    setAvatarStyleState(getAvatarStyle());
    setAvatarSeedState(getAvatarSeed(username || ""));
  };

  useEffect(() => {
    if (!hydrated) return;

    loadStats();

    const uid = typeof localStorage !== "undefined" ? localStorage.getItem("ig.user_id") : null;
    if (uid) {
      fetchUserProfile(uid)
        .then((data) => {
          setEmail(data.email || "");
          setPassword(data.password || "");
          if (data.name) {
            setDisplayName(data.name);
            localStorage.setItem("ig.real_name", data.name);
          }
          if (data.profile_details?.bio) {
            setBio(data.profile_details.bio);
            localStorage.setItem("ig.bio", data.profile_details.bio);
          }
          if (data.profile_details?.avatar_style) {
            setAvatarStyleState(data.profile_details.avatar_style);
            setAvatarStyle(data.profile_details.avatar_style);
          }
          if (data.profile_details?.avatar_seed) {
            setAvatarSeedState(data.profile_details.avatar_seed);
            setAvatarSeed(data.profile_details.avatar_seed);
          }
        })
        .catch(console.error);
    }

    window.addEventListener("storage-sync", loadStats);
    window.addEventListener("storage-update", loadStats);

    return () => {
      window.removeEventListener("storage-sync", loadStats);
      window.removeEventListener("storage-update", loadStats);
    };
  }, [hydrated, username]);

  const handleStyleChange = (newStyle: string) => {
    setAvatarStyleState(newStyle);
    setAvatarStyle(newStyle);
    const uid = typeof localStorage !== "undefined" ? localStorage.getItem("ig.user_id") : null;
    if (uid) {
      updateUserProfileDetails(uid, { avatar_style: newStyle }).catch(console.error);
    }
  };

  const handleRandomizeAvatar = () => {
    setIsRollingAvatar(true);
    const randomSeed = `${username || "user"}_${crypto.randomUUID().substring(0, 5)}`;
    setAvatarSeedState(randomSeed);
    setAvatarSeed(randomSeed);
    const uid = typeof localStorage !== "undefined" ? localStorage.getItem("ig.user_id") : null;
    if (uid) {
      updateUserProfileDetails(uid, { avatar_seed: randomSeed }).catch(console.error);
    }
    setTimeout(() => setIsRollingAvatar(false), 500);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const uid = typeof localStorage !== "undefined" ? localStorage.getItem("ig.user_id") : null;
      if (uid) {
        await updateUserProfileDetails(uid, {
          name: editName,
          bio: editBio,
          avatar_style: avatarStyle,
          avatar_seed: avatarSeed,
        });
      }
      setDisplayName(editName);
      setBio(editBio || "a reels reader");
      localStorage.setItem("ig.real_name", editName);
      localStorage.setItem("ig.bio", editBio || "a reels reader");
      window.dispatchEvent(new Event("storage-update"));
      setIsEditingProfile(false);
    } catch (err: any) {
      alert("Failed to update profile: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleRefreshStats = async () => {
    setIsRefreshingStats(true);
    loadStats();
    const uid = typeof localStorage !== "undefined" ? localStorage.getItem("ig.user_id") : null;
    if (uid) {
      try {
        const data = await fetchUserProfile(uid);
        if (data.name) setDisplayName(data.name);
        if (data.profile_details?.bio) setBio(data.profile_details.bio);
      } catch (err) {}
    }
    setTimeout(() => setIsRefreshingStats(false), 600);
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

      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-marker text-xl lowercase italic">who you are —</p>
          <h1 className="mt-2 font-display text-[48px] leading-[1.05] lowercase text-cocoa md:text-[64px] dark:text-cream">
            profile.
          </h1>
        </div>
        <button
          onClick={handleRefreshStats}
          disabled={isRefreshingStats}
          title="Refresh profile stats"
          className="flex items-center gap-2 rounded-full border border-charcoal/20 bg-background/50 px-3.5 py-1.5 text-xs font-semibold text-charcoal/70 dark:text-cream/70 hover:text-cocoa dark:hover:text-cream transition shadow-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingStats ? "animate-spin text-marker" : ""}`} />
          <span>refresh</span>
        </button>
      </div>

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
              <RefreshCw className={`h-4 w-4 ${isRollingAvatar ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="text-center sm:text-left flex-1 mt-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              {displayName && (
                <span className="font-display text-2xl sm:text-3xl font-bold text-cocoa dark:text-cream break-words">
                  {displayName}
                </span>
              )}
              <div className="flex items-center gap-1 font-display text-xl sm:text-2xl lowercase text-cocoa/80 dark:text-cream/80">
                @{username}
                {hasUnlocked("badge_verified") && <BadgeCheck className="h-6 w-6 text-blue-500" />}
              </div>
            </div>
            <div className="text-sm text-marker font-medium mt-1 break-words">
              {bio}
            </div>
            <div className="mt-2 text-sm text-charcoal/60 dark:text-cream/60 flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
              <span>dropped from universe</span>
              <span>•</span>
              <span
                onClick={() => window.dispatchEvent(new Event("open-streak-modal"))}
                className="flex items-center text-orange-500 font-bold cursor-pointer hover:opacity-80 transition"
                title="View streak details"
              >
                <Flame className="h-4 w-4 mr-0.5" /> {streak} day streak
              </span>
            </div>

            <div className="mt-3 flex justify-center sm:justify-start">
              <button
                onClick={() => {
                  setEditName(displayName || "");
                  setEditBio(bio);
                  setIsEditingProfile(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-marker/40 bg-marker/10 px-4 py-1.5 text-xs font-semibold text-marker hover:bg-marker/20 transition-all shadow-xs"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>edit profile</span>
              </button>
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
                {email ? email.split("@")[0] : "loading..."}
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

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md paper-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-charcoal/10 pb-3 dark:border-cream/10">
              <div className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-marker" />
                <h3 className="font-display text-xl lowercase text-cocoa dark:text-cream">
                  edit profile
                </h3>
              </div>
              <button
                onClick={() => setIsEditingProfile(false)}
                className="rounded-full p-1 text-charcoal/50 hover:bg-charcoal/10 hover:text-charcoal dark:text-cream/50 dark:hover:bg-cream/10 dark:hover:text-cream"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Display Name */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-charcoal/60 dark:text-cream/60 mb-1">
                  display name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Satyam Rojha"
                  className="w-full rounded-lg border border-charcoal/20 bg-background px-3 py-2 text-sm text-cocoa placeholder:text-charcoal/40 focus:border-marker focus:outline-none dark:border-cream/20 dark:text-cream dark:placeholder:text-cream/40"
                  maxLength={50}
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-charcoal/60 dark:text-cream/60 mb-1">
                  bio / about
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell others what you like, your passions, or a fun tagline..."
                  className="w-full rounded-lg border border-charcoal/20 bg-background p-3 text-sm text-cocoa placeholder:text-charcoal/40 focus:border-marker focus:outline-none dark:border-cream/20 dark:text-cream dark:placeholder:text-cream/40 resize-none"
                  maxLength={160}
                />
              </div>

              {/* Avatar Seed */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-charcoal/60 dark:text-cream/60">
                    avatar seed
                  </label>
                  <button
                    type="button"
                    onClick={handleRandomizeAvatar}
                    className="flex items-center gap-1 text-[11px] font-semibold text-cobalt-pop hover:underline"
                  >
                    <RefreshCw className={`h-3 w-3 ${isRollingAvatar ? "animate-spin" : ""}`} />
                    <span>randomize</span>
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <UserAvatar
                    username={username}
                    seed={avatarSeed || username}
                    style={avatarStyle}
                    size="lg"
                    className="h-12 w-12 shrink-0 shadow-xs ring-1 ring-marker/30"
                  />
                  <input
                    type="text"
                    value={avatarSeed}
                    onChange={(e) => {
                      setAvatarSeedState(e.target.value);
                      setAvatarSeed(e.target.value);
                    }}
                    placeholder="Enter seed word or name..."
                    className="flex-1 rounded-lg border border-charcoal/20 bg-background px-3 py-2 text-sm text-cocoa dark:border-cream/20 dark:text-cream focus:border-marker focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-charcoal/10 dark:border-cream/10">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="rounded-full px-4 py-2 text-xs font-semibold text-charcoal/70 hover:text-charcoal dark:text-cream/70 dark:hover:text-cream"
                >
                  cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex items-center gap-2 rounded-full bg-marker px-5 py-2 text-xs font-bold text-white shadow-xs hover:opacity-90 disabled:opacity-50"
                >
                  {savingProfile ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>saving...</span>
                    </>
                  ) : (
                    <span>save profile</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
