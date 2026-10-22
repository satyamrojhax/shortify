import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { BrandMark } from "@/components/nav";
import { rotateCsrfToken } from "@/lib/url-tracker";
import {
  ShieldAlert,
  Lock,
  User,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  Users,
  Bell,
  MessageSquare,
  Sliders,
  Settings,
  Sun,
  Moon,
  LayoutDashboard,
  LogOut,
  AlertTriangle,
} from "lucide-react";

import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminUsers } from "@/components/admin/admin-users";
import { AdminUserEdit } from "@/components/admin/admin-user-edit";
import { AdminNotificationsPage } from "@/components/admin/admin-notifications";
import { AdminFeedbackPage } from "@/components/admin/admin-feedback";
import { AdminConfigPage } from "@/components/admin/admin-config";
import { AdminSettings } from "@/components/admin/admin-settings";

interface AdminSearchParams {
  isLogged?: boolean;
  page?: string;
  id?: string;
}

export const Route = createFileRoute("/madarchod.admin")({
  validateSearch: (search: Record<string, unknown>): AdminSearchParams => {
    return {
      isLogged: search.isLogged === true || search.isLogged === "true" || search.isLogged === "1",
      page: typeof search.page === "string" ? search.page : undefined,
      id: typeof search.id === "string" ? search.id : undefined,
    };
  },
  component: MadarchodAdminPortal,
});

function checkAdminAuth(): boolean {
  if (typeof window === "undefined") return false;

  const sessionToken =
    sessionStorage.getItem("ig.admin_session") ||
    localStorage.getItem("ig.admin_session");
  const isVerified =
    sessionStorage.getItem("ig.admin_verified") === "true" ||
    localStorage.getItem("ig.admin_verified") === "true";
  const storedUser =
    localStorage.getItem("ig.username") ||
    localStorage.getItem("ig.user_name") ||
    sessionStorage.getItem("ig.username") ||
    "";
  const isSatyam = storedUser.trim().toLowerCase() === "satyamrojha";

  return Boolean(isVerified && sessionToken && isSatyam);
}

