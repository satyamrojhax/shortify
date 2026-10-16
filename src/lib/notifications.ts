import { supabase } from "./supabase";

export type NotificationType = "announcement" | "system" | "update" | "alert";

export interface NotificationReader {
  user_id: string;
  username: string;
  read_at: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  target_type: "all" | "user";
  target_user_id: string | null;
  target_username: string | null;
  sender_name: string;
  link_url: string | null;
  created_at: string;
  is_read?: boolean;
  read_at?: string | null;
  readers_count?: number;
  readers?: NotificationReader[];
  reactions?: Record<string, number>;
  user_reactions?: string[]; // emojis reacted by current user
}

export const NOTIFICATION_REACTIONS = ["👍", "❤️", "🔥", "🎉", "💡", "🚀"];

/**
 * Fetch notifications visible to the current user (all broadcasts + user-specific)
 */
export async function fetchUserNotifications(
  userId?: string | null,
  username?: string | null,
): Promise<NotificationItem[]> {
  try {
    let query = supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    const { data: notifs, error } = await query;
    if (error) throw error;
    if (!notifs || notifs.length === 0) return [];

    // Filter to notifications targeting 'all' or this user
    const lowerUser = username ? username.toLowerCase().trim() : "";
    const visibleNotifs = notifs.filter((n: any) => {
      if (n.target_type === "all") return true;
      if (userId && n.target_user_id && n.target_user_id === userId) return true;
      if (
        lowerUser &&
        n.target_username &&
        n.target_username.toLowerCase().trim() === lowerUser
      )
        return true;
      return false;
    });

    if (visibleNotifs.length === 0) return [];
    const notifIds = visibleNotifs.map((n: any) => n.id);

    // Fetch reads for this user
    let userReadsMap = new Map<string, string>();
    if (userId || lowerUser) {
      const { data: reads } = await supabase
        .from("notification_reads")
        .select("notification_id, read_at, user_id, username")
        .in("notification_id", notifIds);

      if (reads) {
        for (const r of reads) {
          if (
            (userId && r.user_id === userId) ||
            (lowerUser && r.username && r.username.toLowerCase().trim() === lowerUser)
          ) {
            userReadsMap.set(r.notification_id, r.read_at);
          }
        }
      }
    }

    // Fetch reactions for these notifications
    const { data: reactions } = await supabase
      .from("notification_reactions")
      .select("notification_id, reaction, user_id, username")
      .in("notification_id", notifIds);

    const reactionsMap = new Map<string, Record<string, number>>();
    const userReactionsMap = new Map<string, string[]>();

    if (reactions) {
      for (const r of reactions) {
        // Count totals
        if (!reactionsMap.has(r.notification_id)) {
          reactionsMap.set(r.notification_id, {});
        }
        const counts = reactionsMap.get(r.notification_id)!;
        counts[r.reaction] = (counts[r.reaction] || 0) + 1;

        // Current user check
        const isSelf =
          (userId && r.user_id === userId) ||
          (lowerUser && r.username && r.username.toLowerCase().trim() === lowerUser);
        if (isSelf) {
          if (!userReactionsMap.has(r.notification_id)) {
            userReactionsMap.set(r.notification_id, []);
          }
          userReactionsMap.get(r.notification_id)!.push(r.reaction);
        }
      }
    }

    return visibleNotifs.map((n: any) => ({
      ...n,
      is_read: userReadsMap.has(n.id),
      read_at: userReadsMap.get(n.id) || null,
      reactions: reactionsMap.get(n.id) || {},
      user_reactions: userReactionsMap.get(n.id) || [],
    }));
  } catch (err) {
    console.error("fetchUserNotifications error:", err);
    return [];
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string,
  username?: string | null,
): Promise<void> {
  if (!notificationId || !userId) return;
  try {
    const { error } = await supabase.from("notification_reads").upsert(
      {
        notification_id: notificationId,
        user_id: userId,
        username: username || "User",
        read_at: new Date().toISOString(),
      },
      { onConflict: "notification_id,user_id" },
    );
    if (error) console.warn("markNotificationAsRead error:", error);
  } catch (err) {
    console.error("markNotificationAsRead failed:", err);
  }
}

/**
 * Mark all visible notifications as read for current user
 */
export async function markAllNotificationsAsRead(
  notificationIds: string[],
  userId: string,
  username?: string | null,
): Promise<void> {
  if (!notificationIds.length || !userId) return;
  try {
    const rows = notificationIds.map((id) => ({
      notification_id: id,
      user_id: userId,
      username: username || "User",
      read_at: new Date().toISOString(),
    }));
    await supabase
      .from("notification_reads")
      .upsert(rows, { onConflict: "notification_id,user_id" });
  } catch (err) {
    console.error("markAllNotificationsAsRead failed:", err);
  }
}

/**
 * Toggle emoji reaction on a notification
 */
export async function toggleNotificationReaction(
  notificationId: string,
  userId: string,
  username: string,
  reaction: string,
): Promise<void> {
  if (!notificationId || !userId || !reaction) return;
  try {
    // Check if user already has this reaction
    const { data: existing } = await supabase
      .from("notification_reactions")
      .select("id")
      .eq("notification_id", notificationId)
      .eq("user_id", userId)
      .eq("reaction", reaction)
      .maybeSingle();

    if (existing) {
      // Remove reaction
      await supabase
        .from("notification_reactions")
        .delete()
        .eq("id", existing.id);
    } else {
      // Insert reaction
      await supabase.from("notification_reactions").insert({
        notification_id: notificationId,
        user_id: userId,
        username: username || "User",
        reaction,
      });
    }
  } catch (err) {
    console.error("toggleNotificationReaction error:", err);
  }
}

/**
 * ADMIN: Fetch all sent notifications with read counts, reader lists, and reaction breakdowns
 */
export async function adminFetchNotifications(): Promise<NotificationItem[]> {
  try {
    const { data: notifs, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!notifs || notifs.length === 0) return [];

    const notifIds = notifs.map((n: any) => n.id);

    // Fetch all reads
    const { data: reads } = await supabase
      .from("notification_reads")
      .select("notification_id, user_id, username, read_at")
      .in("notification_id", notifIds)
      .order("read_at", { ascending: false });

    // Fetch all reactions
    const { data: reactions } = await supabase
      .from("notification_reactions")
      .select("notification_id, reaction, user_id, username")
      .in("notification_id", notifIds);

    const readersMap = new Map<string, NotificationReader[]>();
    if (reads) {
      for (const r of reads) {
        if (!readersMap.has(r.notification_id)) {
          readersMap.set(r.notification_id, []);
        }
        readersMap.get(r.notification_id)!.push({
          user_id: r.user_id,
          username: r.username || "User",
          read_at: r.read_at,
        });
      }
    }

    const reactionsMap = new Map<string, Record<string, number>>();
    if (reactions) {
      for (const r of reactions) {
        if (!reactionsMap.has(r.notification_id)) {
          reactionsMap.set(r.notification_id, {});
        }
        const counts = reactionsMap.get(r.notification_id)!;
        counts[r.reaction] = (counts[r.reaction] || 0) + 1;
      }
    }

    return notifs.map((n: any) => {
      const notifReaders = readersMap.get(n.id) || [];
      return {
        ...n,
        readers_count: notifReaders.length,
        readers: notifReaders,
        reactions: reactionsMap.get(n.id) || {},
      };
    });
  } catch (err) {
    console.error("adminFetchNotifications error:", err);
    return [];
  }
}

/**
 * ADMIN: Send notification to all or single user
 */
export async function adminSendNotification(payload: {
  title: string;
  message: string;
  type?: NotificationType;
  target_type: "all" | "user";
  target_user_id?: string | null;
  target_username?: string | null;
  link_url?: string | null;
  sender_name?: string;
}): Promise<NotificationItem> {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      title: payload.title.trim(),
      message: payload.message.trim(),
      type: payload.type || "announcement",
      target_type: payload.target_type,
      target_user_id: payload.target_user_id || null,
      target_username: payload.target_username ? payload.target_username.trim() : null,
      link_url: payload.link_url ? payload.link_url.trim() : null,
      sender_name: payload.sender_name || "Shortify Admin",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * ADMIN: Delete a notification
 */
export async function adminDeleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from("notifications").delete().eq("id", id);
  if (error) throw error;
}

/**
 * ADMIN: Edit / Update an existing notification
 */
export async function adminUpdateNotification(
  id: string,
  payload: {
    title?: string;
    message?: string;
    type?: NotificationType;
    target_type?: "all" | "user";
    target_user_id?: string | null;
    target_username?: string | null;
    link_url?: string | null;
  },
): Promise<NotificationItem> {
  const updates: Record<string, any> = {};
  if (payload.title !== undefined) updates.title = payload.title.trim();
  if (payload.message !== undefined) updates.message = payload.message.trim();
  if (payload.type !== undefined) updates.type = payload.type;
  if (payload.target_type !== undefined) updates.target_type = payload.target_type;
  if (payload.target_user_id !== undefined) updates.target_user_id = payload.target_user_id || null;
  if (payload.target_username !== undefined)
    updates.target_username = payload.target_username ? payload.target_username.trim() : null;
  if (payload.link_url !== undefined)
    updates.link_url = payload.link_url ? payload.link_url.trim() : null;

  const { data, error } = await supabase
    .from("notifications")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Subscribe to realtime changes on notifications, reads, and reactions
 */
export function subscribeToRealtimeNotifications(onChange: () => void): () => void {
  const channelName = `realtime-notifications-${Math.random().toString(36).slice(2, 8)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications" },
      () => onChange(),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notification_reads" },
      () => onChange(),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notification_reactions" },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
