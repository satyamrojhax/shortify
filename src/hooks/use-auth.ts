import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { KEYS, get, set, remove, initStorageData, isBrowser, setLocal, clearAllUserData } from "@/lib/storage";
import {
  loginUserDb,
  signupUserDb,
  fetchUserData,
  updateUserDob,
  updateDeviceInfo,
} from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { setCookie, getCookie, removeCookie } from "@/lib/viewer-country";
import { saveAuthToIdb, getAuthFromIdb, clearAuthFromIdb } from "@/lib/idb-auth";

const SESSION_PIN_KEY = "ig.session_pin_ok";
let isLoggingOut = false;

let globalMaintenance: boolean | null = null;
const maintenanceListeners = new Set<(val: boolean | null) => void>();
let globalMaintenanceSubscribed = false;

function subscribeGlobalMaintenance() {
  if (globalMaintenanceSubscribed || typeof window === "undefined") return;
  globalMaintenanceSubscribed = true;

  supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "maintenance")
    .single()
    .then(({ data: setting }: { data: any }) => {
      const isM = setting ? setting.value === "true" || setting.value === true : false;
      globalMaintenance = isM;
      maintenanceListeners.forEach((fn) => fn(isM));
    })
    .catch(() => {
      globalMaintenance = false;
      maintenanceListeners.forEach((fn) => fn(false));
    });

  try {
    const existing = (supabase.getChannels() as any[]).find((ch: any) => ch.topic && String(ch.topic).includes("maintenance-sync-global"));
    if (existing) {
      supabase.removeChannel(existing);
    }
  } catch {}

  const maintenanceChannel = `maintenance-sync-global-${Math.random().toString(36).slice(2, 8)}`;
  try {
    supabase
      .channel(maintenanceChannel)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "platform_settings",
          filter: `key=eq.maintenance`,
        },
        (payload: any) => {
          const newData = payload.new as any;
          if (newData && newData.value !== undefined) {
            const isM = newData.value === "true" || newData.value === true;
            globalMaintenance = isM;
            maintenanceListeners.forEach((fn) => fn(isM));
          }
        },
      )
      .subscribe();
  } catch (err) {
    console.warn("subscribeGlobalMaintenance realtime error:", err);
  }
}

export function generatePinFromDob(dob: string): string {
  // dob format: YYYY-MM-DD → DDMMYY
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return "";
  const [, yyyy, mm, dd] = m;
  return `${dd}${mm}${yyyy.slice(2)}`;
}

function getDeviceInfo() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  let browser = "Unknown Browser";
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("SamsungBrowser")) browser = "Samsung Browser";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
  else if (ua.includes("Edge") || ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";

  let os = "Unknown OS";
  if (ua.includes("Win")) os = "Windows";
  else if (ua.includes("Mac")) os = "MacOS";
  else if (ua.includes("X11")) os = "UNIX";
  else if (ua.includes("Linux")) os = "Linux";
  if (ua.includes("Android")) os = "Android";
  if (ua.includes("like Mac")) os = "iOS";

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  return {
    device: {
      type: isMobile ? "Mobile" : "Desktop",
      os: os,
      screen_width: typeof window !== "undefined" ? window.screen.width : 0,
      screen_height: typeof window !== "undefined" ? window.screen.height : 0,
      language: typeof navigator !== "undefined" ? navigator.language : "en",
    },
    browser: {
      name: browser,
      userAgent: ua,
      cookiesEnabled: typeof navigator !== "undefined" ? navigator.cookieEnabled : true,
    },
  };
}

export function checkIsPinOk(): boolean {
  if (typeof sessionStorage !== "undefined") {
    return (
      sessionStorage.getItem(SESSION_PIN_KEY) === "true" ||
      sessionStorage.getItem("ig.pin_ok") === "true"
    );
  }
  return false;
}

export function getStoredUserId(): string | null {
  if (typeof localStorage !== "undefined") {
    const uid = localStorage.getItem("ig.user_id");
    if (uid) return uid;
  }
  return getCookie("ig.user_id");
}

