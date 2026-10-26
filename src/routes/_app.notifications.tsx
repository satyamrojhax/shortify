import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BackButton } from "@/components/ui/back-button";
import { useNotifications } from "@/hooks/use-notifications";
import { NOTIFICATION_REACTIONS, NotificationItem } from "@/lib/notifications";
import {
  Bell,
  CheckCheck,
  ExternalLink,
  Sparkles,
  Info,
  Megaphone,
  AlertTriangle,
  RefreshCw,
  Clock,
  User,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    loading,
    refresh,
    markAsRead,
    markAllAsRead,
    toggleReaction,
  } = useNotifications();

  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const filtered = notifications.filter((n) => {
    if (activeTab === "unread" && n.is_read) return false;
    if (filterType !== "all" && n.type !== filterType) return false;
    return true;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "announcement":
        return <Megaphone className="h-4 w-4 text-cobalt-pop" />;
      case "update":
        return <Sparkles className="h-4 w-4 text-amber-500" />;
      case "alert":
        return <AlertTriangle className="h-4 w-4 text-rose-500" />;
      case "system":
      default:
        return <Info className="h-4 w-4 text-emerald-500" />;
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case "announcement":
        return "bg-cobalt-pop/10 text-cobalt-pop border-cobalt-pop/20";
      case "update":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "alert":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "system":
      default:
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      return formatDistanceToNow(new Date(iso), { addSuffix: true });
    } catch {
      return "recently";
    }
  };

  return (
    <div className="mx-auto max-w-3xl w-full px-3 sm:px-6 py-4 sm:py-8 overflow-x-hidden">
      <div className="mb-3">
        <BackButton />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="font-display text-marker text-sm sm:text-base lowercase italic">
            realtime updates & announcements —
          </p>
          <h1 className="mt-0.5 font-display text-2xl sm:text-4xl lowercase text-cocoa dark:text-cream">
            notifications.
          </h1>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead()}
            className="flex items-center justify-center gap-2 rounded-full border border-charcoal/20 bg-background px-3.5 py-1.5 text-xs font-medium text-cocoa transition hover:bg-slate-mist/20 dark:border-cream/20 dark:text-cream dark:hover:bg-secondary/60 shadow-xs self-start sm:self-auto"
          >
            <CheckCheck className="h-3.5 w-3.5 text-marker" />
            <span>mark all as read</span>
          </button>
        )}
      </div>

      {/* Tabs & Filters */}
      <div className="mt-5 flex flex-col gap-3 border-b border-charcoal/10 pb-3 dark:border-cream/10">
        <div className="flex items-center justify-between gap-2">
          {/* Main Tabs */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab("all")}
              className={`rounded-full px-3.5 py-1 text-xs font-medium transition ${
                activeTab === "all"
                  ? "bg-twilight-navy text-white dark:bg-cream dark:text-twilight-navy shadow-sm"
                  : "text-charcoal/60 hover:text-charcoal hover:bg-slate-mist/10 dark:text-cream/60 dark:hover:text-cream"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab("unread")}
              className={`flex items-center gap-1 rounded-full px-3.5 py-1 text-xs font-medium transition ${
                activeTab === "unread"
                  ? "bg-twilight-navy text-white dark:bg-cream dark:text-twilight-navy shadow-sm"
                  : "text-charcoal/60 hover:text-charcoal hover:bg-slate-mist/10 dark:text-cream/60 dark:hover:text-cream"
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-magenta-haze px-1 text-[9px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            title="Refresh notifications"
            className="p-1.5 rounded-full text-charcoal/50 hover:text-cocoa hover:bg-slate-mist/20 dark:text-cream/50 dark:hover:text-cream transition-colors"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing || loading ? "animate-spin text-marker" : ""}`}
            />
          </button>
        </div>

        {/* Type Filter Pills (Horizontally scrollable on mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none -mx-1 px-1">
          <span className="text-[11px] font-semibold text-charcoal/40 dark:text-cream/40 uppercase tracking-wider shrink-0 mr-1">
            Filter:
          </span>
          {["all", "announcement", "update", "system", "alert"].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`shrink-0 capitalize px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                filterType === t
                  ? "bg-charcoal/10 text-charcoal font-bold dark:bg-cream/15 dark:text-cream ring-1 ring-charcoal/20 dark:ring-cream/20"
                  : "text-charcoal/60 hover:text-charcoal hover:bg-slate-mist/10 dark:text-cream/60 dark:hover:text-cream"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications list */}
      <div className="mt-6 space-y-4">
        {loading && notifications.length === 0 ? (
          <div className="paper-card p-12 text-center text-charcoal/60 dark:text-cream/60 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-marker" />
            <span className="text-sm">checking for real-time notifications...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="paper-card p-12 text-center text-charcoal/60 dark:text-cream/60 flex flex-col items-center justify-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-mist/15 text-charcoal/40 dark:bg-secondary dark:text-cream/40">
              <Bell className="h-7 w-7" />
            </div>
            <div className="font-display text-lg lowercase text-cocoa dark:text-cream">
              {activeTab === "unread" ? "no unread notifications" : "no notifications yet"}
            </div>
            <p className="max-w-xs text-xs text-charcoal/60 dark:text-cream/60">
              {activeTab === "unread"
                ? "you are completely caught up! we'll notify you when new announcements arrive."
                : "you're all set! Announcements, system updates, and individual messages will show up here."}
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <NotificationCard
              key={item.id}
              item={item}
              getTypeIcon={getTypeIcon}
              getTypeBadgeClass={getTypeBadgeClass}
              formatTimestamp={formatTimestamp}
              onMarkRead={() => markAsRead(item.id)}
              onToggleReaction={(emoji) => toggleReaction(item.id, emoji)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function NotificationCard({
  item,
  getTypeIcon,
  getTypeBadgeClass,
  formatTimestamp,
  onMarkRead,
  onToggleReaction,
}: {
  item: NotificationItem;
  getTypeIcon: (type: string) => React.ReactNode;
  getTypeBadgeClass: (type: string) => string;
  formatTimestamp: (iso: string) => string;
  onMarkRead: () => void;
  onToggleReaction: (emoji: string) => void;
}) {
  const isPersonal = item.target_type === "user";

  return (
    <div
      onClick={() => {
        if (!item.is_read) onMarkRead();
      }}
      className={`paper-card relative p-4 sm:p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
        item.is_read
          ? "opacity-90"
          : "border-marker/40 bg-marker/[0.02] ring-1 ring-marker/20 shadow-xs"
      }`}
    >
      {/* Unread indicator dot */}
      {!item.is_read && (
        <span className="absolute top-4 right-4 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-marker opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-marker" />
        </span>
      )}

      {/* Header tags */}
      <div className="flex flex-wrap items-center gap-2 mb-2 pr-6">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${getTypeBadgeClass(
            item.type,
          )}`}
        >
          {getTypeIcon(item.type)}
          {item.type}
        </span>

        {isPersonal && (
          <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-600 dark:text-purple-300">
            <User className="h-3 w-3" />
            just for you
          </span>
        )}

        <span className="flex items-center gap-1 text-[11px] text-charcoal/50 dark:text-cream/50 ml-auto">
          <Clock className="h-3 w-3" />
          {formatTimestamp(item.created_at)}
        </span>
      </div>

      {/* Title & Body */}
      <h3 className="font-display text-base sm:text-lg font-semibold text-cocoa dark:text-cream break-words">
        {item.title}
      </h3>
      <p className="mt-1 text-xs sm:text-sm text-charcoal/80 dark:text-cream/80 whitespace-pre-wrap leading-relaxed break-words">
        {item.message}
      </p>

      {/* Link button if present */}
      {item.link_url && (
        <div className="mt-2.5">
          <a
            href={item.link_url}
            target={item.link_url.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-cobalt-pop hover:underline"
          >
            <span>Open link</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      {/* Footer: Sender & Reactions bar */}
      <div
        className="mt-3.5 pt-2.5 border-t border-charcoal/10 dark:border-cream/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[11px] text-charcoal/50 dark:text-cream/50 italic shrink-0">
          from {item.sender_name || "Admin"}
        </span>

        {/* Reaction Picker & Counts */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {NOTIFICATION_REACTIONS.map((emoji) => {
            const count = item.reactions?.[emoji] || 0;
            const userHasReacted = item.user_reactions?.includes(emoji);

            return (
              <button
                key={emoji}
                onClick={() => onToggleReaction(emoji)}
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 sm:py-1 text-xs transition-transform active:scale-90 ${
                  userHasReacted
                    ? "border-marker bg-marker/15 text-marker font-semibold shadow-xs"
                    : count > 0
                      ? "border-charcoal/20 bg-dew/40 text-charcoal dark:border-cream/20 dark:bg-secondary/40 dark:text-cream"
                      : "border-transparent hover:border-charcoal/20 hover:bg-slate-mist/20 text-charcoal/60 dark:hover:border-cream/20 dark:text-cream/60"
                }`}
                title={`React ${emoji}`}
              >
                <span>{emoji}</span>
                {count > 0 && <span className="text-[10px]">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
