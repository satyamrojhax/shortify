import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef, useMemo } from "react";
import {
  FeedbackTicket,
  FeedbackMessage,
  FeedbackCategory,
  FeedbackStatus,
  ADMIN_FEEDBACK_REACTIONS,
  FEEDBACK_CATEGORIES,
  adminFetchAllTickets,
  adminUpdateTicketStatus,
  adminReactToTicket,
  adminDeleteTicket,
  fetchTicketMessages,
  sendTicketReply,
  subscribeToRealtimeTickets,
  subscribeToRealtimeTicketThread,
} from "@/lib/feedback";
import {
  MessageSquare,
  Send,
  Trash2,
  HelpCircle,
  Lightbulb,
  Bug,
  Sparkles,
  CheckCircle2,
  Clock,
  RefreshCw,
  User,
  ShieldCheck,
  ChevronRight,
  Filter,
  ArrowLeft,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

export const Route = createFileRoute("/admin/feedback")({
  component: AdminFeedbackPage,
});

function AdminFeedbackPage() {
  const [tickets, setTickets] = useState<FeedbackTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<FeedbackTicket | null>(null);

  const loadTickets = async () => {
    try {
      const data = await adminFetchAllTickets(categoryFilter, statusFilter);
      const unique = (data || []).filter((t, idx, arr) => arr.findIndex((x) => x.id === t.id) === idx);
      setTickets(unique);
      if (selectedTicket) {
        const updated = unique.find((t) => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (err) {
      console.error("Admin loadTickets error:", err);
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
  }, [categoryFilter, statusFilter]);

  const handleStatusChange = async (ticketId: string, status: FeedbackStatus) => {
    try {
      await adminUpdateTicketStatus(ticketId, status);
      await loadTickets();
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleReact = async (ticketId: string, emoji: string) => {
    try {
      const current = selectedTicket?.admin_reaction;
      const nextReaction = current === emoji ? null : emoji;
      await adminReactToTicket(ticketId, nextReaction);
      await loadTickets();
    } catch (err: any) {
      alert("Failed to react: " + err.message);
    }
  };

  const handleDelete = async (ticket: FeedbackTicket) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete ticket "${ticket.title}" submitted by @${ticket.username || "User"}? This action cannot be undone.`
      )
    )
      return;
    try {
      await adminDeleteTicket(ticket.id);
      if (selectedTicket?.id === ticket.id) setSelectedTicket(null);
      await loadTickets();
    } catch (err: any) {
      alert("Delete failed: " + err.message);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display uppercase tracking-wide flex items-center gap-2">
            <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-marker" />
            User Help & Suggestions Centre
          </h1>
          <p className="text-xs text-foreground/60 mt-1">
            Review user feedback, suggestions, and help requests. Reply and react to tickets in real-time.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing || loading}
          className="self-start sm:self-auto flex items-center gap-1.5 rounded-full border border-foreground/15 bg-background/50 px-3.5 py-1.5 text-xs text-foreground/70 hover:text-foreground transition-all shadow-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing || loading ? "animate-spin text-marker" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-foreground/10 bg-background/50 p-3 text-xs overflow-x-hidden">
        {/* Category filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          <span className="font-semibold text-foreground/50 mr-1 flex items-center gap-1 shrink-0">
            <Filter className="h-3 w-3" />
            Category:
          </span>
          {["all", "suggestion", "help", "feedback", "bug"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-md px-2.5 py-1 capitalize transition shrink-0 ${
                categoryFilter === cat
                  ? "bg-marker text-white font-bold"
                  : "hover:bg-foreground/10 text-foreground/70"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          <span className="font-semibold text-foreground/50 mr-1 shrink-0">Status:</span>
          {["all", "pending", "in_review", "replied", "resolved"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-md px-2 py-1 capitalize transition shrink-0 ${
                statusFilter === s
                  ? "bg-foreground text-background font-bold"
                  : "hover:bg-foreground/10 text-foreground/70"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Split View on PC or Drawer on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tickets List */}
        <div className={`${selectedTicket ? "hidden lg:block lg:col-span-5" : "col-span-12"} space-y-3`}>
          {loading && tickets.length === 0 ? (
            <div className="p-10 text-center text-xs text-foreground/50">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-marker" />
              Loading tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className="rounded-xl border border-foreground/10 p-8 text-center text-xs text-foreground/50">
              No tickets matching the selected filters.
            </div>
          ) : (
            displayTickets.map((t, idx) => {
              const isSelected = selectedTicket?.id === t.id;
              return (
                <div
                  key={`admin-ticket-${t.id}-${idx}`}
                  onClick={() => setSelectedTicket(t)}
                  className={`rounded-xl border p-4 transition cursor-pointer hover:border-foreground/30 ${
                    isSelected
                      ? "border-marker bg-marker/5 shadow-xs"
                      : "border-foreground/10 bg-background/50 hover:bg-foreground/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      {getCategoryIcon(t.category)}
                      <span className="font-semibold text-xs capitalize text-foreground">
                        {t.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {t.admin_reaction && (
                        <span className="rounded-full bg-marker/10 px-1.5 py-0.5 text-xs">
                          {t.admin_reaction}
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          t.status === "pending"
                            ? "bg-amber-500/10 text-amber-500"
                            : t.status === "in_review"
                              ? "bg-blue-500/10 text-blue-500"
                              : t.status === "replied"
                                ? "bg-emerald-500/10 text-emerald-500"
                                : "bg-slate-mist/20 text-foreground/60"
                        }`}
                      >
                        {t.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-display font-semibold text-sm text-foreground truncate">
                    {t.title}
                  </h3>
                  <p className="text-xs text-foreground/70 line-clamp-2 mt-1">
                    {t.message}
                  </p>

                  <div className="mt-3 pt-2 border-t border-foreground/10 flex items-center justify-between text-[11px] text-foreground/50">
                    <span className="font-medium">@{t.username || "User"}</span>
                    <div className="flex items-center gap-2">
                      <span>{formatDistanceToNow(new Date(t.updated_at || t.created_at), { addSuffix: true })}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(t);
                        }}
                        title="Delete ticket"
                        className="text-foreground/40 hover:text-rose-500 p-1 rounded-md hover:bg-foreground/5 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Ticket Conversation Thread & Admin Actions */}
        {selectedTicket ? (
          <div className="col-span-12 lg:col-span-7">
            <AdminTicketDetail
              ticket={selectedTicket}
              onBack={() => setSelectedTicket(null)}
              onStatusChange={(status) => handleStatusChange(selectedTicket.id, status)}
              onReact={(emoji) => handleReact(selectedTicket.id, emoji)}
              onDelete={() => handleDelete(selectedTicket)}
            />
          </div>
        ) : (
          <div className="hidden lg:flex lg:col-span-7 rounded-xl border border-dashed border-foreground/20 p-12 flex-col items-center justify-center text-center text-foreground/50">
            <MessageSquare className="h-10 w-10 stroke-[1.25] mb-2 opacity-50" />
            <div className="font-display text-base font-semibold text-foreground">
              Select a suggestion or ticket to view
            </div>
            <p className="text-xs max-w-xs mt-1">
              Click any ticket on the left to read user details, reply in real-time, react with emojis, or change the status.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminTicketDetail({
  ticket,
  onBack,
  onStatusChange,
  onReact,
  onDelete,
}: {
  ticket: FeedbackTicket;
  onBack: () => void;
  onStatusChange: (status: FeedbackStatus) => void;
  onReact: (emoji: string) => void;
  onDelete: () => void;
}) {
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isDuplicateMsg = (a: FeedbackMessage, b: FeedbackMessage): boolean => {
    if (a.id && b.id && String(a.id) === String(b.id)) return true;
    if (
      a.sender_type === b.sender_type &&
      a.message.trim() === b.message.trim() &&
      Math.abs(new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) < 10000
    ) {
      return true;
    }
    return false;
  };

  const loadThread = async () => {
    try {
      const msgs = await fetchTicketMessages(ticket.id);
      const unique: FeedbackMessage[] = [];
      for (const m of msgs) {
        if (!unique.some((ex) => isDuplicateMsg(ex, m))) {
          unique.push(m);
        }
      }
      setMessages(unique);
    } catch (err) {
      console.error("loadThread error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadThread();
    const unsub = subscribeToRealtimeTicketThread(ticket.id, (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => isDuplicateMsg(m, newMsg))) return prev;
        return [...prev, newMsg];
      });
    });
    return () => unsub();
  }, [ticket.id]);

  const displayMessages = useMemo(() => {
    const unique: FeedbackMessage[] = [];
    for (const m of messages) {
      if (!unique.some((ex) => isDuplicateMsg(ex, m))) {
        unique.push(m);
      }
    }
    return unique;
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages]);

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSending(true);

    try {
      const msg = await sendTicketReply({
        ticket_id: ticket.id,
        sender_type: "admin",
        sender_id: "admin-master",
        sender_name: "Shortify Admin Support",
        message: replyText,
      });

      setMessages((prev) => {
        if (prev.some((m) => isDuplicateMsg(m, msg))) return prev;
        return [...prev, msg];
      });
      setReplyText("");
    } catch (err: any) {
      alert("Failed to send reply: " + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-foreground/10 bg-background/50 flex flex-col h-[520px] sm:h-[650px] max-h-[85vh] shadow-sm overflow-hidden">
      {/* Top Bar */}
      <div className="p-3 sm:p-4 border-b border-foreground/10 space-y-2.5 bg-background/80">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="lg:hidden flex items-center gap-1 text-xs text-foreground/70 hover:text-foreground font-semibold"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-marker uppercase tracking-wider">
              {ticket.category}
            </span>
            <span className="text-xs text-foreground/40">•</span>
            <span className="text-xs text-foreground/60 font-medium truncate max-w-[140px] sm:max-w-none">
              From @{ticket.username}
            </span>
          </div>

          <button
            onClick={onDelete}
            title="Delete ticket"
            className="text-foreground/40 hover:text-rose-500 p-1 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <h2 className="font-display text-base sm:text-lg font-bold text-foreground truncate">
          {ticket.title}
        </h2>

        {/* Status buttons & Reaction picker */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1 border-t border-foreground/5 text-xs">
          {/* Status selector */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            <span className="text-foreground/50 text-[11px] shrink-0">Status:</span>
            {(["pending", "in_review", "replied", "resolved"] as FeedbackStatus[]).map((st) => (
              <button
                key={st}
                onClick={() => onStatusChange(st)}
                className={`rounded-md px-2 py-0.5 text-[11px] capitalize transition shrink-0 ${
                  ticket.status === st
                    ? "bg-foreground text-background font-bold shadow-xs"
                    : "hover:bg-foreground/10 text-foreground/60"
                }`}
              >
                {st.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Admin Reactions Picker */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            <span className="text-foreground/50 text-[11px] shrink-0">React:</span>
            {ADMIN_FEEDBACK_REACTIONS.map((emoji) => {
              const isActive = ticket.admin_reaction === emoji;
              return (
                <button
                  key={emoji}
                  onClick={() => onReact(emoji)}
                  className={`rounded-full p-1 text-sm transition-transform active:scale-90 shrink-0 ${
                    isActive
                      ? "ring-2 ring-marker bg-marker/20 scale-110"
                      : "hover:bg-foreground/10 opacity-70 hover:opacity-100"
                  }`}
                  title={`React ${emoji}`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Conversation Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="p-8 text-center text-xs text-foreground/50">
            <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1 text-marker" />
            Loading conversation...
          </div>
        ) : (
          displayMessages.map((m, idx) => {
            const isAdmin = m.sender_type === "admin";
            return (
              <div
                key={`admin-msg-${m.id}-${idx}`}
                className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-foreground/50">
                  {isAdmin ? (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
                      <span className="font-semibold text-blue-600 dark:text-blue-400">
                        You (Admin)
                      </span>
                    </>
                  ) : (
                    <>
                      <User className="h-3 w-3" />
                      <span className="font-semibold text-foreground">
                        @{ticket.username}
                      </span>
                    </>
                  )}
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</span>
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap shadow-xs break-words ${
                    isAdmin
                      ? "bg-marker text-white rounded-tr-xs"
                      : "bg-foreground/10 border border-foreground/10 text-foreground rounded-tl-xs"
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

      {/* Reply Input Form */}
      <form
        onSubmit={handleSendAdminReply}
        className="p-3 border-t border-foreground/10 bg-background/80 flex items-center gap-2"
      >
        <input
          type="text"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder={`Reply to @${ticket.username} in real time...`}
          className="flex-1 rounded-full border border-foreground/20 bg-background px-4 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-marker focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !replyText.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-marker text-white transition hover:opacity-90 disabled:opacity-40 shrink-0"
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
  );
}
