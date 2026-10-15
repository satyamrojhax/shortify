/**
 * URL Tracker & Extended Route Parameter Synchronizer
 * Automatically decorates and maintains rich, detailed URL parameters:
 * - deviceId, maid, fingerprintId
 * - userId, user_status ("existing" | "non_existing")
 * - clientId, sessionId, sid
 * - csrf (rotated and synchronized for every action)
 * - author ("satyamrojhax"), product_by ("lfrdcatechnologies")
 * - from, ref, auth, enrolled, t, src, v
 * - geo location (cc, city, tz) & dev_type from __viewer-country API
 * - Base64 encoded URL payload
 * - Signed HS256 JWT token containing the Base64 URL payload and parameters
 *
 * Persists all values in cookies and sitedata (localStorage, sessionStorage).
 */

import { fetchViewerCountry, getCachedViewerCountry, setCookie } from "@/lib/viewer-country";
import { encodeUrlParamsToJwt, decodeHs256Jwt } from "@/lib/jwt-encoder";

let previousRouteName = "direct";
let lastActionTime = 0;
let isListenerAttached = false;

function getSecureRandomString(length = 8): string {
  if (typeof crypto !== "undefined") {
    if (typeof crypto.randomUUID === "function") {
      return crypto.randomUUID().replace(/-/g, "").substring(0, length);
    }
    if (typeof crypto.getRandomValues === "function") {
      const bytes = new Uint8Array(length);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
    }
  }
  return Date.now().toString(36).slice(-length);
}

export function getDeviceId(): string {
  if (typeof window === "undefined") return "dev_default";
  try {
    let devId = localStorage.getItem("shortify_device_id");
    if (!devId) {
      devId = "dev_" + getSecureRandomString(8) + Date.now().toString(36);
      localStorage.setItem("shortify_device_id", devId);
    }
    try {
      sessionStorage.setItem("shortify_device_id", devId);
      setCookie("shortify_device_id", devId);
    } catch {
      // ignore
    }
    return devId;
  } catch {
    return "dev_fallback";
  }
}

export function getDeviceFingerprint(): string {
  if (typeof window === "undefined") return "maid_default";
  try {
    let maid = localStorage.getItem("shortify_maid");
    if (!maid) {
      const screenInfo = `${window.screen?.width || 0}x${window.screen?.height || 0}x${window.screen?.colorDepth || 0}`;
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const navInfo = `${navigator.language || ""}_${navigator.hardwareConcurrency || 1}`;
      const str = `${screenInfo}_${tz}_${navInfo}`;
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      const hex = Math.abs(hash).toString(16).padStart(8, "0");
      maid = "maid_" + hex + getSecureRandomString(4);
      localStorage.setItem("shortify_maid", maid);
    }
    try {
      sessionStorage.setItem("shortify_maid", maid);
      setCookie("shortify_maid", maid);
      setCookie("shortify_fingerprint", maid);
    } catch {
      // ignore
    }
    return maid;
  } catch {
    return "maid_fallback";
  }
}

export function getUserId(): string {
  if (typeof window === "undefined") return "guest_anon";
  try {
    const username = localStorage.getItem("ig.username");
    if (username && username.trim()) {
      const clean = username.trim().toLowerCase();
      try {
        setCookie("shortify_user_id", clean);
        sessionStorage.setItem("shortify_user_id", clean);
      } catch {
        // ignore
      }
      return clean;
    }
    const devId = getDeviceId().replace("dev_", "").substring(0, 8);
    const guestId = `guest_${devId}`;
    try {
      setCookie("shortify_user_id", guestId);
      sessionStorage.setItem("shortify_user_id", guestId);
    } catch {
      // ignore
    }
    return guestId;
  } catch {
    return "guest_anon";
  }
}

export function getUserStatus(): string {
  if (typeof window === "undefined") return "non_existing";
  try {
    const username = localStorage.getItem("ig.username");
    const status = username && username.trim() ? "existing" : "non_existing";
    try {
      setCookie("shortify_user_status", status);
      sessionStorage.setItem("shortify_user_status", status);
    } catch {
      // ignore
    }
    return status;
  } catch {
    return "non_existing";
  }
}

