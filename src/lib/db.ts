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

export async function checkUsernameAvailability(username: string) {
  const email = `${username.toLowerCase()}@shortify.cc.cd`;
  const { data, error } = await supabase.rpc("check_username_available", { p_email: email });

  if (error) return false;
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
  let activeSession = sessionData?.session;

  if (!activeSession || activeSession.user.id !== userId) {
    // Attempt automatic session refresh
    const { data: refreshed } = await supabase.auth
      .refreshSession()
      .catch(() => ({ data: { session: null } }));
    activeSession = refreshed?.session;
  }

  // If user is not authenticated in GoTrue, skip remote sync to avoid 401 / 42501 RLS rejection
  if (!activeSession || activeSession.user.id !== userId) {
    return;
  }

  // Update generic user_data table for compatibility and quick restore
  try {
    const { error } = await supabase.from("user_data").upsert({ user_id: userId, key, value });
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
    if (key === "ig.liked" && Array.isArray(value)) {
      await supabase.from("user_liked_reels").delete().eq("user_id", userId);
      if (value.length > 0) {
        await supabase
          .from("user_liked_reels")
          .insert(value.map((r) => ({ user_id: userId, reel_id: r.id, reel_data: r })));
      }
    } else if (key === "ig.saved" && Array.isArray(value)) {
      await supabase.from("user_saved_reels").delete().eq("user_id", userId);
      if (value.length > 0) {
        await supabase
          .from("user_saved_reels")
          .insert(value.map((r) => ({ user_id: userId, reel_id: r.id, reel_data: r })));
      }
    } else if (key === "ig.history" && Array.isArray(value)) {
      await supabase.from("user_watch_history").delete().eq("user_id", userId);
      if (value.length > 0) {
        await supabase
          .from("user_watch_history")
          .insert(value.map((r) => ({ user_id: userId, reel_id: r.id, reel_data: r })));
      }
    } else if (key === "ig.favorites" && Array.isArray(value)) {
      await supabase.from("user_favorite_creators").delete().eq("user_id", userId);
      await supabase.from("user_followed_accounts").delete().eq("user_id", userId);
      if (value.length > 0) {
        await supabase
          .from("user_favorite_creators")
          .insert(value.map((r) => ({ user_id: userId, creator_id: r.username, creator_data: r })));
        await supabase.from("user_followed_accounts").insert(
          value.map((r) => ({
            user_id: userId,
            account_id: r.username,
            account_data: r,
            followed_at: r.timestamp
              ? new Date(r.timestamp).toISOString()
              : new Date().toISOString(),
          })),
        );
      }
    } else if (key === "enrolled_courses" && Array.isArray(value)) {
      await supabase.from("user_courses").delete().eq("user_id", userId);
      if (value.length > 0) {
        await supabase.from("user_courses").insert(
          value.map((r) => ({
            user_id: userId,
            course_id: r.slug,
            course_type: r.folder,
            course_data: r,
          })),
        );
      }
    } else if (key.startsWith("progress_") && typeof value === "object" && value !== null) {
      const courseId = key.replace("progress_", "");
      await supabase
        .from("user_course_lectures")
        .delete()
        .eq("user_id", userId)
        .eq("course_id", courseId);
      const lectureIds = Object.keys(value).filter((k) => value[k]);
      if (lectureIds.length > 0) {
        await supabase.from("user_course_lectures").insert(
          lectureIds.map((lId) => ({
            user_id: userId,
            course_id: courseId,
            lecture_id: lId,
            course_type: "unknown",
            lecture_data: { completed: true },
          })),
        );
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
