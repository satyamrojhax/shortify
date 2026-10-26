import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { BackButton } from "@/components/ui/back-button";
import { useAuth } from "@/hooks/use-auth";
import {
  FeedbackCategory,
  FeedbackStatus,
  FeedbackTicket,
  FeedbackMessage,
  FEEDBACK_CATEGORIES,
  createFeedbackTicket,
  updateUserTicket,
  fetchUserFeedbackTickets,
  fetchTicketMessages,
  sendTicketReply,
  subscribeToRealtimeTickets,
  subscribeToRealtimeTicketThread,
} from "@/lib/feedback";
import {
  MessageSquarePlus,
  Send,
  Sparkles,
  HelpCircle,
  Lightbulb,
  Bug,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  User,
  ShieldCheck,
  Pencil,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_app/feedback")({
  component: UserFeedbackPage,
});

function UserFeedbackPage() {
  const { userId, username, realName } = useAuth();
  const [tickets, setTickets] = useState<FeedbackTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTicket, setActiveTicket] = useState<FeedbackTicket | null>(null);

  // New ticket modal/form state
  const [isCreating, setIsCreating] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("suggestion");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const loadTickets = async () => {
    if (!userId && !username) return;
    try {
      const data = await fetchUserFeedbackTickets(userId || "", username);
      const unique = (data || []).filter(
        (t, idx, arr) => arr.findIndex((x) => x.id === t.id) === idx,
      );
      setTickets(unique);
      // If an active ticket is open, update its state
      if (activeTicket) {
        const updated = unique.find((t) => t.id === activeTicket.id);
        if (updated) setActiveTicket(updated);
      }
    } catch (err) {
      console.error("loadTickets error:", err);
    } finally {
      setLoading(false);
    }
  };

  const displayTickets = useMemo(() => {
    const seen = new Set<string>();
    const res: FeedbackTicket[] = [];
    for (const t of tickets) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        res.push(t);
      }
    }
    return res;
  }, [tickets]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadTickets();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  useEffect(() => {
    loadTickets();
    const unsub = subscribeToRealtimeTickets(() => {
      loadTickets();
    });
    return () => unsub();
  }, [userId, username]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setFormError("Please provide both a title and details.");
      return;
    }
    setSubmitting(true);
    setFormError("");

    try {
      const newTicket = await createFeedbackTicket({
        user_id: userId || username || "user",
        username: username || "User",
        user_name: realName || username || "User",
        category,
        title,
        message,
      });

      setTitle("");
      setMessage("");
      setIsCreating(false);
      await loadTickets();
      setActiveTicket(newTicket);
    } catch (err: any) {
      setFormError(err.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: FeedbackStatus) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            <Clock className="h-3 w-3" />
            pending review
          </span>
        );
      case "in_review":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
            <Sparkles className="h-3 w-3" />
            in review
          </span>
        );
      case "replied":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <MessageSquare className="h-3 w-3" />
            admin replied
          </span>
        );
      case "resolved":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-mist/30 bg-slate-mist/10 px-2.5 py-0.5 text-xs font-medium text-charcoal/70 dark:text-cream/70">
            <CheckCircle2 className="h-3 w-3" />
            resolved
          </span>
        );
    }
  };

  const getCategoryIcon = (cat: FeedbackCategory) => {
    switch (cat) {
      case "help":
        return <HelpCircle className="h-4 w-4 text-emerald-500" />;
      case "suggestion":
        return <Lightbulb className="h-4 w-4 text-amber-500" />;
      case "bug":
        return <Bug className="h-4 w-4 text-rose-500" />;
      case "feedback":
      default:
        return <MessageSquare className="h-4 w-4 text-cobalt-pop" />;
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-4">
        {activeTicket ? (
          <button
            onClick={() => setActiveTicket(null)}
            className="flex items-center gap-1.5 text-xs font-semibold text-charcoal/70 hover:text-charcoal dark:text-cream/70 dark:hover:text-cream transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>back to suggestions list</span>
          </button>
        ) : (
          <BackButton />
        )}
      </div>

      {activeTicket ? (
        <TicketDetailView
          ticket={activeTicket}
          currentUserId={userId || username || "user"}
          currentUserName={realName || username || "User"}
          onStatusChange={loadTickets}
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-display text-marker text-lg lowercase italic">
                we listen & build together —
              </p>
              <h1 className="mt-1 font-display text-3xl sm:text-5xl lowercase text-cocoa dark:text-cream">
                help & suggestions.
              </h1>
            </div>

            <button
              onClick={() => setIsCreating(true)}
              className="self-start sm:self-auto flex items-center gap-2 rounded-full bg-marker px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:opacity-90 active:scale-95"
            >
              <MessageSquarePlus className="h-4 w-4" />
              <span>new suggestion / help</span>
            </button>
          </div>

          {/* New Ticket Form Modal/Accordion */}
          {isCreating && (
            <div className="mt-6 paper-card p-5 sm:p-6 border-marker/40 ring-2 ring-marker/20 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-charcoal/10 dark:border-cream/10">
                <div className="font-display text-lg text-cocoa dark:text-cream">
                  send a message to admin
                </div>
                <button
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-charcoal/50 hover:text-charcoal dark:text-cream/50 dark:hover:text-cream"
                >
                  cancel
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="mt-4 space-y-4">
                {formError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Category selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal/60 dark:text-cream/60 mb-2">
                    category
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {FEEDBACK_CATEGORIES.map((cat) => {
                      const active = category === cat.id;
                      return (
                        <button
                          type="button"
                          key={cat.id}
                          onClick={() => setCategory(cat.id)}
                          className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition ${
                            active
                              ? "border-marker bg-marker/10 text-marker font-bold"
                              : "border-charcoal/20 hover:bg-slate-mist/20 text-charcoal/80 dark:border-cream/20 dark:text-cream/80"
                          }`}
                        >
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal/60 dark:text-cream/60 mb-1">
                    title / summary
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Briefly describe what this is about..."
                    className="w-full rounded-lg border border-charcoal/20 bg-background px-3 py-2 text-sm text-cocoa placeholder:text-charcoal/40 focus:border-marker focus:outline-none dark:border-cream/20 dark:text-cream dark:placeholder:text-cream/40"
                    maxLength={120}
                  />
                </div>

                {/* Details */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal/60 dark:text-cream/60 mb-1">
                    details & description
                  </label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Explain your idea, issue, or question in detail. Admin will review and reply in real-time."
                    className="w-full rounded-lg border border-charcoal/20 bg-background p-3 text-sm text-cocoa placeholder:text-charcoal/40 focus:border-marker focus:outline-none dark:border-cream/20 dark:text-cream dark:placeholder:text-cream/40 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="rounded-full px-4 py-2 text-xs font-medium text-charcoal/60 hover:text-charcoal dark:text-cream/60 dark:hover:text-cream"
                  >
                    cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-full bg-marker px-5 py-2 text-xs font-bold text-white shadow-xs hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>submit suggestion</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* User's tickets list */}
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-charcoal/60 dark:text-cream/60">
                your past suggestions & help requests
              </h2>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || loading}
                title="Refresh tickets"
                className="p-1 rounded-md text-charcoal/50 hover:text-cocoa dark:text-cream/50 dark:hover:text-cream transition-colors"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isRefreshing || loading ? "animate-spin text-marker" : ""}`}
                />
              </button>
            </div>

            {loading && tickets.length === 0 ? (
              <div className="paper-card p-12 text-center text-charcoal/60 dark:text-cream/60 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="h-6 w-6 animate-spin text-marker" />
                <span className="text-sm">loading your suggestions...</span>
              </div>
            ) : tickets.length === 0 ? (
              <div className="paper-card p-12 text-center text-charcoal/60 dark:text-cream/60 flex flex-col items-center justify-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-mist/15 text-charcoal/40 dark:bg-secondary dark:text-cream/40">
                  <Lightbulb className="h-7 w-7" />
                </div>
                <div className="font-display text-lg lowercase text-cocoa dark:text-cream">
                  no suggestions yet
                </div>
                <p className="max-w-xs text-xs text-charcoal/60 dark:text-cream/60">
                  have an idea to make Shortify better or need help? Click the button above to start
                  a conversation with admin!
                </p>
              </div>
            ) : (
              displayTickets.map((t, idx) => {
                const isUnderOneHour = Date.now() - new Date(t.created_at).getTime() < 3600000;
                return (
                  <div
                    key={`ticket-${t.id}-${idx}`}
                    onClick={() => setActiveTicket(t)}
                    className="paper-card p-4 sm:p-5 flex items-center justify-between gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold capitalize text-charcoal/80 dark:text-cream/80">
                          {getCategoryIcon(t.category)}
                          {t.category}
                        </span>
                        {getStatusBadge(t.status)}
                        {isUnderOneHour && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-marker/30 bg-marker/10 px-2 py-0.5 text-[10px] font-semibold text-marker"
                            title="Can edit for under 1 hour of submission"
                          >
                            <Pencil className="h-2.5 w-2.5" />
                            <span>editable</span>
                          </span>
                        )}
                        {t.admin_reaction && (
                          <span
                            className="inline-flex items-center rounded-full bg-marker/10 px-2 py-0.5 text-xs"
                            title="Admin reacted"
                          >
                            {t.admin_reaction}
                          </span>
                        )}
                        <span className="text-[11px] text-charcoal/40 dark:text-cream/40 ml-auto">
                          {formatDistanceToNow(new Date(t.updated_at || t.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>

                      <h3 className="font-display text-base font-semibold text-cocoa dark:text-cream truncate group-hover:text-marker transition-colors break-words">
                        {t.title}
                      </h3>
                      <p className="text-xs text-charcoal/70 dark:text-cream/70 line-clamp-1 mt-0.5 break-words">
                        {t.message}
                      </p>
                    </div>

                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-dew dark:bg-secondary text-cocoa dark:text-cream group-hover:bg-marker group-hover:text-white transition-colors shrink-0">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

function isDuplicateFeedbackMsg(a: FeedbackMessage, b: FeedbackMessage): boolean {
  if (a.id && b.id && String(a.id) === String(b.id)) return true;
  if (
    a.sender_type === b.sender_type &&
    a.message.trim() === b.message.trim() &&
    Math.abs(new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) < 10000
  ) {
    return true;
  }
  return false;
}

/**
 * Detailed ticket conversation view with real-time thread messages
 */
function TicketDetailView({
  ticket,
  currentUserId,
  currentUserName,
  onStatusChange,
}: {
  ticket: FeedbackTicket;
  currentUserId: string;
  currentUserName: string;
  onStatusChange: () => void;
}) {
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Edit suggestion under 1 hour state
  const [isEditing, setIsEditing] = useState(false);
  const [editCategory, setEditCategory] = useState<FeedbackCategory>(ticket.category);
  const [editTitle, setEditTitle] = useState(ticket.title);
  const [editMessage, setEditMessage] = useState(ticket.message);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const ticketAgeMs = Date.now() - new Date(ticket.created_at).getTime();
  const isUnderOneHour = ticketAgeMs < 3600000;
  const minutesRemaining = Math.max(0, Math.ceil((3600000 - ticketAgeMs) / 60000));

  const loadMessages = async () => {
    try {
      const msgs = await fetchTicketMessages(ticket.id);
      const unique: FeedbackMessage[] = [];
      for (const m of msgs) {
        if (!unique.some((ex) => isDuplicateFeedbackMsg(ex, m))) {
          unique.push(m);
        }
      }
      setMessages(unique);
    } catch (err) {
      console.error("loadMessages error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();

    // Subscribe to realtime thread messages
    const unsub = subscribeToRealtimeTicketThread(ticket.id, (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => isDuplicateFeedbackMsg(m, newMsg))) return prev;
        return [...prev, newMsg];
      });
      onStatusChange();
    });

    return () => unsub();
  }, [ticket.id]);

  const displayMessages = useMemo(() => {
    const unique: FeedbackMessage[] = [];
    for (const m of messages) {
      if (!unique.some((ex) => isDuplicateFeedbackMsg(ex, m))) {
        unique.push(m);
      }
    }
    return unique;
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages]);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !editMessage.trim()) {
      setEditError("Please enter both a title and details.");
      return;
    }
    setSavingEdit(true);
    setEditError("");
    try {
      await updateUserTicket(ticket.id, currentUserId, {
        title: editTitle.trim(),
        message: editMessage.trim(),
        category: editCategory,
      });
      ticket.title = editTitle.trim();
      ticket.message = editMessage.trim();
      ticket.category = editCategory;
      setIsEditing(false);
      onStatusChange();
      await loadMessages();
    } catch (err: any) {
      setEditError(err.message || "Failed to update suggestion.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSending(true);

    try {
      const newMsg = await sendTicketReply({
        ticket_id: ticket.id,
        sender_type: "user",
        sender_id: currentUserId,
        sender_name: currentUserName,
        message: replyText,
      });

      setMessages((prev) => {
        if (prev.some((m) => isDuplicateFeedbackMsg(m, newMsg))) return prev;
        return [...prev, newMsg];
      });
      setReplyText("");
    } catch (err) {
      console.error("sendReply error:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Ticket header card */}
      <div className="paper-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-charcoal/10 pb-3 dark:border-cream/10">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs uppercase tracking-wider text-marker">
              {ticket.category}
            </span>
            <span className="text-xs text-charcoal/40 dark:text-cream/40">•</span>
            <span className="text-xs text-charcoal/60 dark:text-cream/60">
              ticket #{ticket.id.slice(0, 8)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isUnderOneHour && !isEditing && (
              <button
                onClick={() => {
                  setEditTitle(ticket.title);
                  setEditMessage(ticket.message);
                  setEditCategory(ticket.category);
                  setIsEditing(true);
                }}
                className="flex items-center gap-1.5 rounded-full border border-marker/40 bg-marker/10 px-2.5 py-1 text-xs font-semibold text-marker hover:bg-marker/20 transition-colors"
                title="You can edit your suggestion within 1 hour of submission"
              >
                <Pencil className="h-3 w-3" />
                <span>edit suggestion ({minutesRemaining}m left)</span>
              </button>
            )}
            {ticket.admin_reaction && (
              <span className="flex items-center gap-1 rounded-full bg-marker/10 px-2 py-0.5 text-xs text-marker font-semibold">
                <span>Admin reaction:</span>
                <span>{ticket.admin_reaction}</span>
              </span>
            )}
            <span className="rounded-full bg-slate-mist/20 px-2.5 py-0.5 text-xs capitalize text-cocoa dark:text-cream font-medium">
              status: {ticket.status.replace("_", " ")}
            </span>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSaveEdit} className="mt-4 space-y-3 pt-2">
            {editError && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-charcoal/60 dark:text-cream/60 mb-1">
                category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {FEEDBACK_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setEditCategory(cat.id)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs font-medium transition ${
                      editCategory === cat.id
                        ? "border-marker bg-marker/10 text-marker font-bold"
                        : "border-charcoal/20 hover:bg-slate-mist/20 text-charcoal/80 dark:border-cream/20 dark:text-cream/80"
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-charcoal/60 dark:text-cream/60 mb-1">
                title
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={120}
                className="w-full rounded-lg border border-charcoal/20 bg-background px-3 py-2 text-sm text-cocoa dark:text-cream focus:border-marker focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-charcoal/60 dark:text-cream/60 mb-1">
                details
              </label>
              <textarea
                rows={3}
                value={editMessage}
                onChange={(e) => setEditMessage(e.target.value)}
                className="w-full rounded-lg border border-charcoal/20 bg-background p-2.5 text-sm text-cocoa dark:text-cream focus:border-marker focus:outline-none resize-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-charcoal/60 dark:text-cream/60 hover:text-charcoal"
              >
                cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="flex items-center gap-1.5 rounded-full bg-marker px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:opacity-90 disabled:opacity-50"
              >
                {savingEdit ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>saving...</span>
                  </>
                ) : (
                  <span>save changes</span>
                )}
              </button>
            </div>
          </form>
        ) : (
          <>
            <h2 className="mt-3 font-display text-xl sm:text-2xl font-bold text-cocoa dark:text-cream break-words">
              {ticket.title}
            </h2>
            <p className="mt-1 text-xs text-charcoal/50 dark:text-cream/50">
              started {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
            </p>
          </>
        )}
      </div>

      {/* Messages Thread */}
      <div className="paper-card p-4 sm:p-6 flex flex-col min-h-[350px] max-h-[550px] overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {loading ? (
            <div className="p-8 text-center text-xs text-charcoal/50 dark:text-cream/50">
              loading conversation thread...
            </div>
          ) : (
            displayMessages.map((m: FeedbackMessage, idx: number) => {
              const isAdmin = m.sender_type === "admin";
              return (
                <div
                  key={`msg-${m.id}-${idx}`}
                  className={`flex flex-col ${isAdmin ? "items-start" : "items-end"}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-charcoal/50 dark:text-cream/50">
                    {isAdmin ? (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {m.sender_name || "Admin Support"}
                        </span>
                      </>
                    ) : (
                      <>
                        <User className="h-3 w-3" />
                        <span>You</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</span>
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap shadow-xs break-words ${
                      isAdmin
                        ? "bg-slate-mist/15 border border-charcoal/10 text-cocoa dark:bg-secondary/70 dark:border-cream/10 dark:text-cream rounded-tl-xs"
                        : "bg-twilight-navy text-white dark:bg-cream dark:text-twilight-navy rounded-tr-xs"
                    }`}
                  >
                    {m.message}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input box */}
        <form
          onSubmit={handleSendReply}
          className="mt-4 pt-3 border-t border-charcoal/10 dark:border-cream/10 flex items-center gap-2"
        >
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your response to admin..."
            className="flex-1 rounded-full border border-charcoal/20 bg-background px-4 py-2.5 text-sm text-cocoa placeholder:text-charcoal/40 focus:border-marker focus:outline-none dark:border-cream/20 dark:text-cream dark:placeholder:text-cream/40"
          />
          <button
            type="submit"
            disabled={sending || !replyText.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-marker text-white transition hover:opacity-90 disabled:opacity-40 shrink-0"
            title="Send reply"
          >
            {sending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