export function getClientId(): string {
  if (typeof window === "undefined") return "client_web_lfrdca";
  try {
    let clientId = localStorage.getItem("shortify_client_id");
    if (!clientId) {
      clientId = "client_web_" + getSecureRandomString(6) + "_lfrdca";
      localStorage.setItem("shortify_client_id", clientId);
    }
    try {
      sessionStorage.setItem("shortify_client_id", clientId);
      setCookie("shortify_client_id", clientId);
    } catch {
      // ignore
    }
    return clientId;
  } catch {
    return "client_web_lfrdca";
  }
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "sess_init";
  try {
    let sid = sessionStorage.getItem("shortify_sid");
    if (!sid) {
      sid = "sess_" + getSecureRandomString(8) + Date.now().toString(36);
      sessionStorage.setItem("shortify_sid", sid);
    }
    try {
      localStorage.setItem("shortify_sid", sid);
      setCookie("shortify_sid", sid);
    } catch {
      // ignore
    }
    return sid;
  } catch {
    return "sess_default";
  }
}

export function getCsrfToken(): string {
  if (typeof window === "undefined") return "csrf_token_init";
  try {
    let token = sessionStorage.getItem("shortify_csrf");
    if (!token) {
      token = "csrf_" + getSecureRandomString(8) + Date.now().toString(36);
      sessionStorage.setItem("shortify_csrf", token);
    }
    try {
      localStorage.setItem("shortify_csrf", token);
      setCookie("shortify_csrf", token);
    } catch {
      // ignore
    }
    return token;
  } catch {
    return "csrf_fallback";
  }
}

export function rotateCsrfToken(actionName?: string): string {
  if (typeof window === "undefined") return "csrf_token";
  try {
    const newToken =
      "csrf_" + getSecureRandomString(8) + Date.now().toString(36);
    sessionStorage.setItem("shortify_csrf", newToken);
    try {
      localStorage.setItem("shortify_csrf", newToken);
      setCookie("shortify_csrf", newToken);
    } catch {
      // ignore
    }

    // Call viewer country API on every action performed by the user
    fetchViewerCountry(actionName || "user_action").catch(() => {});

    const now = Date.now();
    // Throttle URL update to prevent excessive replaceState operations
    if (now - lastActionTime > 150) {
      lastActionTime = now;
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set("csrf", newToken);
      currentUrl.searchParams.set("t", String(now));
      if (actionName) {
        currentUrl.searchParams.set("act", actionName);
      }
      const geo = getCachedViewerCountry();
      if (geo?.geo) {
        if (geo.geo.countryCode) currentUrl.searchParams.set("cc", geo.geo.countryCode);
        if (geo.geo.city) currentUrl.searchParams.set("city", geo.geo.city);
        if (geo.geo.timeZone) currentUrl.searchParams.set("tz", geo.geo.timeZone);
        if (geo.device) {
          currentUrl.searchParams.set("dev_type", geo.device.mobile ? "mobile" : "desktop");
        }
      }

      // Collect parameters and encode to Base64 & HS256 JWT
      const paramsObj: Record<string, string> = {};
      currentUrl.searchParams.forEach((val, key) => {
        if (key !== "token" && key !== "jwt" && key !== "b64") {
          paramsObj[key] = val;
        }
      });
      const { b64, jwt } = encodeUrlParamsToJwt(paramsObj, currentUrl.pathname);
      currentUrl.searchParams.set("token", jwt);
      currentUrl.searchParams.set("jwt", jwt);
      currentUrl.searchParams.set("b64", b64);

      try {
        setCookie("shortify_jwt_token", jwt);
        setCookie("shortify_url_b64", b64);
        localStorage.setItem("shortify_jwt_token", jwt);
        localStorage.setItem("shortify_url_b64", b64);
        sessionStorage.setItem("shortify_jwt_token", jwt);
        sessionStorage.setItem("shortify_url_b64", b64);
      } catch {
        // ignore
      }

      const newSearch = currentUrl.searchParams.toString();
      const newUrl = `${currentUrl.pathname}${newSearch ? `?${newSearch}` : ""}${currentUrl.hash}`;
      window.history.replaceState(window.history.state, "", newUrl);
    }
    return newToken;
  } catch {
    return "csrf_fallback";
  }
}

