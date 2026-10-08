import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Coins, ArrowRight, History, Sparkles, X, CheckCircle2 } from "lucide-react";
import { getCoins, set, KEYS } from "@/lib/storage";

export const Route = createFileRoute("/_app/redeem")({
  component: RedeemPage,
});

function RedeemPage() {
  const navigate = useNavigate();
  const [currentCoins, setCurrentCoins] = useState(0);
  const [name, setName] = useState("");
  const [coinsToRedeem, setCoinsToRedeem] = useState("");
  const [upi, setUpi] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setCurrentCoins(getCoins());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const amount = parseInt(coinsToRedeem, 10);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid coin amount.");
      return;
    }
    if (amount > currentCoins) {
      setError(`You only have ${currentCoins} coins available.`);
      return;
    }
    if (amount < 1000) {
      setError("Minimum redeem amount is 1000 coins.");
      return;
    }
    if (!name.trim() || !upi.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    const rupees = (amount / 1000) * 10;
    setSubmitting(true);

    // Save to relational table first
    const uid = typeof localStorage !== "undefined" ? localStorage.getItem("ig.user_id") : null;
    if (uid) {
      try {
        const { supabase } = await import("@/lib/supabase");
        const { error: dbError } = await supabase.from("user_redeem_data").insert({
          user_id: uid,
          item_id: "cash",
          item_type: "upi",
          cost: amount,
          user_name: name.trim(),
          upi_id: upi.trim(),
          amount_inr: rupees,
          status: "pending",
        });

        if (dbError) {
          console.error(dbError);
          setError("Failed to process redemption. Please try again.");
          setSubmitting(false);
          return;
        }
      } catch (err) {
        console.error(err);
        setError("Network error. Please try again.");
        setSubmitting(false);
        return;
      }
    }

    // Deduct coins locally after successful DB insert
    const newCoins = currentCoins - amount;
    setCurrentCoins(newCoins);
    set(KEYS.coins, newCoins);

    setSubmitting(false);
    setSuccess(true);
    setName("");
    setCoinsToRedeem("");
    setUpi("");
  };

  const rupeesValue =
    parseInt(coinsToRedeem, 10) > 0 ? (parseInt(coinsToRedeem, 10) / 1000) * 10 : 0;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 pb-36">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="font-display text-marker text-xl lowercase italic">cash out —</p>
          <h1 className="mt-1 font-display text-[44px] leading-[1.05] lowercase text-cocoa md:text-[56px] dark:text-cream">
            redeem coins.
          </h1>
        </div>
        <Link
          to="/redeem-history"
          className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg border-[1.5px] border-charcoal/30 bg-dew/40 px-3.5 py-2 text-xs font-semibold text-cocoa transition hover:bg-dew dark:border-cream/30 dark:bg-secondary/40 dark:text-cream"
        >
          <History className="h-4 w-4" />
          <span>view history</span>
        </Link>
      </div>

      {/* Main Redeem Card */}
      <div className="paper-card p-6 sm:p-8 text-center flex flex-col items-center justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 mb-4 shadow-inner">
          <Coins className="h-10 w-10" />
        </div>

        <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-charcoal/60 dark:text-cream/60">
          your available balance
        </div>
        <div className="mt-1 font-display text-5xl sm:text-6xl text-cocoa dark:text-cream">
          {currentCoins.toLocaleString()}
        </div>
        <p className="mt-1 text-sm font-medium text-marker">coins</p>

        <div className="mt-6 rounded-xl border border-charcoal/15 bg-background px-4 py-2.5 text-xs text-charcoal/70 dark:border-cream/15 dark:text-cream/70">
          Exchange rate: <span className="font-bold text-cocoa dark:text-cream">1,000 coins = ₹10 INR</span>
        </div>

        <div className="mt-8 w-full max-w-sm">
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={currentCoins < 1000}
            className={`w-full rounded-xl py-3.5 px-6 font-display text-base font-bold transition-all shadow-md ${currentCoins >= 1000
                ? "bg-cobalt-pop text-white hover:bg-cobalt-pop/90 active:scale-95"
                : "bg-charcoal/10 text-charcoal/40 dark:bg-cream/10 dark:text-cream/40 cursor-not-allowed"
              }`}
          >
            {currentCoins >= 1000 ? "Request Payout Now" : "Need 1,000 Coins Minimum"}
          </button>

          {currentCoins < 1000 && (
            <p className="mt-3 text-xs text-charcoal/60 dark:text-cream/60">
              Watch more reels and like posts to reach the 1,000 coins minimum payout threshold.
            </p>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="mt-6 paper-card p-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-charcoal/60 dark:text-cream/60 mb-3">
          how payouts work
        </h3>
        <ul className="space-y-2.5 text-xs text-charcoal/70 dark:text-cream/70 leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="font-bold text-cobalt-pop">1.</span>
            <span>Enter your real name and verified UPI ID or mobile number.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-cobalt-pop">2.</span>
            <span>The request is stored securely in your database history with status 'In Review'.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-cobalt-pop">3.</span>
            <span>Once transferred via UPI, the admin updates status to 'Transferred' with UTR reference.</span>
          </li>
        </ul>
      </div>

      {/* Redeem Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="paper-card relative w-full max-w-md p-6 sm:p-8 shadow-2xl animate-in zoom-in-95">
            {!success && (
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 rounded-full p-2 text-charcoal/60 hover:text-cocoa dark:text-cream/60 dark:hover:text-cream"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            {success ? (
              <div className="text-center py-6">
                <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-4" />
                <h2 className="font-display text-2xl lowercase text-cocoa dark:text-cream mb-2">
                  successfully requested!
                </h2>
                <p className="text-sm text-charcoal/70 dark:text-cream/70 mb-8">
                  Your payout request has been submitted and is pending admin review.
                </p>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSuccess(false);
                    navigate({ to: "/redeem-history" });
                  }}
                  className="w-full rounded-xl bg-cobalt-pop py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-cobalt-pop/90"
                >
                  View History
                </button>
              </div>
            ) : (
              <>
                <h2 className="font-display text-2xl lowercase text-cocoa dark:text-cream mb-1">
                  redeem payout.
                </h2>
                <p className="text-xs text-charcoal/60 dark:text-cream/60 mb-6">
                  Enter your UPI details to receive your earnings
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-charcoal/70 dark:text-cream/70">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. LFRDCA"
                      required
                      className="w-full rounded-lg border-[1.5px] border-charcoal/30 bg-dew/20 px-3.5 py-2.5 text-sm text-cocoa placeholder:text-charcoal/40 focus:border-cobalt-pop focus:outline-none dark:border-cream/30 dark:bg-secondary/30 dark:text-cream dark:placeholder:text-cream/40"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-charcoal/70 dark:text-cream/70">
                      Coins to Redeem
                    </label>
                    <input
                      type="number"
                      min="1000"
                      max={currentCoins}
                      step="100"
                      value={coinsToRedeem}
                      onChange={(e) => setCoinsToRedeem(e.target.value)}
                      placeholder="e.g. 1000"
                      required
                      className="w-full rounded-lg border-[1.5px] border-charcoal/30 bg-dew/20 px-3.5 py-2.5 text-sm text-cocoa placeholder:text-charcoal/40 focus:border-cobalt-pop focus:outline-none dark:border-cream/30 dark:bg-secondary/30 dark:text-cream dark:placeholder:text-cream/40"
                    />
                    {rupeesValue > 0 && (
                      <p className="mt-1.5 text-xs font-bold text-green-600 dark:text-green-400">
                        You will receive: ₹{rupeesValue} INR
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-charcoal/70 dark:text-cream/70">
                      UPI ID or Phone Number
                    </label>
                    <input
                      type="text"
                      value={upi}
                      onChange={(e) => setUpi(e.target.value)}
                      placeholder="e.g. username@okhdfcbank or 9876543210"
                      required
                      className="w-full rounded-lg border-[1.5px] border-charcoal/30 bg-dew/20 px-3.5 py-2.5 text-sm text-cocoa placeholder:text-charcoal/40 focus:border-cobalt-pop focus:outline-none dark:border-cream/30 dark:bg-secondary/30 dark:text-cream dark:placeholder:text-cream/40 font-mono"
                    />
                  </div>

                  {error && (
                    <div className="rounded-lg border border-marker/30 bg-marker/10 p-2.5 text-xs font-medium text-marker">
                      {error}
                    </div>
                  )}

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 rounded-xl border border-charcoal/30 py-2.5 text-sm font-semibold text-cocoa dark:border-cream/30 dark:text-cream hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 rounded-xl bg-cobalt-pop py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-cobalt-pop/90 disabled:opacity-50"
                    >
                      {submitting ? "Submitting..." : "Confirm & Redeem"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
