import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  NotificationItem,
  NotificationType,
  adminFetchNotifications,
  adminSendNotification,
  adminUpdateNotification,
  adminDeleteNotification,
  subscribeToRealtimeNotifications,
} from "@/lib/notifications";
import {
  Bell,
  Send,
  Trash2,
  Pencil,
  Users,
  User,
  Eye,
  Clock,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  Search,
  X,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

export function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [usersList, setUsersList] = useState<{ id: string; name: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<NotificationType>("announcement");
  const [targetType, setTargetType] = useState<"all" | "user">("all");
  const [targetUsername, setTargetUsername] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Selected notification for Readers modal
  const [selectedReadersNotif, setSelectedReadersNotif] = useState<NotificationItem | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Editing state
  const [editingNotif, setEditingNotif] = useState<NotificationItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editType, setEditType] = useState<NotificationType>("announcement");
  const [editTargetType, setEditTargetType] = useState<"all" | "user">("all");
  const [editTargetUsername, setEditTargetUsername] = useState("");
  const [editLinkUrl, setEditLinkUrl] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [notifs, { data: users }] = await Promise.all([
        adminFetchNotifications(),
        supabase.from("users").select("id, name, email").order("name"),
      ]);
      setNotifications(notifs);
      if (users) setUsersList(users);

      // If reader modal is open, refresh its data
      if (selectedReadersNotif) {
        const updated = notifs.find((n) => n.id === selectedReadersNotif.id);
        if (updated) setSelectedReadersNotif(updated);
      }
    } catch (err) {
      console.error("Admin loadData error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToRealtimeNotifications(() => {
      loadData();
    });
    return () => unsub();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setFeedbackMsg({ text: "Please enter both a title and a message.", type: "error" });
      return;
    }
    if (targetType === "user" && !targetUsername.trim()) {
      setFeedbackMsg({ text: "Please select or enter a target username.", type: "error" });
      return;
    }

    setSending(true);
    setFeedbackMsg(null);

    try {
      const selectedUserObj = usersList.find(
        (u) => u.name?.toLowerCase() === targetUsername.trim().toLowerCase(),
      );

      await adminSendNotification({
        title,
        message,
        type,
        target_type: targetType,
        target_user_id: selectedUserObj?.id || null,
        target_username: targetUsername.trim() || null,
        link_url: linkUrl.trim() || null,
        sender_name: "Shortify Admin",
      });

      setTitle("");
      setMessage("");
      setLinkUrl("");
      setTargetUsername("");
      setFeedbackMsg({ text: "Realtime notification sent successfully!", type: "success" });
      await loadData();
    } catch (err: any) {
      setFeedbackMsg({ text: err.message || "Failed to send notification.", type: "error" });
    } finally {
      setSending(false);
    }
  };

  const handleStartEdit = (n: NotificationItem) => {
    setEditingNotif(n);
    setEditTitle(n.title);
    setEditMessage(n.message);
    setEditType(n.type);
    setEditTargetType(n.target_type);
    setEditTargetUsername(n.target_username || "");
    setEditLinkUrl(n.link_url || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNotif) return;
    if (!editTitle.trim() || !editMessage.trim()) {
      alert("Please provide both a title and a message.");
      return;
    }
    setSavingEdit(true);
    try {
      const selectedUserObj = usersList.find(
        (u) => u.name?.toLowerCase() === editTargetUsername.trim().toLowerCase(),
      );

      await adminUpdateNotification(editingNotif.id, {
        title: editTitle,
        message: editMessage,
        type: editType,
        target_type: editTargetType,
        target_user_id: selectedUserObj?.id || null,
        target_username: editTargetUsername.trim() || null,
        link_url: editLinkUrl.trim() || null,
      });

      setEditingNotif(null);
      setFeedbackMsg({ text: "Notification updated successfully!", type: "success" });
      await loadData();
    } catch (err: any) {
      alert("Failed to update notification: " + err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (n: NotificationItem) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete notification "${n.title}"? This cannot be undone.`,
      )
    )
      return;
    try {
      await adminDeleteNotification(n.id);
      setNotifications((prev) => prev.filter((item) => item.id !== n.id));
      if (selectedReadersNotif?.id === n.id) setSelectedReadersNotif(null);
      if (editingNotif?.id === n.id) setEditingNotif(null);
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    }
  };

  const filteredUsers = usersList.filter(
    (u) =>
      u.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-display font-bold uppercase tracking-wide flex items-center gap-2">
          <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-marker" />
          Realtime Notification Centre
        </h1>
        <p className="text-xs text-foreground/60 mt-1">
          Broadcast instant real-time notifications to all users or target specific individuals. Monitor reads and reactions live.
        </p>
      </div>

      {/* Compose Notification Form */}
      <div className="rounded-xl border border-foreground/10 bg-background/50 p-4 sm:p-6 shadow-sm">
        <h2 className="text-sm sm:text-base font-semibold font-display flex items-center gap-2 mb-3 sm:mb-4">
          <Send className="h-4 w-4 text-marker" />
          Send New Notification
        </h2>

        {feedbackMsg && (
          <div
            className={`mb-4 flex items-center gap-2 rounded-lg p-3 text-xs ${
              feedbackMsg.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
            }`}
          >
            {feedbackMsg.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSend} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Target Audience Toggle */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-foreground/60 mb-1.5">
                Recipient Target
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTargetType("all")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 px-2.5 text-xs font-medium transition ${
                    targetType === "all"
                      ? "border-marker bg-marker/15 text-marker font-bold"
                      : "border-foreground/15 hover:bg-foreground/5 text-foreground/70"
                  }`}
                >
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">All (Broadcast)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType("user")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 px-2.5 text-xs font-medium transition ${
                    targetType === "user"
                      ? "border-marker bg-marker/15 text-marker font-bold"
                      : "border-foreground/15 hover:bg-foreground/5 text-foreground/70"
                  }`}
                >
                  <User className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Single User</span>
                </button>
              </div>
            </div>

            {/* Notification Type */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-foreground/60 mb-1.5">
                Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(["announcement", "update", "system", "alert"] as NotificationType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`rounded-lg border py-1.5 sm:py-2 text-xs font-medium capitalize transition ${
                      type === t
                        ? "border-marker bg-marker/15 text-marker font-bold"
                        : "border-foreground/15 hover:bg-foreground/5 text-foreground/70"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* If Single User is selected, show user selector */}
          {targetType === "user" && (
            <div className="rounded-lg border border-marker/30 bg-marker/5 p-4 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-marker">
                Target User
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={targetUsername}
                  onChange={(e) => setTargetUsername(e.target.value)}
                  placeholder="Enter or select username..."
                  className="flex-1 rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground focus:border-marker focus:outline-none"
                />
              </div>

              {/* Quick user selection pills */}
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-foreground/40" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Filter registered users list..."
                  className="rounded-md border border-foreground/10 bg-background px-2 py-1 text-xs text-foreground/80 focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pt-1">
                {filteredUsers.slice(0, 20).map((u) => (
                  <button
                    type="button"
                    key={u.id}
                    onClick={() => setTargetUsername(u.name)}
                    className={`rounded-md border px-2 py-1 text-xs transition ${
                      targetUsername.toLowerCase() === u.name.toLowerCase()
                        ? "border-marker bg-marker text-white"
                        : "border-foreground/10 bg-background hover:bg-foreground/5 text-foreground/70"
                    }`}
                  >
                    @{u.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground/60 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. New Features are Live!"
              className="w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-marker focus:outline-none"
              maxLength={120}
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground/60 mb-1">
              Message Content
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write the message that users will receive in real time..."
              className="w-full rounded-lg border border-foreground/20 bg-background p-3 text-sm text-foreground placeholder:text-foreground/40 focus:border-marker focus:outline-none resize-none"
            />
          </div>

          {/* Link URL (Optional) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground/60 mb-1">
              Action / Link URL <span className="lowercase font-normal opacity-60">(optional)</span>
            </label>
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="e.g. /reels or https://..."
              className="w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-marker focus:outline-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={sending}
              className="flex items-center gap-2 rounded-full bg-marker px-6 py-2.5 text-xs font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
            >
              {sending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Sending to Supabase Realtime...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Send Realtime Notification</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Sent Notifications List & Realtime Analytics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold font-display flex items-center gap-2">
            <Bell className="h-4 w-4 text-marker" />
            Sent Notifications & Live Analytics ({notifications.length})
          </h2>
          <button
            onClick={handleRefresh}
            title="Refresh"
            disabled={isRefreshing || loading}
            className="p-1.5 rounded-lg border border-foreground/10 hover:bg-foreground/5 text-foreground/60 hover:text-foreground transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing || loading ? "animate-spin text-marker" : ""}`} />
          </button>
        </div>

        {loading && notifications.length === 0 ? (
          <div className="p-10 text-center text-xs text-foreground/50">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-marker" />
            Loading notifications and audience analytics...
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-xl border border-foreground/10 p-8 text-center text-xs text-foreground/50">
            No notifications sent yet. Use the form above to broadcast one!
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="rounded-xl border border-foreground/10 bg-background/50 p-5 space-y-3 transition hover:border-foreground/20 break-words"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-foreground/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-marker/10 px-2.5 py-0.5 text-xs font-medium text-marker capitalize">
                      {n.type}
                    </span>
                    {n.target_type === "all" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                        <Users className="h-3 w-3" />
                        All Users
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
                        <User className="h-3 w-3" />
                        @{n.target_username || "User"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[11px] text-foreground/50 mr-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                    <button
                      onClick={() => handleStartEdit(n)}
                      className="text-foreground/40 hover:text-marker p-1.5 rounded-md hover:bg-foreground/5 transition-colors"
                      title="Edit notification"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(n)}
                      className="text-foreground/40 hover:text-rose-500 p-1.5 rounded-md hover:bg-foreground/5 transition-colors"
                      title="Delete notification"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-display text-base font-bold text-foreground break-words">
                    {n.title}
                  </h3>
                  <p className="text-xs text-foreground/80 mt-1 whitespace-pre-wrap leading-relaxed break-words">
                    {n.message}
                  </p>
                  {n.link_url && (
                    <a
                      href={n.link_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-cobalt-pop hover:underline mt-1 break-all"
                    >
                      <span>{n.link_url}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  )}
                </div>

                {/* Live Seen & Reactions Analytics Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-3 border-t border-foreground/10 text-xs">
                  {/* Seen / Reads info */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedReadersNotif(n)}
                      className="flex items-center gap-1.5 rounded-md border border-foreground/15 bg-foreground/5 px-2.5 py-1.5 hover:bg-foreground/10 transition-colors w-full sm:w-auto justify-center"
                    >
                      <Eye className="h-3.5 w-3.5 text-marker" />
                      <span className="font-semibold">{n.readers_count || 0}</span>
                      <span className="text-foreground/60">
                        {(n.readers_count || 0) === 1 ? "user has seen" : "users have seen"}
                      </span>
                    </button>
                  </div>

                  {/* Reactions metrics */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-foreground/50 text-[11px] shrink-0">Reactions:</span>
                    {n.reactions && Object.keys(n.reactions).length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1">
                        {Object.entries(n.reactions).map(([emoji, count]) => (
                          <span
                            key={emoji}
                            className="inline-flex items-center gap-1 rounded-full border border-foreground/15 bg-background px-2 py-0.5 text-xs font-semibold"
                          >
                            <span>{emoji}</span>
                            <span className="text-[10px] text-foreground/80">{count}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-foreground/40 text-[11px] italic">no reactions yet</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Who Has Seen Notification */}
      {selectedReadersNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-foreground/20 bg-background p-4 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-foreground/10 pb-3">
              <div>
                <h3 className="font-display font-bold text-base text-foreground">
                  Audience Who Viewed
                </h3>
                <p className="text-xs text-foreground/60 truncate max-w-[260px]">
                  "{selectedReadersNotif.title}"
                </p>
              </div>
              <button
                onClick={() => setSelectedReadersNotif(null)}
                className="rounded-full p-1 text-foreground/50 hover:bg-foreground/10 hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2">
              {!selectedReadersNotif.readers || selectedReadersNotif.readers.length === 0 ? (
                <div className="p-6 text-center text-xs text-foreground/50">
                  No users have read this notification yet. Real-time updates will show readers here immediately upon view.
                </div>
              ) : (
                selectedReadersNotif.readers.map((reader, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-foreground/10 p-2.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-marker/10 text-marker font-bold">
                        {reader.username ? reader.username[0]?.toUpperCase() : "U"}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">
                          @{reader.username || "User"}
                        </div>
                        <div className="text-[10px] text-foreground/50 font-mono">
                          ID: {reader.user_id.slice(0, 12)}...
                        </div>
                      </div>
                    </div>
                    <div className="text-[10px] text-foreground/50">
                      {format(new Date(reader.read_at), "MMM d, h:mm a")}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-foreground/10 flex justify-end">
              <button
                onClick={() => setSelectedReadersNotif(null)}
                className="rounded-full bg-foreground/10 px-4 py-1.5 text-xs font-semibold text-foreground hover:bg-foreground/20"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Notification */}
      {editingNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-foreground/20 bg-background p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-foreground/10 pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-marker" />
                <h3 className="font-display font-bold text-base text-foreground">
                  Edit Notification
                </h3>
              </div>
              <button
                onClick={() => setEditingNotif(null)}
                className="rounded-full p-1 text-foreground/50 hover:bg-foreground/10 hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Target Type */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-foreground/60 mb-1.5">
                  Recipient Target
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditTargetType("all")}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 px-2.5 text-xs font-medium transition ${
                      editTargetType === "all"
                        ? "border-marker bg-marker/15 text-marker font-bold"
                        : "border-foreground/15 hover:bg-foreground/5 text-foreground/70"
                    }`}
                  >
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    <span>All Users</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTargetType("user")}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 px-2.5 text-xs font-medium transition ${
                      editTargetType === "user"
                        ? "border-marker bg-marker/15 text-marker font-bold"
                        : "border-foreground/15 hover:bg-foreground/5 text-foreground/70"
                    }`}
                  >
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span>Single User</span>
                  </button>
                </div>
              </div>

              {editTargetType === "user" && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-foreground/60 mb-1">
                    Target Username
                  </label>
                  <input
                    type="text"
                    value={editTargetUsername}
                    onChange={(e) => setEditTargetUsername(e.target.value)}
                    placeholder="Enter target username..."
                    className="w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground focus:border-marker focus:outline-none"
                  />
                </div>
              )}

              {/* Notification Type */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-foreground/60 mb-1.5">
                  Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(["announcement", "update", "system", "alert"] as NotificationType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditType(t)}
                      className={`rounded-lg border py-1.5 text-xs font-medium capitalize transition ${
                        editType === t
                          ? "border-marker bg-marker/15 text-marker font-bold"
                          : "border-foreground/15 hover:bg-foreground/5 text-foreground/70"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-foreground/60 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Notification title..."
                  className="w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground focus:border-marker focus:outline-none"
                  maxLength={120}
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-foreground/60 mb-1">
                  Message Content
                </label>
                <textarea
                  rows={3}
                  value={editMessage}
                  onChange={(e) => setEditMessage(e.target.value)}
                  placeholder="Notification message..."
                  className="w-full rounded-lg border border-foreground/20 bg-background p-3 text-sm text-foreground focus:border-marker focus:outline-none resize-none"
                />
              </div>

              {/* Action / Link URL */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-foreground/60 mb-1">
                  Action Link <span className="opacity-60 lowercase font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={editLinkUrl}
                  onChange={(e) => setEditLinkUrl(e.target.value)}
                  placeholder="e.g. /reels or https://..."
                  className="w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground focus:border-marker focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-foreground/10">
                <button
                  type="button"
                  onClick={() => setEditingNotif(null)}
                  className="rounded-full border border-foreground/15 px-4 py-2 text-xs font-semibold text-foreground/70 hover:bg-foreground/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex items-center gap-2 rounded-full bg-marker px-5 py-2 text-xs font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-50 transition"
                >
                  {savingEdit ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
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