export function initGlobalActionTracking(): void {
  if (typeof window === "undefined" || isListenerAttached) return;
  isListenerAttached = true;

  // Immediate location & device check on initial mount
  fetchViewerCountry("init").catch(() => {});

  // Sync URL when viewer country is fetched
  window.addEventListener("viewer-country-update", ((e: CustomEvent) => {
    try {
      const data = e.detail?.data;
      if (!data?.geo) return;
      const currentUrl = new URL(window.location.href);
      let updated = false;
      if (data.geo.countryCode && !currentUrl.searchParams.has("cc")) {
        currentUrl.searchParams.set("cc", data.geo.countryCode);
        updated = true;
      }
      if (data.geo.city && !currentUrl.searchParams.has("city")) {
        currentUrl.searchParams.set("city", data.geo.city);
        updated = true;
      }
      if (data.geo.timeZone && !currentUrl.searchParams.has("tz")) {
        currentUrl.searchParams.set("tz", data.geo.timeZone);
        updated = true;
      }
      if (data.device && !currentUrl.searchParams.has("dev_type")) {
        currentUrl.searchParams.set("dev_type", data.device.mobile ? "mobile" : "desktop");
        updated = true;
      }
      if (updated) {
        // Update Base64 and HS256 JWT
        const paramsObj: Record<string, string> = {};
        currentUrl.searchParams.forEach((val, key) => {
          if (key !== "token" && key !== "jwt" && key !== "b64") {
            paramsObj[key] = val;
          }
        });
        const { b64, jwt } = encodeUrlParamsToJwt(paramsObj, currentUrl.pathname);
        currentUrl.searchParams.set("token", jwt);
        currentUrl.searchParams.set("jwt", jwt);
        currentUrl.searchParams.set("b64", b64);

        const newSearch = currentUrl.searchParams.toString();
        const newUrl = `${currentUrl.pathname}${newSearch ? `?${newSearch}` : ""}${currentUrl.hash}`;
        window.history.replaceState(window.history.state, "", newUrl);
      }
    } catch {
      // ignore sync errors
    }
  }) as EventListener);

  window.addEventListener(
    "click",
    (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (
        target.closest("button") ||
        target.closest("a") ||
        target.closest("[role='button']") ||
        target.closest("input") ||
        target.closest("video")
      ) {
        rotateCsrfToken("interact");
      }
    },
    { passive: true },
  );
}

export function getAuthIndicator(): string {
  if (typeof window === "undefined") return "0";
  try {
    const username = localStorage.getItem("ig.username");
    return username ? "1" : "0";
  } catch {
    return "0";
  }
}

export function getEnrolledIndicator(): string {
  if (typeof window === "undefined") return "0";
  try {
    const enrolled = localStorage.getItem("ig.enrolled_courses");
    if (enrolled) {
      const parsed = JSON.parse(enrolled);
      if (Array.isArray(parsed) && parsed.length > 0) return "1";
    }
    return "0";
  } catch {
    return "0";
  }
}

export function getSurfaceSource(pathname: string): string {
  if (pathname === "/age") return "age_gate";
  if (pathname === "/login") return "auth_portal";
  if (pathname === "/pin") return "pin_vault";
  if (pathname === "/pin-setup") return "pin_setup_flow";
  if (pathname === "/reels") return "feed_stream";
  if (pathname === "/search") return "search_query";
  if (pathname === "/explore") return "discover_grid";
  if (pathname === "/category") return "category_filter";
  if (
    pathname.startsWith("/course") ||
    pathname.startsWith("/english-course") ||
    pathname === "/my-courses"
  )
    return "learning_portal";
  if (pathname === "/profile" || pathname.startsWith("/creator")) return "user_profile";
  if (pathname === "/settings" || pathname.startsWith("/admin")) return "app_settings";
  if (pathname === "/home") return "home_feed";
  if (pathname === "/downloaded") return "offline_vault";
  if (pathname === "/shop") return "merch_shop";
  if (pathname === "/skills") return "skills_lab";
  if (pathname === "/about") return "about_page";
  if (pathname === "/favorites" || pathname === "/saved" || pathname === "/liked")
    return "collection_vault";
  return "app_surface";
}

