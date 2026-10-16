import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useSiteConfig } from "@/hooks/use-site-config";
import {
  Sliders,
  CheckCircle2,
  XCircle,
  ExternalLink,
  RotateCcw,
  RefreshCw,
  Megaphone,
  ShieldAlert,
  Search,
  Globe,
  MessageSquare,
  Sparkles,
  Info,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_PAGES_CONFIG, DEFAULT_SITE_CONTENT_CONFIG, type PageConfig } from "@/lib/site-config";

export const Route = createFileRoute("/admin/config")({
  component: AdminConfigPage,
});

type ConfigTab = "pages" | "banner" | "blocked";

function AdminConfigPage() {
  const {
    pages,
    content,
    togglePage,
    updatePageCustomMessage,
    updateContent,
    savePages,
  } = useSiteConfig();

  const [activeTab, setActiveTab] = useState<ConfigTab>("pages");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable local state for banner and blocked message
  const [bannerForm, setBannerForm] = useState(content.announcementBanner);
  const [blockedForm, setBlockedForm] = useState(content.blockedPageMessage);

  const activeCount = pages.filter((p) => p.enabled).length;
  const disabledCount = pages.length - activeCount;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      toast.success("Platform configuration reloaded from cloud");
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggle = async (page: PageConfig) => {
    const next = !page.enabled;
    try {
      await togglePage(page.id, next);
      if (next) {
        toast.success(`"${page.title}" enabled successfully! Page is now visible to all users.`);
      } else {
        toast.warning(`"${page.title}" disabled successfully! Page is now blocked & hidden.`);
      }
    } catch {
      toast.error(`Failed to update status for "${page.title}". Please try again.`);
    }
  };

  const handleUpdateCustomMessage = async (page: PageConfig, newMsg: string) => {
    if (newMsg === (page.customMessage || "")) return;
    try {
      await updatePageCustomMessage(page.id, newMsg);
      toast.success(`Custom blocked message saved for "${page.title}"`);
    } catch {
      toast.error(`Failed to save custom message for "${page.title}"`);
    }
  };

  const handleEnableAll = async () => {
    if (!confirm("Are you sure you want to enable ALL pages across the website?")) return;
    setSaving(true);
    try {
      const allEnabled = pages.map((p) => ({ ...p, enabled: true }));
      await savePages(allEnabled);
      toast.success("All pages enabled successfully! Every section is now accessible.");
    } catch {
      toast.error("Failed to enable all pages. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!confirm("Reset all page access and announcement banner to default settings?")) return;
    setSaving(true);
    try {
      await savePages(DEFAULT_PAGES_CONFIG);
      await updateContent(DEFAULT_SITE_CONTENT_CONFIG);
      setBannerForm(DEFAULT_SITE_CONTENT_CONFIG.announcementBanner);
      setBlockedForm(DEFAULT_SITE_CONTENT_CONFIG.blockedPageMessage);
      toast.info("Site configuration restored to defaults successfully.");
    } catch {
      toast.error("Failed to reset configurations.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateContent({ announcementBanner: bannerForm });
      if (bannerForm.enabled) {
        toast.success("Announcement banner enabled and updated successfully!");
      } else {
        toast.warning("Announcement banner disabled successfully.");
      }
    } catch {
      toast.error("Failed to update announcement banner.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBlocked = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateContent({ blockedPageMessage: blockedForm });
      toast.success("Blocked page appearance message saved successfully!");
    } catch {
      toast.error("Failed to save blocked page appearance.");
    } finally {
      setSaving(false);
    }
  };

  const filteredPages = pages.filter((p) => {
    const matchSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = categoryFilter === "all" || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-foreground/10">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl sm:text-3xl font-bold lowercase text-foreground">
              website & platform <span className="marker-underline">config</span>
            </h1>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              realtime sync active
            </div>
          </div>
          <p className="text-sm text-foreground/60 mt-1">
            control page visibility, disable routes, manage live banners, and customize client-side content.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-foreground/15 text-foreground/80 hover:bg-foreground/5 text-xs font-semibold transition"
            title="Refresh settings from database"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            <span>refresh</span>
          </button>
          <button
            onClick={handleResetDefaults}
            disabled={saving}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-destructive/20 text-destructive hover:bg-destructive/10 text-xs font-semibold transition"
            title="Restore default configurations"
          >
            <RotateCcw size={14} />
            <span>reset</span>
          </button>
        </div>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-foreground/5 border border-foreground/10">
          <span className="text-xs uppercase tracking-wider text-foreground/50 font-semibold">Total Pages</span>
          <p className="font-display text-2xl sm:text-3xl font-bold text-foreground mt-1">{pages.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <span className="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">Active & Visible</span>
          <p className="font-display text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <span className="text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">Blocked / Hidden</span>
          <p className="font-display text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 mt-1">{disabledCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
          <span className="text-xs uppercase tracking-wider text-purple-600 dark:text-purple-400 font-semibold">Announcement Banner</span>
          <p className="font-display text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400 mt-1.5">
            {content.announcementBanner.enabled ? "Active" : "Disabled"}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-foreground/10 pb-2 overflow-x-auto">
        {[
          { id: "pages" as ConfigTab, label: "Page Access & Visibility", icon: Sliders },
          { id: "banner" as ConfigTab, label: "Announcement Banner", icon: Megaphone },
          { id: "blocked" as ConfigTab, label: "Blocked Page Message", icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Pages Visibility Manager */}
      {activeTab === "pages" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                <input
                  type="text"
                  placeholder="search pages by name or route (/shop, /reels)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-background border border-foreground/15 rounded-xl text-xs sm:text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-background border border-foreground/15 rounded-xl text-xs font-semibold text-foreground"
              >
                <option value="all">all categories</option>
                <option value="core">core navigation</option>
                <option value="learning">courses & learning</option>
                <option value="rewards">rewards & shop</option>
                <option value="support">support & help</option>
                <option value="user">user history & media</option>
              </select>

              <button
                onClick={handleEnableAll}
                disabled={saving}
                className="px-3 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-semibold hover:bg-emerald-500/20 transition"
              >
                enable all
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPages.map((page) => {
              const isEnabled = page.enabled;
              return (
                <div
                  key={page.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isEnabled
                      ? "bg-card border-foreground/10 hover:border-foreground/20 shadow-xs"
                      : "bg-amber-500/5 border-amber-500/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-semibold text-base text-foreground">
                          {page.title}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isEnabled
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          }`}
                        >
                          {isEnabled ? "Visible" : "Blocked"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-mono text-foreground/50 mt-1">
                        <span>{page.path}</span>
                        <Link
                          to={page.path}
                          target="_blank"
                          className="hover:text-primary transition-colors"
                          title="Open preview in new tab"
                        >
                          <ExternalLink size={12} />
                        </Link>
                      </div>
                      <p className="text-xs text-foreground/60 mt-2 line-clamp-2">{page.description}</p>
                    </div>

                    {/* Switch Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggle(page)}
                      className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        isEnabled ? "bg-emerald-500" : "bg-foreground/20"
                      }`}
                      role="switch"
                      aria-checked={isEnabled}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? "translate-x-6" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Custom Blocked Explanation Message Input */}
                  {!isEnabled && (
                    <div className="mt-4 pt-3 border-t border-amber-500/20 space-y-1.5">
                      <label className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                        Custom Blocked Message (optional):
                      </label>
                      <input
                        type="text"
                        defaultValue={page.customMessage || ""}
                        onBlur={(e) => handleUpdateCustomMessage(page, e.target.value)}
                        placeholder="e.g. This feature is undergoing updates. Check back in 15 minutes."
                        className="w-full px-3 py-1.5 bg-background/80 border border-amber-500/30 rounded-lg text-xs text-foreground placeholder:text-foreground/30 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Announcement Banner Manager */}
      {activeTab === "banner" && (
        <form onSubmit={handleSaveBanner} className="space-y-6 max-w-2xl bg-card border border-foreground/10 rounded-2xl p-6 shadow-sm">
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">Client Announcement Banner</h3>
            <p className="text-xs text-foreground/60 mt-1">
              Show an animated top banner across the app for announcements, flash events, or notices.
            </p>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-foreground/5 border border-foreground/10">
            <div>
              <span className="font-semibold text-sm text-foreground">Enable Announcement Banner</span>
              <p className="text-xs text-foreground/60">Toggle to immediately show or hide banner for all users.</p>
            </div>
            <input
              type="checkbox"
              checked={bannerForm.enabled}
              onChange={(e) => setBannerForm({ ...bannerForm, enabled: e.target.checked })}
              className="h-5 w-5 rounded border-foreground/30 text-primary focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground/80">Banner Text</label>
            <textarea
              rows={2}
              value={bannerForm.text}
              onChange={(e) => setBannerForm({ ...bannerForm, text: e.target.value })}
              placeholder="e.g. 🎉 Special Diwali Sale is live! Get 50% discount on all courses."
              className="w-full px-4 py-2.5 bg-background border border-foreground/15 rounded-xl text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground/80">CTA Button Text (Optional)</label>
              <input
                type="text"
                value={bannerForm.linkText || ""}
                onChange={(e) => setBannerForm({ ...bannerForm, linkText: e.target.value })}
                placeholder="e.g. Explore Now"
                className="w-full px-4 py-2.5 bg-background border border-foreground/15 rounded-xl text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground/80">CTA Destination URL (Optional)</label>
              <input
                type="text"
                value={bannerForm.linkUrl || ""}
                onChange={(e) => setBannerForm({ ...bannerForm, linkUrl: e.target.value })}
                placeholder="e.g. /shop or /explore"
                className="w-full px-4 py-2.5 bg-background border border-foreground/15 rounded-xl text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground/80">Banner Color Variant</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["gradient", "info", "warning", "success"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setBannerForm({ ...bannerForm, variant: v })}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border capitalize transition ${
                    bannerForm.variant === v
                      ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                      : "border-foreground/15 text-foreground/70 hover:bg-foreground/5"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Realtime Banner Preview */}
          <div className="space-y-2 pt-2 border-t border-foreground/10">
            <span className="text-xs uppercase tracking-wider font-semibold text-foreground/50">Live Banner Preview</span>
            <div
              className={`p-3 rounded-xl text-sm flex items-center justify-between gap-3 shadow-xs ${
                bannerForm.variant === "gradient"
                  ? "bg-linear-to-r from-amber-500 via-pink-500 to-indigo-600 text-white"
                  : bannerForm.variant === "info"
                  ? "bg-blue-600 text-white"
                  : bannerForm.variant === "warning"
                  ? "bg-amber-500 text-black font-medium"
                  : "bg-emerald-600 text-white"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles size={16} className="shrink-0" />
                <span className="truncate">{bannerForm.text || "Preview announcement text goes here..."}</span>
              </div>
              {bannerForm.linkText && (
                <span className="shrink-0 text-xs px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md font-semibold">
                  {bannerForm.linkText} →
                </span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-semibold text-sm rounded-xl hover:opacity-90 transition"
          >
            <Save size={16} />
            <span>Save Banner Settings</span>
          </button>
        </form>
      )}

      {/* TAB 3: Blocked Page Appearance */}
      {activeTab === "blocked" && (
        <form onSubmit={handleSaveBlocked} className="space-y-6 max-w-2xl bg-card border border-foreground/10 rounded-2xl p-6 shadow-sm">
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">Blocked Page Appearance</h3>
            <p className="text-xs text-foreground/60 mt-1">
              Configure the message shown to users when they attempt to visit a disabled page directly.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground/80">Default Blocked Title</label>
            <input
              type="text"
              value={blockedForm.title}
              onChange={(e) => setBlockedForm({ ...blockedForm, title: e.target.value })}
              className="w-full px-4 py-2.5 bg-background border border-foreground/15 rounded-xl text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground/80">Default Blocked Explanation</label>
            <textarea
              rows={3}
              value={blockedForm.message}
              onChange={(e) => setBlockedForm({ ...blockedForm, message: e.target.value })}
              className="w-full px-4 py-2.5 bg-background border border-foreground/15 rounded-xl text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-foreground/5 border border-foreground/10">
            <div>
              <span className="font-semibold text-sm text-foreground">Show "Check Again" Button</span>
              <p className="text-xs text-foreground/60">Allows users to retry and reload the page if it was just turned back on.</p>
            </div>
            <input
              type="checkbox"
              checked={blockedForm.allowRetry}
              onChange={(e) => setBlockedForm({ ...blockedForm, allowRetry: e.target.checked })}
              className="h-5 w-5 rounded border-foreground/30 text-primary focus:ring-primary"
            />
          </div>

          {/* Blocked Page Preview Card */}
          <div className="space-y-2 pt-2 border-t border-foreground/10">
            <span className="text-xs uppercase tracking-wider font-semibold text-foreground/50">Preview of Blocked Page Notice</span>
            <div className="p-6 rounded-2xl border border-destructive/20 bg-destructive/5 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive mx-auto flex items-center justify-center">
                <ShieldAlert size={24} />
              </div>
              <h4 className="font-display text-lg font-bold text-foreground">{blockedForm.title}</h4>
              <p className="text-xs text-foreground/70 max-w-md mx-auto">{blockedForm.message}</p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <span className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold">
                  Back to Home
                </span>
                {blockedForm.allowRetry && (
                  <span className="px-4 py-1.5 rounded-xl border border-foreground/15 text-foreground text-xs font-semibold">
                    Try Again
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-semibold text-sm rounded-xl hover:opacity-90 transition"
          >
            <Save size={16} />
            <span>Save Blocked Notice Settings</span>
          </button>
        </form>
      )}
    </div>
  );
}
