import { useState, useEffect } from "react";
import {
  getSitePagesConfig,
  getSiteContentConfig,
  subscribeSiteConfig,
  initSiteConfig,
  isRouteEnabled,
  getBlockedMessageForRoute,
  saveSitePagesConfig,
  saveSiteContentConfig,
  type PageConfig,
  type SiteContentConfig,
} from "@/lib/site-config";

export function useSiteConfig() {
  const [pages, setPages] = useState<PageConfig[]>(getSitePagesConfig);
  const [content, setContent] = useState<SiteContentConfig>(getSiteContentConfig);

  useEffect(() => {
    initSiteConfig();
    const unsubscribe = subscribeSiteConfig(() => {
      setPages([...getSitePagesConfig()]);
      setContent({ ...getSiteContentConfig() });
    });
    return unsubscribe;
  }, []);

  const togglePage = async (pageId: string, enabled: boolean) => {
    const updated = pages.map((p) => (p.id === pageId ? { ...p, enabled } : p));
    setPages(updated);
    await saveSitePagesConfig(updated);
  };

  const updatePageCustomMessage = async (pageId: string, customMessage: string) => {
    const updated = pages.map((p) => (p.id === pageId ? { ...p, customMessage } : p));
    setPages(updated);
    await saveSitePagesConfig(updated);
  };

  const updateContent = async (newContent: Partial<SiteContentConfig>) => {
    const merged = { ...content, ...newContent };
    setContent(merged);
    await saveSiteContentConfig(merged);
  };

  const checkRoute = (path: string) => isRouteEnabled(path);

  return {
    pages,
    content,
    isRouteEnabled: checkRoute,
    getBlockedMessage: getBlockedMessageForRoute,
    togglePage,
    updatePageCustomMessage,
    updateContent,
    savePages: saveSitePagesConfig,
    saveContent: saveSiteContentConfig,
  };
}
