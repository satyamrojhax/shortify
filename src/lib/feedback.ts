import { supabase } from "./supabase";

export type FeedbackCategory = "suggestion" | "help" | "feedback" | "bug";
export type FeedbackStatus = "pending" | "in_review" | "replied" | "resolved";

export interface FeedbackMessage {
  id: string;
  ticket_id: string;
  sender_type: "user" | "admin";
  sender_id: string;
  sender_name: string;
  message: string;
  created_at: string;
}

export interface FeedbackTicket {
  id: string;
  user_id: string;
  username: string;
  user_name?: string | null;
  user_email?: string | null;
  category: FeedbackCategory;
  title: string;
  message: string;
  status: FeedbackStatus;
  admin_reaction?: string | null;
  created_at: string;
  updated_at: string;
  messages_count?: number;
  latest_message?: string;
  messages?: FeedbackMessage[];
}

export const FEEDBACK_CATEGORIES: { id: FeedbackCategory; label: string; icon: string }[] = [
  { id: "suggestion", label: "Suggestion", icon: "💡" },
  { id: "help", label: "Help & Support", icon: "❓" },
  { id: "feedback", label: "General Feedback", icon: "💬" },
  { id: "bug", label: "Report a Bug", icon: "🐞" },
];

export const ADMIN_FEEDBACK_REACTIONS = ["💡", "❤️", "⭐", "🔥", "👍", "👏"];

/**
 * USER: Create a new feedback / suggestion / help ticket
 */
export async function createFeedbackTicket(payload: {
  user_id: string;
  username: string;
  user_name?: string | null;
  user_email?: string | null;
  category: FeedbackCategory;
  title: string;
  message: string;
}): Promise<FeedbackTicket> {
  const { data: ticket, error } = await supabase
    .from("feedback_tickets")
    .insert({
      user_id: payload.user_id,
      username: payload.username.trim(),
      user_name: payload.user_name || payload.username,
      user_email: payload.user_email || null,
      category: payload.category,
      title: payload.title.trim(),
      message: payload.message.trim(),
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;

  // Insert initial message into feedback_messages
  await supabase.from("feedback_messages").insert({
    ticket_id: ticket.id,
    sender_type: "user",
    sender_id: payload.user_id,
    sender_name: payload.user_name || payload.username,
    message: payload.message.trim(),
  });

  return ticket;
}

/**
 * USER: Fetch current user's submitted feedback tickets
 */
export async function fetchUserFeedbackTickets(
  userId: string,
  username?: string | null,
): Promise<FeedbackTicket[]> {
  try {
    let query = supabase
      .from("feedback_tickets")
      .select("*")
      .order("updated_at", { ascending: false });

    if (userId) {
      query = query.eq("user_id", userId);
    } else if (username) {
      query = query.eq("username", username);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("fetchUserFeedbackTickets error:", err);
    return [];
  }
}

/**
 * Fetch messages for a specific feedback ticket
 */
export async function fetchTicketMessages(ticketId: string): Promise<FeedbackMessage[]> {
  try {
    const { data, error } = await supabase
      .from("feedback_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("fetchTicketMessages error:", err);
    return [];
  }
}

/**
 * Send a reply message in a ticket thread
 */
export async function sendTicketReply(payload: {
  ticket_id: string;
  sender_type: "user" | "admin";
  sender_id: string;
  sender_name: string;
  message: string;
}): Promise<FeedbackMessage> {
  const { data, error } = await supabase
    .from("feedback_messages")
    .insert({
      ticket_id: payload.ticket_id,
      sender_type: payload.sender_type,
      sender_id: payload.sender_id,
      sender_name: payload.sender_name,
      message: payload.message.trim(),
    })
    .select()
    .single();

  if (error) throw error;

  // Update ticket updated_at and status if admin replied
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (payload.sender_type === "admin") {
    updates.status = "replied";
  }

  await supabase
    .from("feedback_tickets")
    .update(updates)
    .eq("id", payload.ticket_id);

  return data;
}

/**
 * ADMIN: Fetch all feedback tickets with message counts
 */
export async function adminFetchAllTickets(
  filterCategory?: string,
  filterStatus?: string,
): Promise<FeedbackTicket[]> {
  try {
    let query = supabase
      .from("feedback_tickets")
      .select("*")
      .order("updated_at", { ascending: false });

    if (filterCategory && filterCategory !== "all") {
      query = query.eq("category", filterCategory);
    }
    if (filterStatus && filterStatus !== "all") {
      query = query.eq("status", filterStatus);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("adminFetchAllTickets error:", err);
    return [];
  }
}

/**
 * ADMIN: Update ticket status
 */
export async function adminUpdateTicketStatus(
  ticketId: string,
  status: FeedbackStatus,
): Promise<void> {
  const { error } = await supabase
    .from("feedback_tickets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (error) throw error;
}

/**
 * ADMIN: React to ticket (e.g. ⭐, 💡, ❤️)
 */
export async function adminReactToTicket(
  ticketId: string,
  reaction: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("feedback_tickets")
    .update({ admin_reaction: reaction, updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (error) throw error;
}

/**
 * ADMIN: Delete ticket
 */
export async function adminDeleteTicket(ticketId: string): Promise<void> {
  const { error } = await supabase
    .from("feedback_tickets")
    .delete()
    .eq("id", ticketId);

  if (error) throw error;
}

/**
 * USER: Edit own feedback ticket if submitted within the last 1 hour
 */
export async function updateUserTicket(
  ticketId: string,
  userId: string,
  payload: { title?: string; message?: string; category?: FeedbackCategory },
): Promise<FeedbackTicket> {
  const { data: existing, error: fetchErr } = await supabase
    .from("feedback_tickets")
    .select("created_at, user_id")
    .eq("id", ticketId)
    .single();

  if (fetchErr) throw fetchErr;
  if (!existing) throw new Error("Ticket not found.");
  if (existing.user_id !== userId) throw new Error("Unauthorized to edit this ticket.");

  const createdTime = new Date(existing.created_at).getTime();
  const ONE_HOUR_MS = 60 * 60 * 1000;
  if (Date.now() - createdTime > ONE_HOUR_MS) {
    throw new Error("Suggestions can only be edited within 1 hour of sending.");
  }

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (payload.title !== undefined) updates.title = payload.title.trim();
  if (payload.message !== undefined) updates.message = payload.message.trim();
  if (payload.category !== undefined) updates.category = payload.category;

  const { data, error } = await supabase
    .from("feedback_tickets")
    .update(updates)
    .eq("id", ticketId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Subscribe to realtime ticket changes
 */
export function subscribeToRealtimeTickets(onChange: () => void): () => void {
  const channelName = `realtime-tickets-${Math.random().toString(36).slice(2, 8)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "feedback_tickets" },
      () => onChange(),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "feedback_messages" },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to realtime messages for a specific ticket
 */
export function subscribeToRealtimeTicketThread(
  ticketId: string,
  onMessage: (msg: FeedbackMessage) => void,
): () => void {
  const channelName = `ticket-thread-${ticketId}-${Math.random().toString(36).slice(2, 8)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "feedback_messages",
        filter: `ticket_id=eq.${ticketId}`,
      },
      (payload: any) => {
        if (payload.new) {
          onMessage(payload.new as FeedbackMessage);
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
