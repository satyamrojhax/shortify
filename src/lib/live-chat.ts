export interface ChatUserRanking {
  league?: "royal" | "diamond" | "gold" | "silver" | "bronze" | string;
  level?: number;
  isEx?: boolean;
}

export interface ChatUserData {
  id: number | string;
  username: string;
  isAdmin?: boolean;
  isSupport?: boolean;
  isModel?: boolean;
  isUltimate?: boolean;
  isGreen?: boolean;
  isRegular?: boolean;
  isExGreen?: boolean;
  isDeleted?: boolean;
  isBlocked?: boolean;
  isStudio?: boolean;
  isOnline?: boolean;
  userRanking?: ChatUserRanking | null;
  hasAdminBadge?: boolean;
  hasVrDevice?: boolean;
  isPermanentlyBlocked?: boolean;
}

export interface ChatAdditionalData {
  isKing?: boolean;
  isKnight?: boolean;
  isStudioModerator?: boolean;
  isStudioAdmin?: boolean;
}

export interface ChatDetails {
  body?: string;
  amount?: number;
  isAnonymous?: boolean;
  source?: string;
  tipData?: any[];
  fanClubTier?: string | null;
  fanClubNumberMonthsOfSubscribed?: number;
  lovenseDetails?: {
    type?: string;
    status?: string;
    text?: string;
    detail?: {
      name?: string;
      amount?: number;
      time?: number;
      power?: string;
    };
  };
}

export interface ChatMessage {
  id: number | string;
  modelId: number | string;
  type: "text" | "tip" | "lovense" | string;
  details?: ChatDetails;
  userData?: ChatUserData;
  additionalData?: ChatAdditionalData;
  createdAt: string;
  isDeleted?: boolean;
  cacheId?: string;
  isLocal?: boolean;
}

export interface ChatResponse {
  messages: ChatMessage[];
}

/**
 * Formats ISO timestamp into relative time string (e.g., "2 min ago", "1 day ago")
 */
export function formatChatTimeAgo(createdAt: string): string {
  if (!createdAt) return "";
  const date = new Date(createdAt);
  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 10) return "just now";
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return diffInMinutes === 1 ? "1 min ago" : `${diffInMinutes} min ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return diffInHours === 1 ? "1 hour ago" : `${diffInHours} hours ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return diffInDays === 1 ? "1 day ago" : `${diffInDays} days ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return diffInMonths === 1 ? "1 month ago" : `${diffInMonths} months ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return diffInYears === 1 ? "1 year ago" : `${diffInYears} years ago`;
}

/**
 * Extracts a numeric model ID from modelId, reel ID, or stream URL
 */
export function extractModelId(
  modelId?: string | number,
  reelId?: string,
  streamUrl?: string,
): string | null {
  if (modelId) {
    const clean = String(modelId)
      .replace(/^live-/, "")
      .trim();
    if (/^\d+$/.test(clean)) return clean;
  }
  if (reelId) {
    const clean = String(reelId)
      .replace(/^live-/, "")
      .trim();
    if (/^\d+$/.test(clean)) return clean;
  }
  if (streamUrl) {
    const match = streamUrl.match(/\/hls\/(\d+)\//) || streamUrl.match(/(\d{7,11})/);
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * Fetches live chat messages using the modelId
 */
export async function fetchLiveChat(modelId: string | number): Promise<ChatMessage[]> {
  const targetModelId = String(modelId)
    .replace(/^live-/, "")
    .trim();
  if (!targetModelId) return [];

  try {
    const res = await fetch(`/api/cam-chat/${targetModelId}/chat?source=regular`, {
      headers: {
        accept: "application/json",
      },
    });

    if (!res.ok) {
      return [];
    }

    const data: ChatResponse = await res.json();
    if (data && Array.isArray(data.messages)) {
      return data.messages;
    }
  } catch (err) {
    console.error("Failed to fetch live webcam chat:", err);
  }

  return [];
}
