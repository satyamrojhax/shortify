import { useEffect, useState } from "react";
import { KEYS, get, set, remove, initStorageData } from "@/lib/storage";
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

  useEffect(() => {
    async function load() {
      const uid = typeof localStorage !== "undefined" ? localStorage.getItem("ig.user_id") : null;
      if (uid) {
        try {
          const rows = await fetchUserData(uid);
          const data: Record<string, any> = {};
          for (const row of rows || []) {
            data[row.key] = row.value;
          }
          initStorageData(uid, data);
        } catch (err) {
          console.error("Failed to fetch user data", err);
        }
      }

      setAgeOk(get<boolean>(KEYS.age, false));
      setUsername(get<string | null>(KEYS.username, null));
      const isSessionPinOk = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(SESSION_PIN_KEY) === "true" : false;
      setPinOk(isSessionPinOk);
      setPinCodeState(get<string | null>(KEYS.pinCode, null));
      setRealName(get<string | null>(KEYS.realName, null));
      setDob(get<string | null>(KEYS.dob, null));
      setHash(get<string | null>(KEYS.hash, null));
      setDeviceId(get<string | null>(KEYS.deviceId, null));
      setFingerprint(get<string | null>(KEYS.fingerprint, null));

      setReady(true);
    }

    load();
  }, []);

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
    confirmAge: () => {
      set(KEYS.age, true);
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
