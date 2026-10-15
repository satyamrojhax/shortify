/**
 * Viewer Country & Device Geolocation Service
 * Calls https://randomchat.now/__viewer-country on user actions to track location & device type.
 * Persists all values in cookies, localStorage, and sessionStorage (Site Data).
 */

export interface ViewerGeo {
  countryCode: string;
  countryName: string;
  city: string;
  postalCode: string;
  timeZone: string;
  latitude: number;
  longitude: number;
  metroCode: string | null;
  asn: number;
}

export interface ViewerDevice {
  mobile: boolean;
  desktop: boolean;
  tablet: boolean;
  smartTv: boolean;
  android: boolean;
  ios: boolean;
}

export interface ViewerCountryResponse {
  geo: ViewerGeo;
  device: ViewerDevice;
}

const STORAGE_KEY = "shortify_viewer_country";
let cachedData: ViewerCountryResponse | null = null;
let inFlightRequest: Promise<ViewerCountryResponse | null> | null = null;
let lastRequestTime = 0;

export function setCookie(name: string, value: string, days = 365): void {
  if (typeof document === "undefined") return;
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch {
    // ignore cookie errors
  }
}

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  try {
    const nameEQ = encodeURIComponent(name) + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  } catch {
    // ignore cookie read errors
  }
  return null;
}

export function saveViewerCountryToSiteDataAndCookies(data: ViewerCountryResponse): void {
  if (typeof window === "undefined" || !data) return;
  const serialized = JSON.stringify(data);

  // 1. Site Data - localStorage
  try {
    localStorage.setItem(STORAGE_KEY, serialized);
    if (data.geo) {
      if (data.geo.countryCode) localStorage.setItem("shortify_geo_cc", data.geo.countryCode);
      if (data.geo.city) localStorage.setItem("shortify_geo_city", data.geo.city);
      if (data.geo.timeZone) localStorage.setItem("shortify_geo_tz", data.geo.timeZone);
      if (data.geo.countryName) localStorage.setItem("shortify_geo_country", data.geo.countryName);
    }
    if (data.device) {
      localStorage.setItem("shortify_dev_type", data.device.mobile ? "mobile" : "desktop");
    }
  } catch {
    // ignore storage quota
  }

  // 2. Site Data - sessionStorage
  try {
    sessionStorage.setItem(STORAGE_KEY, serialized);
    if (data.geo?.countryCode) sessionStorage.setItem("shortify_geo_cc", data.geo.countryCode);
    if (data.geo?.city) sessionStorage.setItem("shortify_geo_city", data.geo.city);
  } catch {
    // ignore storage quota
  }

  // 3. Cookies
  try {
    setCookie(STORAGE_KEY, serialized);
    if (data.geo) {
      if (data.geo.countryCode) setCookie("shortify_geo_cc", data.geo.countryCode);
      if (data.geo.city) setCookie("shortify_geo_city", data.geo.city);
      if (data.geo.timeZone) setCookie("shortify_geo_tz", data.geo.timeZone);
    }
    if (data.device) {
      setCookie("shortify_dev_type", data.device.mobile ? "mobile" : "desktop");
    }
  } catch {
    // ignore cookie write errors
  }
}

export function getCachedViewerCountry(): ViewerCountryResponse | null {
  if (cachedData) return cachedData;
  if (typeof window === "undefined") return null;

  // Check localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      cachedData = JSON.parse(raw);
      return cachedData;
    }
  } catch {
    // ignore
  }

  // Check sessionStorage
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      cachedData = JSON.parse(raw);
      return cachedData;
    }
  } catch {
    // ignore
  }

  // Check cookies
  try {
    const raw = getCookie(STORAGE_KEY);
    if (raw) {
      cachedData = JSON.parse(raw);
      return cachedData;
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Calls the viewer-country API for actions performed by the user.
 * Supports proxied /__viewer-country and direct endpoint with graceful fallbacks.
 * Persists response to cookies and site data.
 */
export async function fetchViewerCountry(
  actionName?: string,
): Promise<ViewerCountryResponse | null> {
  if (typeof window === "undefined") return null;

  const now = Date.now();
  // If request is currently in-flight, return the active promise
  if (inFlightRequest) return inFlightRequest;

  // If we already have geo data cached recently (within 5 minutes), reuse it
  if (cachedData && now - lastRequestTime < 5 * 60 * 1000) {
    return cachedData;
  }
  lastRequestTime = now;

  inFlightRequest = (async () => {
    const urls = ["https://randomchat.now/__viewer-country", "/__viewer-country"];

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            accept: "application/json",
            "cache-control": "no-cache",
            pragma: "no-cache",
          },
        });

        if (response.ok) {
          const data = (await response.json()) as ViewerCountryResponse;
          if (data && data.geo) {
            cachedData = data;
            saveViewerCountryToSiteDataAndCookies(data);
            window.dispatchEvent(
              new CustomEvent("viewer-country-update", {
                detail: { data, action: actionName },
              }),
            );
            return data;
          }
        }
      } catch {
        // Continue to fallback url
      }
    }

    // Direct ping fallback if response reading was blocked by CORS
    try {
      await fetch("https://randomchat.now/__viewer-country", {
        method: "GET",
        mode: "no-cors",
      });
    } catch {
      // ignore
    }

    return cachedData;
  })().finally(() => {
    inFlightRequest = null;
  });

  return inFlightRequest;
}
