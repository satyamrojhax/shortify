import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { KEYS, get, set, remove, initStorageData, isBrowser } from "@/lib/storage";
import { loginUserDb, signupUserDb, fetchUserData, updateUserDob, updateDeviceInfo } from "@/lib/db";

const SESSION_PIN_KEY = "ig.session_pin_ok";

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
    }
  };
}

export function useAuth() {
  const [ready, setReady] = useState(false);
  const [ageOk, setAgeOk] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [pinOk, setPinOk] = useState(false);
  const [pinCode, setPinCodeState] = useState<string | null>(null);
  const [realName, setRealName] = useState<string | null>(null);
  const [dob, setDob] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [isMaintenance, setIsMaintenance] = useState<boolean | null>(null);

  useEffect(() => {
    async function load() {
      // 1. Fetch Maintenance Mode globally
      import("@/lib/supabase").then(async ({ supabase, realtimeSupabase }) => {
        try {
          const { data: setting } = await supabase.from("platform_settings").select("value").eq("key", "maintenance").single();
          if (setting) setIsMaintenance(setting.value === 'true' || setting.value === true);
          else setIsMaintenance(false);
        } catch (e) {
          setIsMaintenance(false);
        }

        // Listen for maintenance mode changes globally
        const maintenanceChannel = `maintenance-sync-${crypto.randomUUID()}`;
        realtimeSupabase.channel(maintenanceChannel)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_settings', filter: `key=eq.maintenance` }, (payload) => {
            const newData = payload.new as any;
            if (newData && newData.value !== undefined) {
              setIsMaintenance(newData.value === 'true' || newData.value === true);
            }
          })
          .subscribe();
      });

      // 2. Fetch User Data if logged in
      const uid = typeof localStorage !== "undefined" ? localStorage.getItem("ig.user_id") : null;
      const fallbackUserName = typeof localStorage !== "undefined" ? localStorage.getItem("ig.user_name") : null;
      const cachedUsername = get<string | null>(KEYS.username, null) || fallbackUserName;
      
      let isAgeOk = false;
      if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("ig.age_ok") === "true") isAgeOk = true;
      if (typeof localStorage !== "undefined" && localStorage.getItem("ig.age_ok") === "true") isAgeOk = true;
      if (uid) isAgeOk = true;
      
      setAgeOk(isAgeOk);
      setUsername(cachedUsername);
      const isSessionPinOk = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(SESSION_PIN_KEY) === "true" : false;
      setPinOk(isSessionPinOk);
      setPinCodeState(get<string | null>(KEYS.pinCode, null));
      setRealName(get<string | null>(KEYS.realName, null));
      setDob(get<string | null>(KEYS.dob, null));
      setHash(get<string | null>(KEYS.hash, null));
      setDeviceId(get<string | null>(KEYS.deviceId, null));
      setFingerprint(get<string | null>(KEYS.fingerprint, null));

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
          
          // CRITICAL: Update states after fetching so we don't stay null
          setUsername(data[KEYS.username] || null);
          setRealName(data[KEYS.realName] || null);
          setDob(data[KEYS.dob] || null);
          setHash(data[KEYS.hash] || null);
          setDeviceId(data[KEYS.deviceId] || null);
          setFingerprint(data[KEYS.fingerprint] || null);
          
          import("@/lib/supabase").then(({ realtimeSupabase }) => {
            const userDataChannel = `user-data-sync-${uid}-${crypto.randomUUID()}`;
            realtimeSupabase.channel(userDataChannel)
              .on('postgres_changes', { event: '*', schema: 'public', table: 'user_data', filter: `user_id=eq.${uid}` }, (payload) => {
                const newData = payload.new as any;
                if (newData && newData.key !== undefined && newData.value !== undefined) {
                  import("@/lib/storage").then(({ setLocal }) => {
                    setLocal(newData.key, newData.value);
                  });
                }
              })
              .subscribe();
          });
        } catch (err) {
          console.error("Failed to fetch user data", err);
        } finally {
          setReady(true);
        }
      }
    }

    load();
  }, []);

  const navigate = useNavigate();
  useEffect(() => {
    if (ready && isBrowser() && isMaintenance !== null) {
      const isMaintenancePage = window.location.pathname === "/maintenance";
      if (isMaintenance && username !== "Admin" && !isMaintenancePage) {
        navigate({ to: "/maintenance" });
      } else if (!isMaintenance && isMaintenancePage) {
        if (username && pinOk && ageOk) {
          navigate({ to: "/home" });
        } else if (username && !pinOk) {
          navigate({ to: "/pin" });
        } else {
          navigate({ to: "/login" });
        }
      }
    }
  }, [ready, isMaintenance, username, pinOk, ageOk, navigate]);

  return {
    ready,
    ageOk,
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
      setAgeOk(true);
    },
    loginUser: async (email: string, pass: string) => {
      const user = await loginUserDb(email, pass);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("ig.user_id", user.id);
        localStorage.setItem("ig.user_name", user.name);
      }

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
    },
    signupUser: async (name: string, email: string, pass: string) => {
      const user = await signupUserDb(name, email, pass);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("ig.user_id", user.id);
        localStorage.setItem("ig.user_name", user.name);
      }

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
    },
    setPinOk: (ok: boolean) => {
      if (typeof sessionStorage !== "undefined") {
        if (ok) sessionStorage.setItem(SESSION_PIN_KEY, "true");
        else sessionStorage.removeItem(SESSION_PIN_KEY);
      }
      setPinOk(ok);
    },
    savePinSetup: async (name: string, dobStr: string) => {
      const code = generatePinFromDob(dobStr);
      set(KEYS.realName, name);
      set(KEYS.dob, dobStr);

      const uid = typeof localStorage !== "undefined" ? localStorage.getItem("ig.user_id") : null;
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

      set(KEYS.pinCode, code);
      setRealName(name);
      setDob(dobStr);
      setHash(hashHex);
      setDeviceId(newDeviceId);
      setFingerprint(newFingerprint);
      setPinCodeState(code);
      return code;
    },
    logout: () => {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem(SESSION_PIN_KEY);
      }
      setPinOk(false);
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("ig.user_id");
        localStorage.removeItem("ig.user_name");
      }
      setUsername(null);
    },
  };
}
