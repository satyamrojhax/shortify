import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Coins,
  Copy,
  Check,
  Gift,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { BubbleLoader } from "@/components/ui/bubble-loader";

export const Route = createFileRoute("/_app/redeem-history")({
  component: RedeemHistoryPage,
});

type RedeemRecord = {
  id: number;
  user_id: string;
  item_id?: string;
  item_type?: string;
  cost: number;
  redeemed_at: string;
  upi_id?: string | null;
  user_name?: string | null;
  amount_inr?: number | null;
  status?: string | null;
  admin_notes?: string | null;
};

function RedeemHistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<RedeemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const fetchHistory = async () => {
    const uid = typeof localStorage !== "undefined" ? localStorage.getItem("ig.user_id") : null;
    if (!uid) {
      setLoading(false);
      return;
    }

    try {
      const { supabase } = await import("@/lib/supabase");
      const { data, error } = await supabase
        .from("user_redeem_data")
        .select("*")
        .eq("user_id", uid)
        .order("redeemed_at", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error("Failed to fetch redeem history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const copyToClipboard = (text: string, id: number) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  // Quick stats
  const totalRupees = history.reduce(
    (acc, cur) => acc + (Number(cur.amount_inr) || (cur.cost / 1000) * 10),
    0
  );
  const pendingCount = history.filter(
    (r) => !r.status || r.status.toLowerCase() === "pending"
  ).length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 pb-36">
      {/* Top Navigation */}
      <button
        onClick={() => navigate({ to: "/redeem" })}
        className="mb-4 inline-flex items-center gap-2 font-display text-sm lowercase text-charcoal/70 transition-colors hover:text-cocoa dark:text-cream/70 dark:hover:text-cream"
      >
        <ArrowLeft className="h-4 w-4" />
        back to earnings
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="font-display text-marker text-xl lowercase italic">your payouts —</p>
          <h1 className="mt-1 font-display text-[44px] leading-[1.05] lowercase text-cocoa md:text-[56px] dark:text-cream">
            redeem history.
          </h1>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchHistory();
          }}
          disabled={loading}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg border-[1.5px] border-charcoal/30 bg-dew/40 px-3 py-1.5 text-xs font-semibold text-cocoa transition hover:bg-dew dark:border-cream/30 dark:bg-secondary/40 dark:text-cream"
          title="Refresh history"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          refresh
        </button>
      </div>

      {/* Stats Summary Card */}
      {history.length > 0 && (
        <section className="mt-8 grid grid-cols-3 gap-3">
          <div className="paper-card p-4 text-center sm:text-left">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-charcoal/60 dark:text-cream/60">
              total redeemed
            </div>
            <div className="mt-1 font-display text-2xl sm:text-3xl text-cocoa dark:text-cream">
              ₹{totalRupees}
            </div>
          </div>
          <div className="paper-card p-4 text-center sm:text-left">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-charcoal/60 dark:text-cream/60">
              requests
            </div>
            <div className="mt-1 font-display text-2xl sm:text-3xl text-cocoa dark:text-cream">
              {history.length}
            </div>
          </div>
          <div className="paper-card p-4 text-center sm:text-left">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-charcoal/60 dark:text-cream/60">
              pending review
            </div>
            <div className="mt-1 font-display text-2xl sm:text-3xl text-marker">
              {pendingCount}
            </div>
          </div>
        </section>
      )}

      {/* Main Content List */}
      <section className="mt-6">
        {loading ? (
          <div className="paper-card flex flex-col items-center justify-center p-12 text-center">
            <BubbleLoader size="lg" />
            <p className="mt-3 text-sm text-charcoal/60 dark:text-cream/60">
              loading your payout records...
            </p>
          </div>
        ) : history.length === 0 ? (
          <div className="paper-card flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-magenta-haze/10 text-magenta-haze">
              <Gift className="h-8 w-8" />
            </div>
            <h2 className="mt-4 font-display text-2xl lowercase text-cocoa dark:text-cream">
              no redemptions yet
            </h2>
            <p className="mt-2 max-w-sm text-sm text-charcoal/70 dark:text-cream/70 leading-relaxed">
              you haven't requested any payouts yet. earn coins by watching reels and redeem them for
              cash rewards!
            </p>
            <Link to="/redeem" className="btn-pill mt-6">
              redeem your coins
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((record) => {
              const rupees =
                record.amount_inr !== null && record.amount_inr !== undefined
                  ? Number(record.amount_inr)
                  : (record.cost / 1000) * 10;
              const statusNormalized = (record.status || "pending").toLowerCase();
              const isCompleted =
                statusNormalized === "completed" || statusNormalized === "approved";
              const isRejected = statusNormalized === "rejected";
              const isPending = !isCompleted && !isRejected;

              return (
                <div
                  key={record.id}
                  className="paper-card relative overflow-hidden p-5 transition-shadow hover:shadow-md"
                >
                  {/* Top Bar: Coins & Status */}
                  <div className="flex items-center justify-between border-b border-charcoal/10 pb-3 dark:border-cream/10">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400/20 text-yellow-600 dark:text-yellow-400">
                        <Coins className="h-4 w-4" />
                      </div>
                      <span className="font-display text-lg text-cocoa dark:text-cream">
                        {record.cost} coins
                      </span>
                    </div>

                    {/* Status Badge */}
                    {isPending && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
                        <Clock className="h-3.5 w-3.5 animate-pulse" />
                        In Review
                      </span>
                    )}
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-700 dark:text-green-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Transferred
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-700 dark:text-red-300">
                        <XCircle className="h-3.5 w-3.5" />
                        Declined
                      </span>
                    )}
                  </div>

                  {/* Amount & Beneficiary Info */}
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-charcoal/60 dark:text-cream/60">
                        payout amount
                      </div>
                      <div className="mt-0.5 font-display text-3xl font-bold text-cocoa dark:text-cream">
                        ₹{rupees}
                      </div>
                      {record.user_name && (
                        <div className="mt-1 text-xs text-charcoal/70 dark:text-cream/70">
                          Beneficiary:{" "}
                          <span className="font-semibold text-cocoa dark:text-cream">
                            {record.user_name}
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-charcoal/60 dark:text-cream/60">
                        upi address / number
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="rounded-md border border-charcoal/20 bg-dew/30 px-3 py-1 font-mono text-sm font-semibold text-cocoa dark:border-cream/20 dark:bg-secondary/40 dark:text-cream truncate max-w-[220px]">
                          {record.upi_id || "Not Provided"}
                        </div>
                        {record.upi_id && (
                          <button
                            onClick={() => copyToClipboard(record.upi_id!, record.id)}
                            className="rounded-md p-1.5 text-charcoal/60 transition hover:bg-dew hover:text-cocoa dark:text-cream/60 dark:hover:bg-secondary dark:hover:text-cream"
                            title="Copy UPI ID"
                          >
                            {copiedId === record.id ? (
                              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Admin Notes if processed / UTR */}
                  {record.admin_notes && (
                    <div className="mt-4 rounded-lg border border-cobalt-pop/20 bg-cobalt-pop/5 p-3 text-xs text-charcoal/80 dark:text-cream/80">
                      <span className="font-semibold text-cobalt-pop">Admin Note: </span>
                      {record.admin_notes}
                    </div>
                  )}

                  {/* Footer: Date & Reference */}
                  <div className="mt-4 flex items-center justify-between border-t border-charcoal/10 pt-3 text-[11px] text-charcoal/50 dark:border-cream/10 dark:text-cream/50">
                    <div>
                      {new Date(record.redeemed_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="font-mono">#REQ-{record.id}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