function cleanRouteName(pathname: string): string {
  const stripped = pathname.replace(/^\//, "").replace(/\//g, "_");
  return stripped || "home";
}

/**
 * Generates an object of tracking search params for a target route.
 * Can be passed directly to TanStack Router Link's `search` prop.
 */
export function getTrackingSearch(
  targetPath = "/home",
  referrerSurface?: string,
): Record<string, string> {
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "home";
  const from = cleanRouteName(currentPath);
  const geo = getCachedViewerCountry();
  const rawParams: Record<string, string> = {
    deviceId: getDeviceId(),
    maid: getDeviceFingerprint(),
    fingerprintId: getDeviceFingerprint(),
    userId: getUserId(),
    user_status: getUserStatus(),
    clientId: getClientId(),
    sessionId: getSessionId(),
    sid: getSessionId(),
    csrf: getCsrfToken(),
    author: "satyamrojhax",
    product_by: "lfrdcatechnologies",
    from,
    ref: referrerSurface || (from === "direct" ? "direct_nav" : `${from}_surface`),
    auth: getAuthIndicator(),
    enrolled: getEnrolledIndicator(),
    t: String(Date.now()),
    src: getSurfaceSource(targetPath),
    v: "1.2.72",
    ...(geo?.geo?.countryCode ? { cc: geo.geo.countryCode } : {}),
    ...(geo?.geo?.city ? { city: geo.geo.city } : {}),
    ...(geo?.geo?.timeZone ? { tz: geo.geo.timeZone } : {}),
    ...(geo?.device ? { dev_type: geo.device.mobile ? "mobile" : "desktop" } : {}),
  };

  const { b64, jwt } = encodeUrlParamsToJwt(rawParams, targetPath);

  return {
    ...rawParams,
    token: jwt,
    jwt: jwt,
    b64: b64,
  };
}

/**
 * Synchronizes extended tracking and contextual query parameters into the URL.
 * Encodes all parameters into Base64 and signs them inside an HS256 JWT token.
 * Preserves all existing route-specific query parameters (such as `q`, `tabs`, `c`, `tab`).
 * Persists tracking tokens into cookies and site data.
 */
export function syncRouteUrl(pathname: string): void {
  if (typeof window === "undefined") return;

  try {
    // Fire viewer country API on navigation
    fetchViewerCountry("navigation").catch(() => {});

    // Ensure tokens are saved in cookies and sitedata
    try {
      setCookie("shortify_author", "satyamrojhax");
      setCookie("shortify_product_by", "lfrdcatechnologies");
      localStorage.setItem("shortify_author", "satyamrojhax");
      localStorage.setItem("shortify_product_by", "lfrdcatechnologies");
      sessionStorage.setItem("shortify_author", "satyamrojhax");
      sessionStorage.setItem("shortify_product_by", "lfrdcatechnologies");
    } catch {
      // ignore
    }

    const currentUrl = new URL(window.location.href);
    const searchParams = currentUrl.searchParams;
    let modified = false;

    // 1. deviceId
    if (!searchParams.has("deviceId")) {
      searchParams.set("deviceId", getDeviceId());
      modified = true;
    }

    // 2. maid & fingerprintId
    if (!searchParams.has("maid")) {
      searchParams.set("maid", getDeviceFingerprint());
      modified = true;
    }
    if (!searchParams.has("fingerprintId")) {
      searchParams.set("fingerprintId", getDeviceFingerprint());
      modified = true;
    }

    // 3. userId & user_status (handles existing vs non-existing)
    if (!searchParams.has("userId")) {
      searchParams.set("userId", getUserId());
      modified = true;
    }
    if (!searchParams.has("user_status")) {
      searchParams.set("user_status", getUserStatus());
      modified = true;
    }

    // 4. clientId
    if (!searchParams.has("clientId")) {
      searchParams.set("clientId", getClientId());
      modified = true;
    }

    // 5. sessionId & sid
    if (!searchParams.has("sessionId")) {
      searchParams.set("sessionId", getSessionId());
      modified = true;
    }
    if (!searchParams.has("sid")) {
      searchParams.set("sid", getSessionId());
      modified = true;
    }

    // 6. csrf token
    if (!searchParams.has("csrf")) {
      searchParams.set("csrf", getCsrfToken());
      modified = true;
    }

    // 7. author & product_by
    if (!searchParams.has("author")) {
      searchParams.set("author", "satyamrojhax");
      modified = true;
    }
    if (!searchParams.has("product_by")) {
      searchParams.set("product_by", "lfrdcatechnologies");
      modified = true;
    }

    // 8. from - where user navigated from
    if (!searchParams.has("from")) {
      searchParams.set("from", previousRouteName);
      modified = true;
    }

    // 9. ref - context referrer surface
    if (!searchParams.has("ref")) {
      searchParams.set(
        "ref",
        previousRouteName === "direct" ? "direct_nav" : `${previousRouteName}_surface`,
      );
      modified = true;
    }

    // 10. auth - authenticated status
    if (!searchParams.has("auth")) {
      searchParams.set("auth", getAuthIndicator());
      modified = true;
    }

    // 11. enrolled - course enrollment status
    if (!searchParams.has("enrolled")) {
      searchParams.set("enrolled", getEnrolledIndicator());
      modified = true;
    }

    // 12. t - navigation epoch timestamp
    if (!searchParams.has("t")) {
      searchParams.set("t", String(Date.now()));
      modified = true;
    }

    // 13. src - surface stream channel
    if (!searchParams.has("src")) {
      searchParams.set("src", getSurfaceSource(pathname));
      modified = true;
    }

    // 14. v - client build release version
    if (!searchParams.has("v")) {
      searchParams.set("v", "1.2.72");
      modified = true;
    }

    // 15. Geo & device information from viewer-country if available
    const geo = getCachedViewerCountry();
    if (geo?.geo) {
      if (geo.geo.countryCode && !searchParams.has("cc")) {
        searchParams.set("cc", geo.geo.countryCode);
        modified = true;
      }
      if (geo.geo.city && !searchParams.has("city")) {
        searchParams.set("city", geo.geo.city);
        modified = true;
      }
      if (geo.geo.timeZone && !searchParams.has("tz")) {
        searchParams.set("tz", geo.geo.timeZone);
        modified = true;
      }
      if (geo.device && !searchParams.has("dev_type")) {
        searchParams.set("dev_type", geo.device.mobile ? "mobile" : "desktop");
        modified = true;
      }
    }

    // 16. Build Base64 encoded URL payload and sign with HS256 JWT
    const paramsObj: Record<string, string> = {};
    searchParams.forEach((val, key) => {
      if (key !== "token" && key !== "jwt" && key !== "b64") {
        paramsObj[key] = val;
      }
    });

    const { b64, jwt } = encodeUrlParamsToJwt(paramsObj, pathname);

    if (searchParams.get("token") !== jwt || searchParams.get("b64") !== b64) {
      searchParams.set("token", jwt);
      searchParams.set("jwt", jwt);
      searchParams.set("b64", b64);
      modified = true;
    }

    // Persist to cookies and sitedata
    try {
      setCookie("shortify_jwt_token", jwt);
      setCookie("shortify_url_b64", b64);
      localStorage.setItem("shortify_jwt_token", jwt);
      localStorage.setItem("shortify_url_b64", b64);
      sessionStorage.setItem("shortify_jwt_token", jwt);
      sessionStorage.setItem("shortify_url_b64", b64);
    } catch {
      // ignore
    }

    if (modified) {
      const newSearch = searchParams.toString();
      const newUrl = `${currentUrl.pathname}${newSearch ? `?${newSearch}` : ""}${currentUrl.hash}`;
      window.history.replaceState(window.history.state, "", newUrl);
    }

    // Record this route as previousRouteName for the subsequent navigation
    previousRouteName = cleanRouteName(pathname);
  } catch (err) {
    console.error("Failed to sync URL parameters:", err);
  }
}

export { decodeHs256Jwt };
