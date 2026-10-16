import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  NotificationItem,
  fetchUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  toggleNotificationReaction,
  subscribeToRealtimeNotifications,
} from "@/lib/notifications";

export function useNotifications() {
  const { userId, username } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!username) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    try {
      const items = await fetchUserNotifications(userId, username);
      setNotifications(items);
    } catch (err) {
      console.error("useNotifications load error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, username]);

  useEffect(() => {
    loadNotifications();

    // Subscribe to realtime updates for instant notification sync
    const unsubscribe = subscribeToRealtimeNotifications(() => {
      loadNotifications();
    });

    return () => {
      unsubscribe();
    };
  }, [loadNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async (notificationId: string) => {
    if (!userId && !username) return;
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)),
    );
    await markNotificationAsRead(notificationId, userId || username || "user", username);
  };

  const handleMarkAllAsRead = async () => {
    if (!userId && !username) return;
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (!unreadIds.length) return;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markAllNotificationsAsRead(unreadIds, userId || username || "user", username);
  };

  const handleToggleReaction = async (notificationId: string, emoji: string) => {
    if (!userId && !username) return;
    const targetUserId = userId || username || "user";
    const targetUsername = username || "User";

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id !== notificationId) return n;
        const currentReactions = { ...(n.reactions || {}) };
        const userReactions = [...(n.user_reactions || [])];
        const alreadyHas = userReactions.includes(emoji);

        if (alreadyHas) {
          userReactions.splice(userReactions.indexOf(emoji), 1);
          currentReactions[emoji] = Math.max(0, (currentReactions[emoji] || 1) - 1);
          if (currentReactions[emoji] === 0) delete currentReactions[emoji];
        } else {
          userReactions.push(emoji);
          currentReactions[emoji] = (currentReactions[emoji] || 0) + 1;
        }

        return {
          ...n,
          reactions: currentReactions,
          user_reactions: userReactions,
        };
      }),
    );

    await toggleNotificationReaction(notificationId, targetUserId, targetUsername, emoji);
  };

  return {
    notifications,
    unreadCount,
    loading,
    refresh: loadNotifications,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    toggleReaction: handleToggleReaction,
  };
}