export function getStoredUsername(): string | null {
  if (typeof localStorage !== "undefined") {
    const u = localStorage.getItem("ig.username") || localStorage.getItem("ig.user_name");
    if (u) return u;
  }
  return getCookie("ig.username") || getCookie("ig.user_name");
}

export function getStoredPinCode(): string | null {
  if (typeof localStorage !== "undefined") {
    const p = localStorage.getItem("ig.pin_code");
    if (p) return p;
  }
  return getCookie("ig.pin_code");
}

export function checkIsAgeOk(): boolean {
  if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("ig.age_ok") === "true") return true;
  if (typeof localStorage !== "undefined" && localStorage.getItem("ig.age_ok") === "true") return true;
  if (getCookie("ig.age_ok") === "true") return true;
  // If user is already identified by user_id or username, they have inherently passed age verification
  if (getStoredUserId() || getStoredUsername()) return true;
  return false;
}

function getInitialReadyState(): boolean {
  const u = getStoredUsername();
  const uid = getStoredUserId();
  if (u || !uid) return true;
  return false;
}

export function useAuth() {
  const [ready, setReady] = useState<boolean>(getInitialReadyState);
  const [ageOk, setAgeOk] = useState<boolean>(checkIsAgeOk);
  const [username, setUsername] = useState<string | null>(getStoredUsername);
  const [pinOk, setPinOkState] = useState<boolean>(checkIsPinOk);
  const [pinCode, setPinCodeState] = useState<string | null>(() => get<string | null>(KEYS.pinCode, null) || getStoredPinCode());
  const [realName, setRealName] = useState<string | null>(() => get<string | null>(KEYS.realName, null) || (typeof localStorage !== "undefined" ? localStorage.getItem("ig.real_name") : null) || getCookie("ig.real_name"));
  const [dob, setDob] = useState<string | null>(() => get<string | null>(KEYS.dob, null) || (typeof localStorage !== "undefined" ? localStorage.getItem("ig.dob") : null) || getCookie("ig.dob"));
  const [hash, setHash] = useState<string | null>(() => get<string | null>(KEYS.hash, null));
  const [deviceId, setDeviceId] = useState<string | null>(() => get<string | null>(KEYS.deviceId, null));
  const [fingerprint, setFingerprint] = useState<string | null>(() => get<string | null>(KEYS.fingerprint, null));
  const [isMaintenance, setIsMaintenance] = useState<boolean | null>(() => globalMaintenance);

  useEffect(() => {
    subscribeGlobalMaintenance();
    const listener = (val: boolean | null) => setIsMaintenance(val);
    maintenanceListeners.add(listener);
    if (globalMaintenance !== null) setIsMaintenance(globalMaintenance);
    return () => {
      maintenanceListeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    const handlePinSync = (e: Event) => {
      const custom = e as CustomEvent<boolean>;
      if (typeof custom.detail === "boolean") {
        setPinOkState(custom.detail);
      } else {
        setPinOkState(checkIsPinOk());
      }
    };
    const handleLogoutSync = () => {
      setUsername(null);
      setPinOkState(false);
      setPinCodeState(null);
      setRealName(null);
      setDob(null);
      setHash(null);
      setDeviceId(null);
      setFingerprint(null);
    };

    window.addEventListener("auth-pin-change", handlePinSync);
    window.addEventListener("auth-logout", handleLogoutSync);
    window.addEventListener("storage", handlePinSync);
    return () => {
      window.removeEventListener("auth-pin-change", handlePinSync);
      window.removeEventListener("auth-logout", handleLogoutSync);
      window.removeEventListener("storage", handlePinSync);
    };
  }, []);

  useEffect(() => {
    async function load() {
      if (isLoggingOut) {
        setReady(true);
        return;
      }

      // 0. Recover credentials from IndexedDB vault only if user wasn't intentionally logged out
      try {
        if (!isLoggingOut) {
          const idbData = await getAuthFromIdb();
          if (idbData && Object.keys(idbData).length > 0 && (idbData["ig.user_id"] || idbData["ig.username"])) {
            const SUPABASE_KEY = "sb-mcrhjyszrxbtiizhgacn-auth-token";
            if (idbData["sb_auth_token"] && typeof localStorage !== "undefined" && !localStorage.getItem(SUPABASE_KEY)) {
              try {
                const parsed = JSON.parse(idbData["sb_auth_token"]);
                if (parsed && (parsed.refresh_token || parsed.currentSession?.refresh_token)) {
                  localStorage.setItem(SUPABASE_KEY, idbData["sb_auth_token"]);
                }
              } catch {
                // ignore corrupt token
              }
            }
            for (const [k, v] of Object.entries(idbData)) {
              if (k === "ig.pin_ok" || k === SESSION_PIN_KEY || k === "sb_auth_token") continue;
              if (v && typeof localStorage !== "undefined" && !localStorage.getItem(k)) {
                localStorage.setItem(k, v);
              }
              if (v && !getCookie(k)) {
                setCookie(k, v, 365);
              }
            }
          }
        }
      } catch {
        // ignore idb recovery errors
      }

      // Purge any persistent pin_ok keys from previous sessions or legacy storage
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("ig.pin_ok");
        localStorage.removeItem(SESSION_PIN_KEY);
      }
      removeCookie("ig.pin_ok");
      removeCookie(SESSION_PIN_KEY);

      // 1. Fetch User Data if logged in
      const uid = getStoredUserId();
      const fallbackUserName = getStoredUsername();
      const cachedUsername = (uid || fallbackUserName)
        ? (get<string | null>(KEYS.username, null) || fallbackUserName)
        : null;

      const isAgeOk = checkIsAgeOk() || Boolean(uid) || Boolean(cachedUsername);
      if (isAgeOk) {
        if (typeof localStorage !== "undefined") localStorage.setItem("ig.age_ok", "true");
        setCookie("ig.age_ok", "true", 365);
        saveAuthToIdb({ "ig.age_ok": "true" });
      }

      const isPinOk = checkIsPinOk();
      const storedPin = (uid || fallbackUserName)
        ? (get<string | null>(KEYS.pinCode, null) || getStoredPinCode())
        : null;

      setAgeOk(isAgeOk);
      setUsername(cachedUsername);
      setPinOkState(isPinOk);
      setPinCodeState(storedPin);
      setRealName((uid || fallbackUserName) ? (get<string | null>(KEYS.realName, null) || (typeof localStorage !== "undefined" ? localStorage.getItem("ig.real_name") : null) || getCookie("ig.real_name")) : null);
      setDob((uid || fallbackUserName) ? (get<string | null>(KEYS.dob, null) || (typeof localStorage !== "undefined" ? localStorage.getItem("ig.dob") : null) || getCookie("ig.dob")) : null);
      setHash((uid || fallbackUserName) ? get<string | null>(KEYS.hash, null) : null);
      setDeviceId((uid || fallbackUserName) ? get<string | null>(KEYS.deviceId, null) : null);
      setFingerprint((uid || fallbackUserName) ? get<string | null>(KEYS.fingerprint, null) : null);

      // If we have cached data, we are ready instantly! No UI hang.
      if (cachedUsername || !uid) {
        setReady(true);
      }

      if (uid && (typeof navigator === "undefined" || navigator.onLine)) {
        try {
          // Fetch silently in background to update cache
          const rows = await fetchUserData(uid);
          const data: Record<string, any> = {};
          for (const row of rows || []) {
            data[row.key] = row.value;
          }
          initStorageData(uid, data);

          // Find the best username - NEVER overwrite with null if we have an existing username
          let finalUsername = data[KEYS.username] || cachedUsername || fallbackUserName;
          let finalDob = data[KEYS.dob] || get<string | null>(KEYS.dob, null) || (typeof localStorage !== "undefined" ? localStorage.getItem("ig.dob") : null) || getCookie("ig.dob");
          let finalRealName = data[KEYS.realName] || get<string | null>(KEYS.realName, null) || (typeof localStorage !== "undefined" ? localStorage.getItem("ig.real_name") : null) || getCookie("ig.real_name");

          if (!finalUsername || !finalDob) {
            try {
              const { data: userRow } = await supabase
                .from("users")
                .select("name, dob")
                .eq("id", uid)
                .single();
              if (userRow) {
                if (userRow.name && !finalUsername) finalUsername = userRow.name;
                if (userRow.dob && !finalDob) finalDob = userRow.dob;
              }
            } catch {
              // ignore
            }
          }

          if (finalUsername) {
            setUsername(finalUsername);
            setLocal(KEYS.username, finalUsername);
            if (typeof localStorage !== "undefined") {
              localStorage.setItem("ig.username", finalUsername);
              localStorage.setItem("ig.user_name", finalUsername);
              localStorage.setItem("ig.age_ok", "true");
            }
            setCookie("ig.username", finalUsername, 365);
            setCookie("ig.user_name", finalUsername, 365);
            setCookie("ig.age_ok", "true", 365);
            saveAuthToIdb({
              "ig.username": finalUsername,
              "ig.user_name": finalUsername,
              "ig.age_ok": "true",
            });
            setAgeOk(true);
          }

          if (finalDob) {
            setDob(finalDob);
            setLocal(KEYS.dob, finalDob);
            const derivedPin = generatePinFromDob(finalDob);
            if (derivedPin) {
              setPinCodeState(derivedPin);
              setLocal(KEYS.pinCode, derivedPin);
              if (typeof localStorage !== "undefined") {
                localStorage.setItem("ig.pin_code", derivedPin);
                localStorage.setItem("ig.dob", finalDob);
              }
              setCookie("ig.pin_code", derivedPin, 365);
              setCookie("ig.dob", finalDob, 365);
              saveAuthToIdb({
                "ig.pin_code": derivedPin,
                "ig.dob": finalDob,
              });
            }
          }

          if (finalRealName) {
            setRealName(finalRealName);
            setLocal(KEYS.realName, finalRealName);
          }

          if (data[KEYS.hash]) setHash(data[KEYS.hash]);
          if (data[KEYS.deviceId]) setDeviceId(data[KEYS.deviceId]);
          if (data[KEYS.fingerprint]) setFingerprint(data[KEYS.fingerprint]);

          const userDataChannel = `user-data-sync-${uid}-${crypto.randomUUID()}`;
          supabase
            .channel(userDataChannel)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "user_data", filter: `user_id=eq.${uid}` },
              (payload: any) => {
                const newData = payload.new as any;
                if (newData && newData.key !== undefined && newData.value !== undefined) {
                  setLocal(newData.key, newData.value);
                }
              },
            )
            .subscribe();
        } catch (err) {
          console.error("Failed to fetch user data", err);
        } finally {
          setReady(true);
        }
      } else {
        setReady(true);
      }
    }

    load();
  }, []);

  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (ready && isBrowser() && isMaintenance !== null) {
      const isMaintenancePage = pathname === "/maintenance";
      const isAdminUser = username?.toLowerCase() === "satyamrojha";
      const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/madarchod");
      if (isMaintenance && !isAdminUser && !isMaintenancePage && !isAdminRoute) {
        navigate({ to: "/maintenance", replace: true });
      } else if (!isMaintenance && isMaintenancePage) {
        if (username && pinOk && ageOk) {
          navigate({ to: "/home", replace: true });
        } else if (username && !pinOk) {
          navigate({ to: "/pin", replace: true });
        } else {
          navigate({ to: "/login", replace: true });
        }
      }
    }
  }, [ready, isMaintenance, username, pinOk, ageOk, navigate, pathname]);

  return {
    ready,
    ageOk,
    userId: getStoredUserId(),
    username,
    pinOk,
    pinCode,
    realName,
    dob,
    hash,
    deviceId,
    fingerprint,
    isMaintenance,
    confirmAge: () => {
      if (typeof sessionStorage !== "undefined") sessionStorage.setItem("ig.age_ok", "true");
      if (typeof localStorage !== "undefined") localStorage.setItem("ig.age_ok", "true");
      setCookie("ig.age_ok", "true", 365);
      saveAuthToIdb({ "ig.age_ok": "true" });
      setAgeOk(true);
    },
    loginUser: async (email: string, pass: string) => {
      const user = await loginUserDb(email, pass);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("ig.user_id", user.id);
        localStorage.setItem("ig.user_name", user.name);
        localStorage.setItem("ig.username", user.name);
        localStorage.setItem("ig.age_ok", "true");
        localStorage.removeItem("ig.pin_ok");
        localStorage.removeItem(SESSION_PIN_KEY);
      }
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("ig.age_ok", "true");
        sessionStorage.removeItem("ig.pin_ok");
        sessionStorage.removeItem(SESSION_PIN_KEY);
      }
      setCookie("ig.user_id", user.id, 365);
      setCookie("ig.user_name", user.name, 365);
      setCookie("ig.username", user.name, 365);
      setCookie("ig.age_ok", "true", 365);
      removeCookie("ig.pin_ok");
      removeCookie(SESSION_PIN_KEY);
      const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      saveAuthToIdb({
        "ig.user_id": user.id,
        "ig.user_name": user.name,
        "ig.username": user.name,
        "ig.age_ok": "true",
        ...(sessionData?.session ? { "sb_auth_token": JSON.stringify(sessionData.session) } : {}),
      });

      const info = getDeviceInfo();
      await updateDeviceInfo(user.id, info.device, info.browser).catch(console.error);

      const rows = await fetchUserData(user.id);
      const data: Record<string, any> = {};
      for (const row of rows || []) {
        data[row.key] = row.value;
      }
      initStorageData(user.id, data);

      set(KEYS.username, user.name);
      setUsername(user.name);
      setAgeOk(true);
      setPinOkState(false);

      if (user.dob) {
        const pin = generatePinFromDob(user.dob);
        if (pin) {
          set(KEYS.pinCode, pin);
          set(KEYS.dob, user.dob);
          setPinCodeState(pin);
          setDob(user.dob);
          if (typeof localStorage !== "undefined") {
            localStorage.setItem("ig.pin_code", pin);
            localStorage.setItem("ig.dob", user.dob);
          }
          setCookie("ig.pin_code", pin, 365);
          setCookie("ig.dob", user.dob, 365);
          saveAuthToIdb({
            "ig.pin_code": pin,
            "ig.dob": user.dob,
          });
        }
      }
    },
    signupUser: async (name: string, email: string, pass: string) => {
      const user = await signupUserDb(name, email, pass);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("ig.user_id", user.id);
        localStorage.setItem("ig.user_name", user.name);
        localStorage.setItem("ig.username", user.name);
        localStorage.setItem("ig.age_ok", "true");
        localStorage.removeItem("ig.pin_ok");
        localStorage.removeItem(SESSION_PIN_KEY);
      }
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("ig.age_ok", "true");
        sessionStorage.removeItem("ig.pin_ok");
        sessionStorage.removeItem(SESSION_PIN_KEY);
      }
      setCookie("ig.user_id", user.id, 365);
      setCookie("ig.user_name", user.name, 365);
      setCookie("ig.username", user.name, 365);
      setCookie("ig.age_ok", "true", 365);
      removeCookie("ig.pin_ok");
      removeCookie(SESSION_PIN_KEY);
      const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      saveAuthToIdb({
        "ig.user_id": user.id,
        "ig.user_name": user.name,
        "ig.username": user.name,
        "ig.age_ok": "true",
        ...(sessionData?.session ? { "sb_auth_token": JSON.stringify(sessionData.session) } : {}),
      });

      const info = getDeviceInfo();
      await updateDeviceInfo(user.id, info.device, info.browser).catch(console.error);

      const rows = await fetchUserData(user.id);
      const data: Record<string, any> = {};
      for (const row of rows || []) {
        data[row.key] = row.value;
      }
      initStorageData(user.id, data);

      set(KEYS.username, user.name);
      setUsername(user.name);
      setAgeOk(true);
      setPinOkState(false);
    },
    setPinOk: (ok: boolean) => {
      if (typeof sessionStorage !== "undefined") {
        if (ok) {
          sessionStorage.setItem(SESSION_PIN_KEY, "true");
          sessionStorage.setItem("ig.pin_ok", "true");
        } else {
          sessionStorage.removeItem(SESSION_PIN_KEY);
          sessionStorage.removeItem("ig.pin_ok");
        }
      }
      // Never store pin_ok in persistent storage (localStorage, cookies, or IndexedDB)
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem(SESSION_PIN_KEY);
        localStorage.removeItem("ig.pin_ok");
      }
      removeCookie("ig.pin_ok");
      removeCookie(SESSION_PIN_KEY);

      setPinOkState(ok);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth-pin-change", { detail: ok }));
      }
    },
    savePinSetup: async (name: string, dobStr: string) => {
      const code = generatePinFromDob(dobStr);
      set(KEYS.realName, name);
      set(KEYS.dob, dobStr);
      set(KEYS.pinCode, code);

      if (typeof localStorage !== "undefined") {
        localStorage.setItem("ig.pin_code", code);
        localStorage.setItem("ig.dob", dobStr);
        localStorage.removeItem("ig.pin_ok");
        localStorage.removeItem(SESSION_PIN_KEY);
        if (name) localStorage.setItem("ig.real_name", name);
      }
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem("ig.pin_ok");
        sessionStorage.removeItem(SESSION_PIN_KEY);
      }
      setCookie("ig.pin_code", code, 365);
      setCookie("ig.dob", dobStr, 365);
      removeCookie("ig.pin_ok");
      removeCookie(SESSION_PIN_KEY);
      if (name) setCookie("ig.real_name", name, 365);
      saveAuthToIdb({
        "ig.pin_code": code,
        "ig.dob": dobStr,
        ...(name ? { "ig.real_name": name } : {}),
      });

      const uid = getStoredUserId();
      if (uid) {
        await updateUserDob(uid, dobStr).catch(console.error);
      }

      const encoder = new TextEncoder();
      const data = encoder.encode(name + dobStr + Date.now());
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      const newDeviceId = crypto.randomUUID();
      const newFingerprint = btoa(
        (typeof navigator !== "undefined" ? navigator.userAgent : "") +
          (typeof window !== "undefined" ? window.screen.width + window.screen.height : 0) +
          newDeviceId,
      ).slice(0, 32);

      set(KEYS.hash, hashHex);
      set(KEYS.deviceId, newDeviceId);
      set(KEYS.fingerprint, newFingerprint);

      setRealName(name);
      setDob(dobStr);
      setHash(hashHex);
      setDeviceId(newDeviceId);
      setFingerprint(newFingerprint);
      setPinCodeState(code);
      setPinOkState(false);
      return code;
    },
    logout: async () => {
      isLoggingOut = true;

      // 1. Sign out of Supabase GoTrue to clear in-memory auth tokens and listeners
      try {
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});
      } catch {}

      // 2. Clear IndexedDB auth vault completely
      try {
        await clearAuthFromIdb().catch(() => {});
      } catch {}

      // 3. Clear all user storage keys and in-memory cache
      clearAllUserData();

      // 4. Remove all auth and session cookies
      const cookieKeys = [
        "ig.user_id",
        "ig.user_name",
        "ig.username",
        "ig.pin_code",
        "ig.pin_ok",
        "ig.session_pin_ok",
        "ig.real_name",
        "ig.dob",
        "ig.hash",
        "ig.device_id",
        "ig.fingerprint",
        "ig.bio",
        "sb_auth_token",
      ];
      for (const ck of cookieKeys) {
        removeCookie(ck);
      }

      // 5. Clear session storage
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem(SESSION_PIN_KEY);
        sessionStorage.removeItem("ig.pin_ok");
      }

      // 6. Reset all local states
      setUsername(null);
      setPinOkState(false);
      setPinCodeState(null);
      setRealName(null);
      setDob(null);
      setHash(null);
      setDeviceId(null);
      setFingerprint(null);

      // 7. Dispatch events to all active components
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth-logout"));
        window.dispatchEvent(new CustomEvent("auth-pin-change", { detail: false }));
        window.dispatchEvent(new Event("storage"));
      }

      setTimeout(() => {
        isLoggingOut = false;
      }, 500);
    },
  };
}
