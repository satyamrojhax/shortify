import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  Check,
  CloudDownload,
  Database,
  Download,
  Eye,
  Film,
  Gauge,
  HardDrive,
  Heart,
  Info,
  Pause,
  Play,
  Search,
  Shuffle,
  Timer,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { getLocalCatalog, type Reel } from "@/lib/reels";
import {
  clearOfflineVideos,
  deleteOfflineVideos,
  formatBytes,
  getOfflineBlob,
  type OfflineMeta,
} from "@/lib/offline-store";
import {
  cancelDownload,
  dismissDownload,
  pauseDownload,
  resumeDownload,
  startDownload,
} from "@/lib/offline-downloader";
import { warmAppShell } from "@/lib/pwa-shell";
import {
  useDownloadState,
  useOfflineLibrary,
  useOnline,
  useStorageEstimate,
} from "@/hooks/use-offline";
import { OfflinePlayer } from "@/components/offline-player";

type Tab = "download" | "library";
type DownloadedSearch = { tab?: Tab };

export const Route = createFileRoute("/_app/downloaded")({
  validateSearch: (s: Record<string, unknown>): DownloadedSearch => ({
    tab: s.tab === "library" || s.tab === "download" ? s.tab : undefined,
  }),
  component: DownloadedPage,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const nf = new Intl.NumberFormat("en-US");

function compact(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function formatEta(seconds: number | null) {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}

function fileName(url: string) {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() || url);
  } catch {
    return url;
  }
}

type SortKey = "newest" | "oldest" | "number" | "largest" | "views" | "likes";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Recently downloaded" },
  { key: "oldest", label: "Oldest first" },
  { key: "number", label: "Reel number" },
  { key: "largest", label: "Largest file" },
  { key: "views", label: "Most viewed" },
  { key: "likes", label: "Most liked" },
];

function sortItems(items: OfflineMeta[], key: SortKey): OfflineMeta[] {
  const a = items.slice();
  switch (key) {
    case "newest":
      return a.sort((x, y) => y.downloadedAt - x.downloadedAt || x.index - y.index);
    case "oldest":
      return a.sort((x, y) => x.downloadedAt - y.downloadedAt || x.index - y.index);
    case "number":
      return a.sort((x, y) => x.index - y.index);
    case "largest":
      return a.sort((x, y) => y.size - x.size);
    case "views":
      return a.sort((x, y) => (y.views ?? 0) - (x.views ?? 0));
    case "likes":
      return a.sort((x, y) => (y.likes ?? 0) - (x.likes ?? 0));
  }
}

