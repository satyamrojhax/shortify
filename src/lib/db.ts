import { supabase } from "./supabase";

export async function loginUserDb(email: string, pass: string) {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  });

  if (authError) {
    throw new Error(authError.message);
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", authData.user.id)
    .single();

  if (error || !user) {
    throw new Error("User record not found in database");
  }

  return user;
}

export async function checkUsernameAvailability(username: string): Promise<boolean | null> {
  const email = `${username.toLowerCase()}@shortify.cc.cd`;
  const { data, error } = await supabase.rpc("check_username_available", { p_email: email });

  if (error) {
    console.error("check_username_available error:", error);
    return null;
  }
  return data === true;
}

export async function signupUserDb(name: string, email: string, pass: string) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: pass,
    options: {
      data: { name },
    },
  });

  if (authError) {
    throw new Error(authError.message);
  }

  if (!authData.user) {
    throw new Error("Failed to create authentication record");
  }

  const { data: newUser, error: createError } = await supabase
    .from("users")
    .insert([{ id: authData.user.id, name, email, password: pass }])
    .select()
    .single();

  if (createError) {
    // If it already exists, just fetch it
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("id", authData.user.id)
      .single();
    if (existingUser) return existingUser;

    throw createError;
  }

  return newUser;
}

export async function updateUserDob(userId: string, dob: string) {
  const { error } = await supabase.from("users").update({ dob }).eq("id", userId);
  if (error) throw error;
}

export async function fetchUserData(userId: string) {
  try {
    const { data, error } = await supabase
      .from("user_data")
      .select("key, value")
      .eq("user_id", userId);

    if (error) {
      if (error.code === "42501" || (error as any).status === 401) {
        return [];
      }
      throw error;
    }
    return data || [];
  } catch {
    return [];
  }
}

export async function setRemoteData(userId: string, key: string, value: any) {
  // Check if we have an active GoTrue auth session matching this userId
  const { data: sessionData } = await supabase.auth
    .getSession()
    .catch(() => ({ data: { session: null } }));
  const activeSession = sessionData?.session;

  // If user is not authenticated in GoTrue, skip remote sync to avoid 401 / 42501 RLS rejection
  if (!activeSession || activeSession.user.id !== userId) {
    return;
  }

  // Parse if value was passed as stringified JSON to prevent storing double-encoded strings in JSONB
  let parsedValue = value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      (trimmed.startsWith("{") && trimmed.endsWith("}"))
    ) {
      try {
        parsedValue = JSON.parse(trimmed);
      } catch {
        parsedValue = value;
      }
    }
  }

  // Update generic user_data table for compatibility and quick restore
  try {
    const { error } = await supabase.from("user_data").upsert({ user_id: userId, key, value: parsedValue });
    if (error) {
      if (error.code === "42501" || (error as any).status === 401) return;
      throw error;
    }
  } catch (err: any) {
    if (err?.code === "42501" || err?.status === 401) return;
    throw err;
  }

  // Sync to relational tables
  try {
    if (key === "ig.liked" && Array.isArray(parsedValue)) {
      const uniqueLiked = Array.from(
        new Map(
          parsedValue
            .filter((r: any) => r && (r.id || r.reel_id))
            .map((r: any) => {
              const rId = r.id || r.reel_id;
              return [rId, { user_id: userId, reel_id: rId, reel_data: r }];
            }),
        ).values(),
      );
      if (uniqueLiked.length === 0) {
        await supabase.from("user_liked_reels").delete().eq("user_id", userId);
      } else {
        await supabase
          .from("user_liked_reels")
          .upsert(uniqueLiked, { onConflict: "user_id,reel_id" });
      }
    } else if (key === "ig.saved" && Array.isArray(parsedValue)) {
      const uniqueSaved = Array.from(
        new Map(
          parsedValue
            .filter((r: any) => r && (r.id || r.reel_id))
            .map((r: any) => {
              const rId = r.id || r.reel_id;
              return [rId, { user_id: userId, reel_id: rId, reel_data: r }];
            }),
        ).values(),
      );
      if (uniqueSaved.length === 0) {
        await supabase.from("user_saved_reels").delete().eq("user_id", userId);
      } else {
        await supabase
          .from("user_saved_reels")
          .upsert(uniqueSaved, { onConflict: "user_id,reel_id" });
      }
    } else if (key === "ig.history" && Array.isArray(parsedValue)) {
      await supabase.from("user_watch_history").delete().eq("user_id", userId);
      if (parsedValue.length > 0) {
        await supabase
          .from("user_watch_history")
          .insert(parsedValue.map((r: any) => ({ user_id: userId, reel_id: r.id, reel_data: r })));
      }
    } else if (key === "ig.favorites" && Array.isArray(parsedValue)) {
      const favMap = new Map<string, any>();
      for (const r of parsedValue) {
        const uName = typeof r === "string" ? r : r?.username;
        if (uName) {
          favMap.set(uName, {
            user_id: userId,
            creator_id: uName,
            creator_data: typeof r === "object" ? r : { username: uName, timestamp: Date.now() },
          });
        }
      }
      const uniqueFavs = Array.from(favMap.values());
      if (uniqueFavs.length === 0) {
        await supabase.from("user_favorite_creators").delete().eq("user_id", userId);
        await supabase.from("user_followed_accounts").delete().eq("user_id", userId);
      } else {
        await supabase
          .from("user_favorite_creators")
          .upsert(uniqueFavs, { onConflict: "user_id,creator_id" });
        await supabase
          .from("user_followed_accounts")
          .upsert(
            uniqueFavs.map((f: any) => ({
              user_id: userId,
              account_id: f.creator_id,
              account_data: f.creator_data,
              followed_at: f.creator_data?.timestamp
                ? new Date(f.creator_data.timestamp).toISOString()
                : new Date().toISOString(),
            })),
            { onConflict: "user_id,account_id" },
          );
      }
    } else if (key === "enrolled_courses" && Array.isArray(parsedValue)) {
      const courseMap = new Map<string, any>();
      for (const r of parsedValue) {
        if (!r) continue;
        const cId = r.slug || r.id || r.courseId;
        const cType = r.folder || r.type || "unknown";
        if (cId) {
          courseMap.set(`${cId}:::${cType}`, {
            user_id: userId,
            course_id: cId,
            course_type: cType,
            course_data: r,
          });
        }
      }
      const uniqueCourses = Array.from(courseMap.values());
      if (uniqueCourses.length === 0) {
        await supabase.from("user_courses").delete().eq("user_id", userId);
      } else {
        await supabase
          .from("user_courses")
          .upsert(uniqueCourses, { onConflict: "user_id,course_id,course_type" });
      }
    } else if (
      key.startsWith("progress_") &&
      (typeof value === "object" || typeof parsedValue === "object") &&
      (value !== null || parsedValue !== null)
    ) {
      const courseId = key.replace("progress_", "");
      const progressObj = typeof parsedValue === "object" && parsedValue !== null ? parsedValue : value;
      if (progressObj && typeof progressObj === "object") {
        const lectureIds = Array.from(
          new Set(Object.keys(progressObj).filter((k) => (progressObj as any)[k])),
        );
        if (lectureIds.length > 0) {
          const rows = lectureIds.map((lId) => ({
            user_id: userId,
            course_id: courseId,
            lecture_id: lId,
            course_type: "unknown",
            lecture_data: { completed: true },
          }));
          await supabase
            .from("user_course_lectures")
            .upsert(rows, { onConflict: "user_id,course_id,lecture_id,course_type" });
        }
      }
    } else if (key === "ig.coins") {
      await supabase.from("users").update({ total_coins: value }).eq("id", userId);
    } else if (key === "ig.watched_count") {
      await supabase.from("user_reels_watched_count").upsert({ user_id: userId, count: value });
    } else if (
      key === "ig.random_mode" ||
      key === "ig.avatar_style" ||
      key === "ig.avatar_seed" ||
      key === "ig.theme" ||
      key === "ig.meme_sounds"
    ) {
      const field = key.replace("ig.", "");
      const { data: u } = await supabase
        .from("users")
        .select("profile_details")
        .eq("id", userId)
        .single();
      const currentDetails = u?.profile_details || {};
      await supabase
        .from("users")
        .update({
          profile_details: { ...currentDetails, [field]: value },
        })
        .eq("id", userId);
    }
  } catch (e) {
    console.error("Relational sync error:", e);
  }
}

