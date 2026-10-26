import React, { useEffect, useState, useCallback, useRef } from "react";
import { ShieldAlert, Github, ExternalLink, X, HeartHandshake } from "lucide-react";

const GITHUB_REPO_URL = "https://github.com/satyamrojhax/shortify";

export function SecurityGuard() {
  const [isOpen, setIsOpen] = useState(false);
  const [modalReason, setModalReason] = useState<string>("");
  const lastTriggerRef = useRef<number>(0);

  const printConsoleBanner = useCallback(() => {
    try {
      console.clear();
      console.log(
        "%c🛑 WHAT ARE YOU DOING BRUH? %c\n\n" +
          "%cTHIS PROJECT IS OPEN SOURCE, WHY YOU STILL NEED TO STOLE EVEYTHING?%c\n" +
          "PLEASE PREFER TO VISIT THE GITHUB:\n" +
          `%c${GITHUB_REPO_URL}%c\n\n` +
          "%cCONTRIBUTE BRUH. 🚀❤️%c",
        "color: #ef4444; font-size: 26px; font-weight: 900; font-family: system-ui, -apple-system, sans-serif; text-shadow: 2px 2px 0px rgba(0,0,0,0.8); background: #18181b; padding: 8px 14px; border-radius: 8px;",
        "",
        "color: #f59e0b; font-size: 16px; font-weight: 800; font-family: system-ui, sans-serif; line-height: 1.6;",
        "",
        "color: #38bdf8; font-size: 16px; font-weight: bold; text-decoration: underline;",
        "",
        "color: #10b981; font-size: 18px; font-weight: 900; font-family: system-ui, sans-serif; background: #064e3b; padding: 6px 12px; border-radius: 6px;",
        "",
      );
    } catch {
      // Safe fallback if console methods are overridden
    }
  }, []);

  const triggerModal = useCallback(
    (reason?: string) => {
      const now = Date.now();
      // Debounce trigger so modal doesn't re-trigger within 1 second
      if (now - lastTriggerRef.current < 1000) return;
      lastTriggerRef.current = now;

      printConsoleBanner();
      setModalReason(reason || "Developer tools or inspection shortcut detected.");
      setIsOpen(true);
    },
    [printConsoleBanner],
  );

  useEffect(() => {
    // Initial console banner
    printConsoleBanner();

    // ── 1. Keyboard Shortcut Restrictions ───────────────────────────────────
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // F12 key
      if (e.key === "F12" || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        triggerModal("F12 Developer Tools key detected!");
        return false;
      }

      // Ctrl+Shift+I / Cmd+Option+I (Inspect)
      if (isCtrlOrCmd && e.shiftKey && (key === "i" || e.keyCode === 73)) {
        e.preventDefault();
        e.stopPropagation();
        triggerModal("Inspect Element shortcut (Ctrl+Shift+I) detected!");
        return false;
      }

      // Ctrl+Shift+J / Cmd+Option+J (Console)
      if (isCtrlOrCmd && e.shiftKey && (key === "j" || e.keyCode === 74)) {
        e.preventDefault();
        e.stopPropagation();
        triggerModal("Developer Console shortcut (Ctrl+Shift+J) detected!");
        return false;
      }

      // Ctrl+Shift+C / Cmd+Option+C (Inspect Element selector)
      if (isCtrlOrCmd && e.shiftKey && (key === "c" || e.keyCode === 67)) {
        e.preventDefault();
        e.stopPropagation();
        triggerModal("Element Inspector shortcut (Ctrl+Shift+C) detected!");
        return false;
      }

      // Ctrl+Shift+K / Cmd+Option+K (Firefox console)
      if (isCtrlOrCmd && e.shiftKey && (key === "k" || e.keyCode === 75)) {
        e.preventDefault();
        e.stopPropagation();
        triggerModal("Developer Console shortcut detected!");
        return false;
      }

      // Ctrl+U / Cmd+Option+U (View Source)
      if (isCtrlOrCmd && (key === "u" || e.keyCode === 85)) {
        e.preventDefault();
        e.stopPropagation();
        triggerModal("View Source shortcut (Ctrl+U) detected!");
        return false;
      }

      // Ctrl+S / Cmd+S (Save page)
      if (isCtrlOrCmd && (key === "s" || e.keyCode === 83)) {
        e.preventDefault();
        e.stopPropagation();
        triggerModal("Save Page shortcut (Ctrl+S) detected!");
        return false;
      }

      // Ctrl+P / Cmd+P (Print page)
      if (isCtrlOrCmd && (key === "p" || e.keyCode === 80)) {
        e.preventDefault();
        e.stopPropagation();
        triggerModal("Print Page shortcut (Ctrl+P) detected!");
        return false;
      }
    };

    // ── 2. Context Menu (Right Click) Block ──────────────────────────────────
    const handleContextMenu = (e: MouseEvent) => {
      // Allow inputs / textareas normal text interaction if needed, otherwise block inspection
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (!isInput) {
        e.preventDefault();
        triggerModal("Right-click context menu inspection detected!");
        return false;
      }
    };

    // ── 3. DevTools Detection via Dimension Dilation & Console Getter ─────────
    // Detects when user opens DevTools via browser menu (Three dots -> More tools -> Dev tools)
    let devToolsCheckTimer: ReturnType<typeof setInterval> | null = null;

    const checkDevToolsOpen = () => {
      // Dimension threshold check (docked devtools alters inner vs outer dimensions significantly)
      const threshold = 160;
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;

      // Check if devtools is docked right/bottom
      if (widthDiff > threshold || heightDiff > threshold) {
        triggerModal("Developer tools window opened via browser menu!");
        return;
      }

      // Getter trigger check: formatters in modern browsers only invoke getters when devtools is active
      const detector = new Image();
      Object.defineProperty(detector, "id", {
        get: () => {
          triggerModal("DevTools console inspection detected!");
          return "security-guard";
        },
      });
      console.log("%c", detector);
      printConsoleBanner();
    };

    // ── 4. Bot & Automation Scraper Detection ───────────────────────────────
    const checkBotEnvironment = () => {
      const isHeadless =
        navigator.webdriver ||
        Boolean((window as unknown as { _phantom?: boolean })._phantom) ||
        Boolean((window as unknown as { __nightmare?: boolean }).__nightmare) ||
        Boolean((window as unknown as { callPhantom?: unknown }).callPhantom) ||
        /headlesschrome|puppeteer|selenium/i.test(navigator.userAgent);

      if (isHeadless) {
        triggerModal("Automated bot / headless browser scraper detected!");
      }
    };

    checkBotEnvironment();

    // Check periodically for devtools opening
    devToolsCheckTimer = setInterval(checkDevToolsOpen, 2000);

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("contextmenu", handleContextMenu, { capture: true });
    window.addEventListener("resize", checkDevToolsOpen);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
      window.removeEventListener("resize", checkDevToolsOpen);
      if (devToolsCheckTimer) clearInterval(devToolsCheckTimer);
    };
  }, [triggerModal, printConsoleBanner]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-cream dark:bg-charcoal text-charcoal dark:text-cream rounded-3xl border-2 border-charcoal/20 dark:border-cream/20 shadow-2xl overflow-hidden p-6 sm:p-8 animate-in zoom-in-95 duration-200">
        {/* Close Icon Top-Right */}
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute top-5 right-5 p-2 rounded-full text-charcoal/60 dark:text-cream/60 hover:text-charcoal dark:hover:text-cream hover:bg-charcoal/10 dark:hover:bg-cream/10 active:scale-95 transition cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon Badge */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Security Notice
            </span>
            <h2 className="text-xl sm:text-2xl font-black font-display lowercase tracking-tight leading-none text-cocoa dark:text-cream">
              what are you doing bruh?
            </h2>
          </div>
        </div>

        {/* Main Message requested by user */}
        <div className="bg-dew/80 dark:bg-secondary/70 rounded-2xl p-4 sm:p-5 border border-charcoal/10 dark:border-cream/10 mb-5">
          <p className="text-base sm:text-lg font-bold text-cocoa dark:text-cream leading-snug">
            BRUH THIS IS OPEN SOURCE GO AND SEE THERE AND CUSTOMIZE IT BY OWN..
          </p>
          <p className="mt-2 text-xs sm:text-sm text-charcoal/70 dark:text-cream/70 leading-relaxed">
            Why try to inspect or steal anything when the entire project is open-source? You can clone,
            modify, and submit pull requests directly on our official GitHub repository.
          </p>
          {modalReason && (
            <div className="mt-3 pt-3 border-t border-charcoal/10 dark:border-cream/10 text-[11px] text-charcoal/60 dark:text-cream/60 font-mono">
              Trigger: {modalReason}
            </div>
          )}
        </div>

        {/* GitHub Link Preview Box */}
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-charcoal/5 dark:bg-cream/5 hover:bg-charcoal/10 dark:hover:bg-cream/10 transition border border-charcoal/10 dark:border-cream/10 mb-6 group cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Github className="w-5 h-5 shrink-0 text-cocoa dark:text-cream" />
            <span className="text-xs sm:text-sm font-semibold truncate text-cocoa dark:text-cream">
              satyamrojhax/shortify
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:underline shrink-0">
            Visit GitHub <ExternalLink className="w-3.5 h-3.5" />
          </span>
        </a>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl border border-charcoal/20 dark:border-cream/20 font-bold text-sm text-charcoal dark:text-cream hover:bg-charcoal/5 dark:hover:bg-cream/5 active:scale-98 transition cursor-pointer"
          >
            Understood
          </button>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-cocoa dark:bg-cream text-cream dark:text-charcoal font-bold text-sm hover:opacity-90 active:scale-98 transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <HeartHandshake className="w-4 h-4" />
            <span>Contribute Bruh</span>
          </a>
        </div>
      </div>
    </div>
  );
}