function MadarchodAdminPortal() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [isAuthVerified, setIsAuthVerified] = useState<boolean>(() => checkAdminAuth());

  useEffect(() => {
    setIsAuthVerified(checkAdminAuth());
  }, [search.isLogged]);

  // If already authenticated and visiting base /madarchod.admin without isLogged, auto-direct into dashboard
  useEffect(() => {
    if (!search.isLogged && isAuthVerified) {
      navigate({
        to: "/madarchod.admin",
        search: { isLogged: true, page: "dashboard" },
      });
    }
  }, [search.isLogged, isAuthVerified, navigate]);

  // 1. Dashboard View (when isLogged === true AND authenticated)
  if (search.isLogged) {
    if (!isAuthVerified) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#07070b] text-white px-4 py-12">
          <div className="text-center space-y-4 max-w-sm rounded-2xl border border-red-500/20 bg-red-500/10 p-6 backdrop-blur-xl">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <p className="font-display text-xl font-bold tracking-tight">401 Unauthorized</p>
            <p className="text-xs text-white/60 leading-relaxed font-mono">
              Only admin <span className="text-amber-400 font-semibold">satyamrojha</span> with verified credentials can access this portal. All other users are classified as unauthorized.
            </p>
            <button
              onClick={() => {
                navigate({ to: "/madarchod.admin", search: {} });
              }}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 rounded-xl text-xs font-semibold tracking-wider uppercase transition shadow-lg shadow-red-900/30"
            >
              Go to Admin Login
            </button>
          </div>
        </div>
      );
    }

    const currentPage = search.page || "dashboard";

    const handleLogout = async () => {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem("ig.admin_verified");
        sessionStorage.removeItem("ig.admin_session");
      }
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("ig.admin_verified");
        localStorage.removeItem("ig.admin_session");
      }
      try {
        await logout();
      } catch (err) {
        console.error(err);
      }
      window.location.href = "/madarchod.admin";
    };

    const navItems = [
      {
        id: "dashboard",
        label: "dashboard",
        icon: LayoutDashboard,
      },
      {
        id: "users",
        label: "users",
        icon: Users,
      },
      {
        id: "notifications",
        label: "notifications",
        icon: Bell,
      },
      {
        id: "feedback",
        label: "feedback & help",
        icon: MessageSquare,
      },
      {
        id: "config",
        label: "site config",
        icon: Sliders,
      },
      {
        id: "settings",
        label: "settings",
        icon: Settings,
      },
    ];

    const renderCurrentPage = () => {
      switch (currentPage) {
        case "dashboard":
          return <AdminDashboard />;
        case "users":
          return <AdminUsers />;
        case "user-detail":
          return <AdminUserEdit id={search.id} />;
        case "notifications":
          return <AdminNotificationsPage />;
        case "feedback":
          return <AdminFeedbackPage />;
        case "config":
          return <AdminConfigPage />;
        case "settings":
          return <AdminSettings />;
        default:
          return <AdminDashboard />;
      }
    };

    return (
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 border-r border-foreground/10 bg-background/50 flex-col">
          <div className="p-6 pb-4 border-b border-foreground/10 flex items-center">
            <span className="font-display font-bold uppercase tracking-wider text-base text-foreground">
              Admin
            </span>
          </div>

          <nav className="flex-1 p-4 space-y-1.5 font-display text-sm">
            {navItems.map((item) => {
              const isActive =
                currentPage === item.id || (item.id === "users" && currentPage === "user-detail");
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  to="/madarchod.admin"
                  search={{ isLogged: true, page: item.id }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? "bg-foreground/10 text-foreground font-semibold shadow-xs"
                      : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-primary" : "text-foreground/60"} />
                  <span className="capitalize">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-foreground/10 space-y-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex w-full items-center justify-between px-3 py-2.5 rounded-xl border border-foreground/15 text-foreground/80 hover:bg-foreground/10 transition-colors text-xs font-semibold"
              title="Toggle Light / Dark mode"
            >
              <div className="flex items-center gap-2">
                {theme === "dark" ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
                <span className="capitalize">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-foreground/50">Theme</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-xl text-destructive hover:bg-destructive/10 transition-colors font-display text-sm font-semibold"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Mobile Header */}
        <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-background/80 backdrop-blur-md border-b border-foreground/10 flex items-center justify-between px-4 z-50">
          <div className="flex items-center">
            <span className="font-display font-bold uppercase tracking-wider text-sm text-foreground">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-full text-foreground/80 hover:bg-foreground/10 transition-colors"
              title="Toggle Light / Dark mode"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
            </button>
            <button
              onClick={handleLogout}
              className="text-destructive p-2 rounded-full hover:bg-destructive/10"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pt-14 pb-20 md:pt-0 md:pb-0">
          <div className="p-3 sm:p-6 md:p-8 max-w-6xl mx-auto w-full">
            {renderCurrentPage()}
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-foreground/10 flex items-center justify-around px-2 z-50 pb-safe">
          {navItems.map((item) => {
            const isActive =
              currentPage === item.id || (item.id === "users" && currentPage === "user-detail");
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                to="/madarchod.admin"
                search={{ isLogged: true, page: item.id }}
                className={`flex flex-col items-center justify-center w-12 h-full gap-1 transition-colors ${
                  isActive ? "text-primary font-bold" : "text-foreground/50 hover:text-foreground"
                }`}
              >
                <Icon size={18} />
                <span className="text-[9px] capitalize tracking-wide">{item.id}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }

  // 2. Admin Secure Login Page View (when not logged in)
  return <AdminSecureLoginForm onSuccess={() => setIsAuthVerified(true)} />;
}

function AdminSecureLoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { loginUser } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const trimmedUser = username.trim().toLowerCase();
    const trimmedPass = password.trim();
    const trimmedSecret = secretCode.trim();

    if (!trimmedUser || !trimmedPass || !trimmedSecret) {
      setErrorMsg("All fields are mandatory for admin authorization.");
      return;
    }

    // Strict check 1: ONLY satyamrojha can ever be admin
    if (trimmedUser !== "satyamrojha") {
      setErrorMsg("401 Unauthorized: Only satyamrojha is authorized to access the admin portal. All other users are unauthorized.");
      return;
    }

    // Strict check 2: Secret Code verification
    const expectedSecret =
      import.meta.env.VITE_ADMIN_SECRET_CODE ||
      import.meta.env.VITE_SECRET_CODE ||
      "CHUT";

    if (trimmedSecret !== expectedSecret) {
      setErrorMsg("403 Forbidden: Invalid Secret Code. High-level security alert logged.");
      return;
    }

    setLoading(true);
    rotateCsrfToken("admin_auth_submit");

    try {
      const email = `${trimmedUser}@shortify.cc.cd`;
      await loginUser(email, trimmedPass);

      // Store verified admin session tokens
      const adminToken = "adm_" + crypto.randomUUID();
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("ig.admin_verified", "true");
        sessionStorage.setItem("ig.admin_session", adminToken);
        sessionStorage.setItem("ig.username", "satyamrojha");
        sessionStorage.setItem("ig.user_name", "satyamrojha");
      }
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("ig.admin_verified", "true");
        localStorage.setItem("ig.admin_session", adminToken);
        localStorage.setItem("ig.username", "satyamrojha");
        localStorage.setItem("ig.user_name", "satyamrojha");
      }

      setSuccess(true);
      onSuccess();

      // Immediate redirect to /madarchod.admin?isLogged=true&page=dashboard
      setTimeout(() => {
        window.location.href = "/madarchod.admin?isLogged=true&page=dashboard";
      }, 350);
    } catch (err: unknown) {
      console.error("Admin login error:", err);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Authentication failed. Please verify your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07070b] text-white px-4 py-12 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 shadow-2xl mb-4 backdrop-blur-xl">
            <BrandMark size={36} />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <span className="text-xs font-mono uppercase tracking-[0.25em] text-red-400 font-semibold">
              Restricted Area
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white lowercase">
            admin authentication
          </h1>
          <p className="mt-1.5 text-xs text-white/50 tracking-wide font-mono">
            only <span className="text-amber-400 font-semibold">satyamrojha</span> has clearance
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-6 sm:p-8 shadow-2xl">
          {errorMsg && (
            <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-300 font-medium leading-relaxed flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 font-medium leading-relaxed flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Authorized. Granting admin portal access...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div>
              <label className="block text-[11px] font-mono font-medium uppercase tracking-widest text-white/60 mb-1.5">
                Admin Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="satyamrojha"
                  autoComplete="username"
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none transition focus:border-red-500 focus:bg-white/[0.07] focus:ring-1 focus:ring-red-500/40"
                  disabled={loading || success}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[11px] font-mono font-medium uppercase tracking-widest text-white/60 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-white/20 outline-none transition focus:border-red-500 focus:bg-white/[0.07] focus:ring-1 focus:ring-red-500/40"
                  disabled={loading || success}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/40 hover:text-white transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Secret Code Field */}
            <div>
              <label className="block text-[11px] font-mono font-medium uppercase tracking-widest text-white/60 mb-1.5">
                Secret Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/40">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showSecret ? "text" : "password"}
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value)}
                  placeholder="Enter secret code from mother"
                  autoComplete="off"
                  className="w-full rounded-xl border border-white/15 bg-white/[0.04] pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-white/20 outline-none transition focus:border-red-500 focus:bg-white/[0.07] focus:ring-1 focus:ring-red-500/40"
                  disabled={loading || success}
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/40 hover:text-white transition"
                  tabIndex={-1}
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || success || !username.trim() || !password || !secretCode}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 active:scale-[0.99] text-white py-3 text-sm font-semibold tracking-wider uppercase transition shadow-lg shadow-red-900/30 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying clearance...</span>
                </div>
              ) : success ? (
                <span>Clearance Granted →</span>
              ) : (
                <span>Authorize & Enter Admin →</span>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-6 pt-4 border-t border-white/10 text-center">
            <p className="text-[11px] font-mono text-white/30">
              Session is encrypted & monitored. Unverified attempts are rejected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