export async function updateDeviceInfo(userId: string, deviceInfo: any, browserInfo: any) {
  const { error } = await supabase
    .from("users")
    .update({ device_info: deviceInfo, browser_info: browserInfo })
    .eq("id", userId);
  if (error) throw error;
}

export async function fetchUserProfile(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("email, password, name, profile_details")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateUserProfileDetails(
  userId: string,
  updates: { name?: string; bio?: string; avatar_style?: string; avatar_seed?: string },
) {
  const userUpdates: Record<string, any> = {};
  if (updates.name) userUpdates.name = updates.name.trim();

  const { data: u } = await supabase
    .from("users")
    .select("profile_details")
    .eq("id", userId)
    .single();

  const currentDetails = u?.profile_details || {};
  const newDetails = {
    ...currentDetails,
    ...(updates.bio !== undefined ? { bio: updates.bio.trim() } : {}),
    ...(updates.avatar_style !== undefined ? { avatar_style: updates.avatar_style } : {}),
    ...(updates.avatar_seed !== undefined ? { avatar_seed: updates.avatar_seed } : {}),
  };

  userUpdates.profile_details = newDetails;

  const { error } = await supabase
    .from("users")
    .update(userUpdates)
    .eq("id", userId);

  if (error) throw error;
  return newDetails;
}

export async function resetAllStatsDb(userId: string) {
  const keepKeys = [
    "ig.username",
    "ig.pin_ok",
    "ig.pin_code",
    "ig.real_name",
    "ig.dob",
    "ig.hash",
    "ig.device_id",
    "ig.fingerprint",
  ];

  await supabase
    .from("user_data")
    .delete()
    .eq("user_id", userId)
    .not("key", "in", `(${keepKeys.join(",")})`);

  await supabase.from("user_liked_reels").delete().eq("user_id", userId);
  await supabase.from("user_saved_reels").delete().eq("user_id", userId);
  await supabase.from("user_watch_history").delete().eq("user_id", userId);
  await supabase.from("user_favorite_creators").delete().eq("user_id", userId);
  await supabase.from("user_followed_accounts").delete().eq("user_id", userId);
  await supabase.from("user_courses").delete().eq("user_id", userId);
  await supabase.from("user_course_lectures").delete().eq("user_id", userId);
  await supabase.from("user_reels_watched_count").delete().eq("user_id", userId);

  await supabase.from("users").update({ total_coins: 0, profile_details: {} }).eq("id", userId);
}
