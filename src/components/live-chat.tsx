import { useState, useEffect, useRef, useCallback } from "react";
import { Radio, Send, ChevronDown, Smile } from "lucide-react";
import { ChatMessage, fetchLiveChat, extractModelId, formatChatTimeAgo } from "@/lib/live-chat";

interface LiveChatProps {
  modelId?: string | number;
  reelId?: string;
  streamUrl?: string;
  modelName?: string;
  viewersCount?: number;
}

export function LiveChat({
  modelId,
  reelId,
  streamUrl,
  modelName = "Broadcaster",
  viewersCount,
}: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newUnseenCount, setNewUnseenCount] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Extract the target model ID dynamically
  const targetModelId = extractModelId(modelId, reelId, streamUrl);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const prevCountRef = useRef(0);

  isAtBottomRef.current = isAtBottom;

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
    setNewUnseenCount(0);
    setIsAtBottom(true);
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceToBottom < 60;
    setIsAtBottom(atBottom);
    if (atBottom) {
      setNewUnseenCount(0);
    }
  }, []);

  // Poll for chat messages using modelId every 5 seconds
  useEffect(() => {
    if (!targetModelId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    prevCountRef.current = 0;

    const loadMessages = async () => {
      try {
        const fetched = await fetchLiveChat(targetModelId);
        if (!isMounted) return;

        setMessages((prev) => {
          if (!fetched || fetched.length === 0) return prev;

          const map = new Map<string | number, ChatMessage>();

          // Include all messages from the API
          for (const msg of fetched) {
            const displayBody =
              msg.details?.body?.trim() ||
              (msg.details?.amount
                ? `Tipped ${msg.details.amount} tokens`
                : msg.type === "tip"
                  ? "Sent a tip"
                  : msg.type === "lovense"
                    ? "Activated toy"
                    : "Live message");

            map.set(msg.id, {
              ...msg,
              details: {
                ...msg.details,
                body: displayBody,
              },
            });
          }

          // Preserve any local user-sent messages
          for (const msg of prev) {
            if (msg.isLocal && !map.has(msg.id)) {
              map.set(msg.id, msg);
            }
          }

          // Sort chronologically: oldest at top, newest at bottom
          const allMessages = Array.from(map.values()).sort((a, b) => {
            const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return tA - tB;
          });

          // Check if new incoming messages arrived while user was scrolled up
          if (prevCountRef.current > 0 && allMessages.length > prevCountRef.current) {
            const added = allMessages.length - prevCountRef.current;
            if (!isAtBottomRef.current) {
              setNewUnseenCount((c) => c + added);
            }
          }
          prevCountRef.current = allMessages.length;

          return allMessages;
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Initial fetch - loads all available chat history immediately
    loadMessages().then(() => {
      if (isMounted) {
        setTimeout(() => scrollToBottom(false), 100);
      }
    });

    // 5-second polling interval for continuous live updates
    const interval = setInterval(() => {
      loadMessages();
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [targetModelId, scrollToBottom]);

  // Auto-scroll when new messages arrive if user is already at the bottom
  useEffect(() => {
    if (isAtBottom && messages.length > 0) {
      scrollToBottom(true);
    }
  }, [messages.length, isAtBottom, scrollToBottom]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputValue.trim();
    if (!text) return;

    const localMsg: ChatMessage = {
      id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      modelId: targetModelId || "current",
      type: "text",
      details: {
        body: text,
      },
      userData: {
        id: "me",
        username: "You",
      },
      createdAt: new Date().toISOString(),
      isLocal: true,
    };

    setMessages((prev) => [...prev, localMsg]);
    setInputValue("");
    setShowEmojiPicker(false);
    setTimeout(() => scrollToBottom(true), 50);
  };

  const addEmoji = (emoji: string) => {
    setInputValue((prev) => prev + emoji);
  };

  return (
    <div className="flex flex-col h-full bg-background select-text">
      {/* Live Chat Top Header */}
      <div className="px-4 py-3 border-b border-charcoal/10 dark:border-cream/10 bg-dew/60 dark:bg-secondary/40 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600/15 border border-red-500/30 text-red-600 dark:text-red-400 font-bold text-[11px] uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span>Live Chat</span>
          </div>
          {messages.length > 0 && (
            <span className="text-[11px] text-charcoal/50 dark:text-cream/50 font-medium">
              ({messages.length} messages)
            </span>
          )}
        </div>

        {viewersCount !== undefined && viewersCount > 0 && (
          <div className="text-xs text-charcoal/70 dark:text-cream/70 flex items-center gap-1 font-medium">
            <Radio size={12} className="text-red-500 animate-pulse" />
            <span>{viewersCount.toLocaleString()} watching</span>
          </div>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3.5 space-y-2 custom-scrollbar relative"
      >
        {loading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-charcoal/50 dark:text-cream/50 gap-2">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Connecting to live chat...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-xs text-charcoal/50 dark:text-cream/50 py-12">
            No messages yet. Say hello to {modelName}!
          </div>
        ) : (
          messages.map((msg) => <MessageRow key={String(msg.id)} message={msg} />)
        )}
      </div>

      {/* Floating Scroll to Bottom pill */}
      {!isAtBottom && (
        <div className="relative flex justify-center -mt-9 mb-1 z-20 pointer-events-none">
          <button
            onClick={() => scrollToBottom(true)}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-lg hover:scale-105 active:scale-95 transition-all duration-150 animate-bounce cursor-pointer"
          >
            <ChevronDown size={14} />
            <span>
              {newUnseenCount > 0
                ? `${newUnseenCount} new message${newUnseenCount > 1 ? "s" : ""}`
                : "Scroll to latest"}
            </span>
          </button>
        </div>
      )}

      {/* Quick Emojis Drawer */}
      {showEmojiPicker && (
        <div className="px-3 py-2 bg-dew dark:bg-secondary/70 border-t border-charcoal/10 dark:border-cream/10 flex items-center justify-between text-base animate-fade-in">
          {["❤️", "🔥", "💋", "👑", "👏", "⭐", "😍", "👍"].map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => addEmoji(emoji)}
              className="hover:scale-125 active:scale-95 transition p-1 cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input Box (Bottom) */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 border-t border-charcoal/10 dark:border-cream/10 bg-dew/80 dark:bg-secondary/50 backdrop-blur-md shrink-0 flex items-center gap-2"
      >
        <button
          type="button"
          onClick={() => setShowEmojiPicker((v) => !v)}
          className={`p-2 rounded-xl transition ${
            showEmojiPicker
              ? "bg-primary text-primary-foreground"
              : "text-charcoal/60 hover:text-charcoal dark:text-cream/60 dark:hover:text-cream hover:bg-black/5 dark:hover:bg-white/5"
          }`}
          aria-label="Insert emoji"
        >
          <Smile size={18} />
        </button>

        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={`Chat with ${modelName}...`}
          maxLength={200}
          className="flex-1 bg-background border border-charcoal/15 dark:border-cream/15 rounded-xl px-3.5 py-2 text-xs text-charcoal dark:text-cream placeholder:text-charcoal/40 dark:placeholder:text-cream/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
        />

        <button
          type="submit"
          disabled={!inputValue.trim()}
          className="p-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-40 disabled:pointer-events-none hover:opacity-90 active:scale-95 transition cursor-pointer shadow-sm"
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

function MessageRow({ message }: { message: ChatMessage }) {
  const username = message.userData?.username || "Guest";
  const body = message.details?.body || "";
  const timeAgo = formatChatTimeAgo(message.createdAt);

  return (
    <div
      className={`text-xs flex flex-col gap-0.5 p-2 rounded-xl transition-colors ${
        message.isLocal
          ? "bg-primary/10 border border-primary/20"
          : "hover:bg-black/5 dark:hover:bg-white/5"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-xs text-charcoal dark:text-cream truncate">{username}</span>
        {timeAgo && (
          <span className="text-[11px] text-charcoal/40 dark:text-cream/40 shrink-0 font-normal">
            {timeAgo}
          </span>
        )}
      </div>

      <div className="text-charcoal/85 dark:text-cream/85 text-xs break-words whitespace-pre-wrap leading-relaxed mt-0.5">
        {body}
      </div>
    </div>
  );
}