function shuffled<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function DownloadedPage() {
  const { tab: tabParam } = Route.useSearch();
  const navigate = Route.useNavigate();
  const tab: Tab = tabParam ?? "download";
  const setTab = (t: Tab) => navigate({ search: { tab: t }, replace: true });

  const online = useOnline();
  const dl = useDownloadState();
  const { items, loaded, error: libError } = useOfflineLibrary();

  const [catalog, setCatalog] = useState<Reel[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [player, setPlayer] = useState<{ items: OfflineMeta[]; start: number } | null>(null);
  const [shellReady, setShellReady] = useState(false);

  const loadCatalog = () => {
    setCatalogError(null);
    getLocalCatalog()
      .then(setCatalog)
      .catch((e: unknown) =>
        setCatalogError(
          e instanceof Error ? e.message : "Could not load the reels database.",
        ),
      );
  };

  useEffect(() => {
    loadCatalog();
    void warmAppShell().then(setShellReady);
  }, []);

  // Re-try the catalog automatically once we're back online
  useEffect(() => {
    if (online && !catalog && catalogError) loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  const usedBytes = useMemo(() => items.reduce((n, m) => n + m.size, 0), [items]);
  const downloadedSet = useMemo(() => new Set(items.map((m) => m.url)), [items]);
  const pending = useMemo(
    () => (catalog ? catalog.filter((r) => !downloadedSet.has(r.videoUrl)) : []),
    [catalog, downloadedSet],
  );
  const avgSize = items.length > 0 ? usedBytes / items.length : 1_000_000;
  const totalCount = catalog?.length ?? null;
  const percent = totalCount ? Math.min(100, (items.length / totalCount) * 100) : 0;

  const estimate = useStorageEstimate(Math.floor(items.length / 5) + (dl.status === "idle" ? 0 : 1));
  const freeBytes = estimate ? Math.max(0, estimate.quota - estimate.usage) : null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-5 md:px-8 md:py-10">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cobalt-pop via-[#6a3df0] to-magenta-haze p-6 text-white shadow-xl md:p-10 border border-white/10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/20 blur-3xl transition-transform duration-1000 hover:scale-110" />
        <div className="pointer-events-none absolute -bottom-24 left-1/4 h-56 w-56 rounded-full bg-black/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm border ${
                  online ? "bg-white/20 border-white/10 text-white" : "bg-amber-400/90 border-amber-300/50 text-amber-900"
                }`}
              >
                {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                {online ? "Online" : "Offline · playing from device"}
              </span>
              {shellReady && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 border border-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm">
                  <Check className="h-3.5 w-3.5" /> App ready offline
                </span>
              )}
            </div>
            <h1 className="mt-4 text-4xl font-black tracking-tight leading-none !text-white md:text-5xl lg:text-6xl drop-shadow-md">
              Downloads
            </h1>
            <p className="mt-3 max-w-md text-sm font-medium text-white/90 md:text-base leading-relaxed">
              Save reels inside the app and watch them anywhere — no internet, nothing added to
              your gallery.
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex items-end gap-6 md:text-right">
            <div className="rounded-2xl bg-black/20 p-5 backdrop-blur-md border border-white/10 shadow-inner">
              <div className="text-5xl font-black tabular-nums tracking-tighter md:text-6xl drop-shadow-md">
                {nf.format(items.length)}
              </div>
              <div className="mt-1 text-xs font-bold uppercase tracking-widest text-white/80">
                saved offline
              </div>
            </div>
          </div>
        </div>

        {/* Overall progress */}
        <div className="relative mt-8 rounded-2xl bg-black/10 p-4 backdrop-blur-sm border border-white/5">
          <div className="mb-2 flex justify-between text-xs font-bold uppercase tracking-wider text-white/90">
            <span>
              {totalCount != null
                ? `${nf.format(items.length)} of ${nf.format(totalCount)} reels`
                : "Library"}
            </span>
            <span className="tabular-nums">{totalCount != null ? `${percent.toFixed(1)}%` : ""}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-black/40 shadow-inner">
            <div
              className="relative h-full rounded-full bg-gradient-to-r from-white/80 to-white transition-[width] duration-700 ease-out shadow-[0_0_10px_rgba(255,255,255,0.5)]"
              style={{ width: `${percent}%` }}
            >
              <div className="absolute inset-0 bg-white/20 shimmer-effect" />
            </div>
          </div>
        </div>
      </header>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <section
        aria-label="Library statistics"
        className="mt-4 grid grid-cols-1 gap-3 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-4"
      >
        <StatTile
          icon={<Database className="h-5 w-5" />}
          label="Reels in local DB"
          value={totalCount != null ? nf.format(totalCount) : "—"}
          hint={totalCount != null ? "available to download" : catalogError ? "needs internet" : "loading…"}
          tone="indigo"
        />
        <StatTile
          icon={<Check className="h-5 w-5" />}
          label="Downloaded"
          value={nf.format(items.length)}
          hint={totalCount ? `${percent.toFixed(1)}% of library` : "on this device"}
          tone="emerald"
        />
        <StatTile
          icon={<CloudDownload className="h-5 w-5" />}
          label="Remaining"
          value={catalog ? nf.format(pending.length) : "—"}
          hint={catalog ? (pending.length === 0 ? "all saved 🎉" : "not downloaded yet") : "—"}
          tone="amber"
        />
        <StatTile
          icon={<HardDrive className="h-5 w-5" />}
          label="Storage used"
          value={formatBytes(usedBytes)}
          hint={freeBytes != null ? `${formatBytes(freeBytes)} free on device` : "in browser storage"}
          tone="rose"
        />
      </section>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="mt-8 flex justify-center w-full">
        <div
          role="tablist"
          aria-label="Downloads sections"
          className="flex w-full max-w-md gap-1.5 rounded-full border border-border/10 bg-card/60 p-1.5 shadow-sm backdrop-blur-md dark:bg-card/40"
        >
          <TabButton
          active={tab === "download"}
          onClick={() => setTab("download")}
          icon={<Download className="h-4 w-4 shrink-0" />}
          label="Mass download"
        />
        <TabButton
          active={tab === "library"}
          onClick={() => setTab("library")}
          icon={<Film className="h-4 w-4 shrink-0" />}
          label="My downloads"
          count={items.length}
        />
        </div>
      </div>

      <div className="mt-5">
        {tab === "download" ? (
          <DownloadTab
            online={online}
            catalog={catalog}
            catalogError={catalogError}
            retryCatalog={loadCatalog}
            pendingCount={pending.length}
            pending={pending}
            avgSize={avgSize}
            freeBytes={freeBytes}
            dl={dl}
            onOpenLibrary={() => setTab("library")}
          />
        ) : (
          <LibraryTab
            items={items}
            loaded={loaded}
            error={libError}
            onPlay={(list, start) => setPlayer({ items: list, start })}
            goDownload={() => setTab("download")}
          />
        )}
      </div>

      {player && (
        <OfflinePlayer
          items={player.items}
          startIndex={player.start}
          onClose={() => setPlayer(null)}
        />
      )}
    </div>
  );
}

// ─── Small UI pieces ──────────────────────────────────────────────────────────

const TONES = {
  indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
} as const;

function StatTile(props: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: keyof typeof TONES;
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-border/10 bg-card p-5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-cobalt-pop/30 dark:bg-card/50 dark:backdrop-blur-sm">
      <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-gradient-to-br from-transparent to-black/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100 dark:to-white/5" />
      <div className={`relative flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-110 ${TONES[props.tone]}`}>
        {props.icon}
      </div>
      <div className="relative mt-5 text-3xl font-black tabular-nums tracking-tight text-foreground md:text-4xl lg:text-[40px]">
        {props.value}
      </div>
      <div className="relative mt-2 text-xs font-bold uppercase tracking-wider text-foreground/70">{props.label}</div>
      <div className="relative mt-1 truncate text-[12px] font-medium text-muted-foreground">{props.hint}</div>
    </div>
  );
}

function TabButton(props: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button
      role="tab"
      aria-selected={props.active}
      onClick={props.onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold transition-all duration-300 ${
        props.active
          ? "bg-gradient-to-r from-cobalt-pop to-magenta-haze text-white shadow-md scale-[1.02]"
          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
      }`}
    >
      {props.icon}
      <span>{props.label}</span>
      {props.count != null && (
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] tabular-nums transition-colors duration-300 ${
            props.active ? "bg-white/20 text-white" : "bg-foreground/10 text-foreground"
          }`}
        >
          {nf.format(props.count)}
        </span>
      )}
    </button>
  );
}

function ProgressBar({ value, tone = "bg-cobalt-pop" }: { value: number; tone?: string }) {
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${tone}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

// ─── Tab 1 · Mass download ────────────────────────────────────────────────────

type DownloadTabProps = {
  online: boolean;
  catalog: Reel[] | null;
  catalogError: string | null;
  retryCatalog: () => void;
  pending: Reel[];
  pendingCount: number;
  avgSize: number;
  freeBytes: number | null;
  dl: ReturnType<typeof useDownloadState>;
  onOpenLibrary: () => void;
};

type Choice = "100" | "500" | "all" | "custom";

function DownloadTab({
  online,
  catalog,
  catalogError,
  retryCatalog,
  pending,
  pendingCount,
  avgSize,
  freeBytes,
  dl,
  onOpenLibrary,
}: DownloadTabProps) {
  const [choice, setChoice] = useState<Choice>("100");
  const [custom, setCustom] = useState("250");

  const busy = dl.status === "running" || dl.status === "paused";

  const requested =
    choice === "all"
      ? pendingCount
      : choice === "custom"
        ? Math.max(0, Math.floor(Number(custom) || 0))
        : Number(choice);
  const count = Math.min(requested, pendingCount);
  const estBytes = count * avgSize;
  const notEnoughSpace = freeBytes != null && estBytes > freeBytes * 0.95;

  const canStart = !busy && count > 0 && online && !!catalog;

  const start = () => {
    if (!canStart) return;
    dismissDownload();
    startDownload(pending.slice(0, count));
  };

  const doneCount = dl.completed + dl.failed;
  const pct = dl.total > 0 ? (doneCount / dl.total) * 100 : 0;
  const remainingInBatch = Math.max(0, dl.total - doneCount);

  return (
    <div className="space-y-4">
      {/* Picker */}
      <section className="rounded-3xl border border-border/10 bg-card/60 backdrop-blur-md p-6 shadow-sm md:p-8 transition-all hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">How many reels?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {catalog
                ? pendingCount > 0
                  ? `${nf.format(pendingCount)} reels from the local database are not on your device yet.`
                  : "Every reel in the local database is already saved on this device."
                : catalogError
                  ? "Couldn't load the reels database."
                  : "Loading the reels database…"}
            </p>
          </div>
        </div>

        {catalogError && !catalog && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
              {online
                ? catalogError
                : "You're offline. Connect to the internet once to load the database."}
            </span>
            <button onClick={retryCatalog} className="btn-pill !px-4 !py-1.5 !text-xs">
              Retry
            </button>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              ["100", "100", "reels"],
              ["500", "500", "reels"],
              ["all", nf.format(pendingCount), "all remaining"],
              ["custom", "Custom", "your number"],
            ] as [Choice, string, string][]
          ).map(([key, big, small]) => {
            const selected = choice === key;
            return (
              <button
                key={key}
                disabled={busy}
                onClick={() => setChoice(key)}
                aria-pressed={selected}
                className={`rounded-2xl border-2 px-3 py-3 text-left transition disabled:opacity-50 ${
                  selected
                    ? "border-cobalt-pop bg-cobalt-pop/10 shadow-sm"
                    : "border-border/15 hover:border-cobalt-pop/50 hover:bg-muted"
                }`}
              >
                <div className="text-xl font-bold tabular-nums text-foreground">{big}</div>
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {small}
                </div>
              </button>
            );
          })}
        </div>

        {choice === "custom" && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label htmlFor="custom-count" className="text-sm font-medium text-foreground">
              Number of reels
            </label>
            <input
              id="custom-count"
              type="number"
              inputMode="numeric"
              min={1}
              max={pendingCount}
              disabled={busy}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              className="w-32 rounded-xl border border-border/30 bg-background px-3 py-2 text-base font-semibold tabular-nums text-foreground outline-none focus:border-cobalt-pop focus:ring-2 focus:ring-cobalt-pop/30 disabled:opacity-50"
            />
            <button
              disabled={busy || pendingCount === 0}
              onClick={() => setCustom(String(pendingCount))}
              className="text-xs font-semibold text-cobalt-pop underline-offset-2 hover:underline disabled:opacity-50 dark:text-periwinkle-sky"
            >
              max ({nf.format(pendingCount)})
            </button>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <div className="font-semibold text-foreground">
              {count > 0 ? (
                <>
                  {nf.format(count)} reel{count === 1 ? "" : "s"} · ≈ {formatBytes(estBytes)}
                </>
              ) : (
                "Nothing to download"
              )}
            </div>
            {requested > pendingCount && pendingCount > 0 && (
              <div className="text-xs text-muted-foreground">
                Only {nf.format(pendingCount)} left — capped to what's remaining.
              </div>
            )}
            {notEnoughSpace && (
              <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5" />
                May not fit — only {formatBytes(freeBytes ?? 0)} free on this device.
              </div>
            )}
            {!online && (
              <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-300">
                <WifiOff className="h-3.5 w-3.5" /> Connect to the internet to download.
              </div>
            )}
          </div>
          <button
            onClick={start}
            disabled={!canStart}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-cobalt-pop px-6 py-3 text-sm font-bold text-white shadow-md transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            <Download className="h-4 w-4" />
            {busy ? "Download in progress" : count > 0 ? `Download ${nf.format(count)}` : "Download"}
          </button>
        </div>
      </section>

      {/* Live progress / result */}
      {dl.status !== "idle" && (
        <section
          aria-live="polite"
          className="rounded-3xl border border-border/15 bg-card p-5 md:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  dl.status === "done"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                    : dl.status === "error"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-cobalt-pop/15 text-cobalt-pop dark:text-periwinkle-sky"
                }`}
              >
                {dl.status === "done" ? (
                  <Check className="h-5 w-5" />
                ) : dl.status === "error" ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : dl.status === "paused" ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Download className="h-5 w-5 animate-bounce" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold leading-tight text-foreground">
                  {dl.status === "running" && "Downloading…"}
                  {dl.status === "paused" && "Paused"}
                  {dl.status === "done" && "Download complete"}
                  {dl.status === "error" && "Download stopped"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {nf.format(doneCount)} of {nf.format(dl.total)} reels
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {dl.status === "running" && (
                <button onClick={() => pauseDownload()} className="btn-pill !px-4 !py-2">
                  <Pause className="h-4 w-4" /> Pause
                </button>
              )}
              {dl.status === "paused" && (
                <button
                  onClick={resumeDownload}
                  className="inline-flex items-center gap-2 rounded-full bg-cobalt-pop px-4 py-2 text-sm font-bold text-white transition hover:brightness-110"
                >
                  <Play className="h-4 w-4 fill-white" /> Resume
                </button>
              )}
              {busy && (
                <button
                  onClick={cancelDownload}
                  className="btn-pill !px-4 !py-2 !border-destructive !text-destructive"
                >
                  <X className="h-4 w-4" /> Cancel
                </button>
              )}
              {(dl.status === "done" || dl.status === "error") && (
                <>
                  {dl.status === "done" && (
                    <button
                      onClick={onOpenLibrary}
                      className="inline-flex items-center gap-2 rounded-full bg-cobalt-pop px-4 py-2 text-sm font-bold text-white transition hover:brightness-110"
                    >
                      <Play className="h-4 w-4 fill-white" /> Watch now
                    </button>
                  )}
                  <button onClick={dismissDownload} className="btn-pill !px-4 !py-2">
                    Dismiss
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mt-4">
            <ProgressBar
              value={pct}
              tone={
                dl.status === "done"
                  ? "bg-emerald-500"
                  : dl.status === "error"
                    ? "bg-destructive"
                    : dl.status === "paused"
                      ? "bg-amber-400"
                      : "bg-gradient-to-r from-cobalt-pop to-magenta-haze"
              }
            />
            <div className="mt-1.5 text-right text-xs font-semibold tabular-nums text-muted-foreground">
              {pct.toFixed(1)}%
            </div>
          </div>

          {dl.message && (
            <div
              className={`mt-3 flex items-start gap-2 rounded-xl p-3 text-sm ${
                dl.status === "error"
                  ? "border border-destructive/40 bg-destructive/10 text-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {dl.status === "error" ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              ) : (
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-cobalt-pop" />
              )}
              <span>{dl.message}</span>
            </div>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Metric label="Saved" value={nf.format(dl.completed)} />
            <Metric label="Left" value={nf.format(remainingInBatch)} />
            <Metric label="Failed" value={nf.format(dl.failed)} warn={dl.failed > 0} />
            <Metric label="Size" value={formatBytes(dl.bytes)} />
            <Metric
              label="Speed"
              value={dl.status === "running" ? `${formatBytes(dl.speedBps)}/s` : "—"}
              icon={<Gauge className="h-3.5 w-3.5" />}
            />
            <Metric
              label="Time left"
              value={dl.status === "running" ? formatEta(dl.etaSeconds) : "—"}
              icon={<Timer className="h-3.5 w-3.5" />}
            />
          </dl>

          {dl.active.length > 0 && (
            <ul className="mt-4 space-y-2">
              {dl.active.map((a) => (
                <li
                  key={a.url}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-xl bg-muted/60 px-3 py-2.5"
                >
                  <div className="flex items-center gap-2 sm:w-28 sm:shrink-0">
                    <Film className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-xs font-semibold text-foreground">
                      {a.label}
                    </span>
                  </div>
                  <div className="flex-1 w-full">
                    <ProgressBar
                      value={a.total > 0 ? (a.received / a.total) * 100 : 8}
                      tone="bg-cobalt-pop/80"
                    />
                  </div>
                  <div className="text-right text-[11px] tabular-nums text-muted-foreground sm:w-24 sm:shrink-0">
                    {formatBytes(a.received)}
                    {a.total > 0 ? ` / ${formatBytes(a.total)}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {dl.status === "running" && (
            <p className="mt-3 text-xs text-muted-foreground">
              Keep this app open — your screen stays awake while reels download. You can browse
              other pages; the download keeps going.
            </p>
          )}
        </section>
      )}

      {/* Idle notice after a cancel */}
      {dl.status === "idle" && dl.message && (
        <div className="flex items-center gap-2 rounded-2xl bg-muted p-3 text-sm text-foreground">
          <Info className="h-4 w-4 shrink-0 text-cobalt-pop" /> {dl.message}
        </div>
      )}

      {/* How it works */}
      <section className="rounded-3xl border border-dashed border-border/25 p-5 md:p-6">
        <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
          <Info className="h-4 w-4 text-cobalt-pop" /> How offline playback works
        </h3>
        <ul className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
          <li className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            Videos are stored privately in this app's browser database (IndexedDB) — never in your
            gallery or localStorage.
          </li>
          <li className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            Open <b className="mx-1 text-foreground">My downloads</b> to watch them with zero
            internet. Downloaded reels also play instantly in the main feed.
          </li>
          <li className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            Install the app (PWA) for the best experience — it starts and plays fully offline.
          </li>
          <li className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            Browsers can clear site data under extreme storage pressure; we ask for persistent
            storage so your downloads stay put.
          </li>
        </ul>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
  warn,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  warn?: boolean;
}) {
  return (
    <div className="rounded-xl bg-muted/60 px-3 py-2.5">
      <dt className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-base font-bold tabular-nums ${
          warn ? "text-destructive" : "text-foreground"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

// ─── Tab 2 · Library ──────────────────────────────────────────────────────────

function LibraryTab({
  items,
  loaded,
  error,
  onPlay,
  goDownload,
}: {
  items: OfflineMeta[];
  loaded: boolean;
  error: string | null;
  onPlay: (list: OfflineMeta[], start: number) => void;
  goDownload: () => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [confirmClear, setConfirmClear] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, "");
    const filtered = q
      ? items.filter(
          (m) =>
            String(m.index + 1) === q ||
            fileName(m.url).toLowerCase().includes(q) ||
            `reel ${m.index + 1}`.includes(q),
        )
      : items;
    return sortItems(filtered, sort);
  }, [items, query, sort]);

  const visibleBytes = useMemo(() => visible.reduce((n, m) => n + m.size, 0), [visible]);

  useEffect(() => {
    if (!confirmClear) return;
    const t = setTimeout(() => setConfirmClear(false), 4000);
    return () => clearTimeout(t);
  }, [confirmClear]);

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground">
        <AlertTriangle className="h-4 w-4 text-destructive" /> {error}
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="flex justify-center py-16">
        <span className="animate-pulse text-sm font-medium text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-dashed border-border/25 px-6 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cobalt-pop/10 text-cobalt-pop">
          <CloudDownload className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-foreground">No downloads yet</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Download 100, 500 or any number of reels and they'll show up here, ready to play without
          internet.
        </p>
        <button
          onClick={goDownload}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-cobalt-pop px-6 py-3 text-sm font-bold text-white transition hover:brightness-110"
        >
          <Download className="h-4 w-4" /> Start downloading
        </button>
        <Link to="/reels" className="mt-3 text-xs font-medium text-muted-foreground hover:underline">
          or browse reels online
        </Link>
      </div>
    );
  }

  const removeOne = (m: OfflineMeta) => void deleteOfflineVideos([m.url]);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by reel number or file name"
            aria-label="Search downloads"
            className="w-full rounded-full border border-border/25 bg-card py-2.5 pl-10 pr-4 text-sm text-foreground outline-none focus:border-cobalt-pop focus:ring-2 focus:ring-cobalt-pop/30"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort downloads"
          className="rounded-full border border-border/25 bg-card px-4 py-2.5 text-sm font-medium text-foreground outline-none focus:border-cobalt-pop"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <b className="text-foreground">{nf.format(visible.length)}</b>
          {visible.length !== items.length && <> of {nf.format(items.length)}</>} reels ·{" "}
          {formatBytes(visibleBytes)}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            disabled={visible.length === 0}
            onClick={() => onPlay(visible, 0)}
            className="inline-flex items-center gap-2 rounded-full bg-cobalt-pop px-4 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-40"
          >
            <Play className="h-4 w-4 fill-white" /> Play all
          </button>
          <button
            disabled={visible.length === 0}
            onClick={() => onPlay(shuffled(visible), 0)}
            className="btn-pill !px-4 !py-2"
          >
            <Shuffle className="h-4 w-4" /> Shuffle
          </button>
          <button
            onClick={() => {
              if (!confirmClear) return setConfirmClear(true);
              setConfirmClear(false);
              void clearOfflineVideos();
            }}
            className={`btn-pill !px-4 !py-2 ${
              confirmClear ? "!border-destructive !bg-destructive !text-white" : "!text-destructive"
            }`}
          >
            <Trash2 className="h-4 w-4" />
            {confirmClear ? "Tap again to delete all" : "Delete all"}
          </button>
        </div>
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <p className="py-14 text-center text-sm text-muted-foreground">
          No downloads match “{query}”.
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {visible.map((m, i) => (
            <li
              key={m.url}
              className="[content-visibility:auto] [contain-intrinsic-size:auto_104px]"
            >
              <Row meta={m} onPlay={() => onPlay(visible, i)} onDelete={() => removeOne(m)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({
  meta,
  onPlay,
  onDelete,
}: {
  meta: OfflineMeta;
  onPlay: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-2xl border border-border/15 bg-card p-2.5 pr-3 transition hover:border-cobalt-pop/40 hover:shadow-md sm:gap-4 sm:p-3">
      <button
        onClick={onPlay}
        aria-label={`Play reel ${meta.index + 1}`}
        className="relative h-[84px] w-[52px] shrink-0 overflow-hidden rounded-xl bg-black sm:h-[92px] sm:w-[58px]"
      >
        <LazyThumb url={meta.url} />
        <span className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition group-hover:opacity-100">
          <Play className="h-6 w-6 fill-white text-white" />
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-base font-bold text-foreground">Reel #{meta.index + 1}</span>
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
            offline
          </span>
        </div>
        <div className="truncate text-xs text-muted-foreground">{fileName(meta.url)}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-semibold text-foreground/80">
            <HardDrive className="h-3.5 w-3.5" /> {formatBytes(meta.size)}
          </span>
          {meta.views != null && (
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" /> {compact(meta.views)}
            </span>
          )}
          {meta.likes != null && (
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" /> {compact(meta.likes)}
            </span>
          )}
          <span className="hidden sm:inline">
            saved {formatDistanceToNow(meta.downloadedAt, { addSuffix: true })}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          onClick={onPlay}
          className="hidden items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background transition hover:opacity-85 sm:inline-flex"
        >
          <Play className="h-3.5 w-3.5 fill-current" /> Play
        </button>
        <button
          onClick={onDelete}
          aria-label={`Delete reel ${meta.index + 1}`}
          title="Remove from device"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * First-frame preview read from the offline blob. The blob/video is only
 * created while the row is on screen, so a library of 1000+ reels stays light.
 */
function LazyThumb({ url }: { url: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      rootMargin: "200px",
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) {
      setSrc(null);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    void getOfflineBlob(url).then((blob) => {
      if (cancelled || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setSrc(objectUrl + "#t=0.1");
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [visible, url]);

  return (
    <div ref={hostRef} className="h-full w-full">
      {src ? (
        <video
          src={src}
          muted
          playsInline
          preload="metadata"
          tabIndex={-1}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-card">
          <Film className="h-5 w-5 text-muted-foreground/60" />
        </div>
      )}
    </div>
  );
}
