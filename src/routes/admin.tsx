import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { BrandMark } from "@/components/nav";
import { supabase } from "@/lib/supabase";
import {
  Settings,
  Users,
  LayoutDashboard,
  Bell,
  MessageSquare,
  Sun,
  Moon,
  Sliders,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { ready, username, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const storedUserId =
    typeof localStorage !== "undefined" ? localStorage.getItem("ig.user_id") : null;
  const storedUsername =
    username ||
    (typeof localStorage !== "undefined"
      ? localStorage.getItem("ig.username") || localStorage.getItem("ig.user_name")
      : null);

  const normalizedUser = (storedUsername || "").trim().toLowerCase();
  const isSatyamRojha = normalizedUser === "satyamrojha";
  const hasAdminSession =
    (typeof sessionStorage !== "undefined" &&
      sessionStorage.getItem("ig.admin_verified") === "true") ||
    (typeof localStorage !== "undefined" && localStorage.getItem("ig.admin_verified") === "true");

  const isAdmin = isSatyamRojha && hasAdminSession;

  useEffect(() => {
    if (ready) {
      if (isAdmin) {
        let page = "dashboard";
        if (typeof window !== "undefined") {
          const path = window.location.pathname;
          if (path.includes("/admin/users")) page = "users";
          else if (path.includes("/admin/notifications")) page = "notifications";
          else if (path.includes("/admin/feedback")) page = "feedback";
          else if (path.includes("/admin/config")) page = "config";
          else if (path.includes("/admin/settings")) page = "settings";
        }
        window.location.replace(`/madarchod.admin?isLogged=true&page=${page}`);
      } else {
        window.location.replace("/madarchod.admin");
      }
    }
  }, [ready, isAdmin]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-3 text-lg font-display">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>loading admin portal...</span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4 max-w-sm px-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="font-display text-xl font-bold">401 Unauthorized</p>
          <p className="text-sm text-foreground/60">
            Only admin <span className="font-semibold text-foreground">satyamrojha</span> with
            verified credentials can access this portal. All other users are classified as
            unauthorized.
          </p>
          <button
            onClick={() => navigate({ to: "/madarchod.admin" })}
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Admin Secure Login
          </button>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem("ig.admin_verified");
      sessionStorage.removeItem("ig.admin_session");
    }
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("ig.admin_verified");
      localStorage.removeItem("ig.admin_session");
    }
    await logout();
    window.location.href = "/madarchod.admin";
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-foreground/10 bg-background/50 flex-col">
        <div className="p-6 pb-2 border-b border-foreground/10 flex items-center">
          <span className="font-display font-bold uppercase tracking-wider text-base text-foreground">
            Admin
          </span>
        </div>
        <nav className="flex-1 p-4 space-y-2 font-display text-sm">
          <Link
            to="/admin"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground/70 hover:bg-foreground/5 hover:text-foreground [&.active]:bg-foreground/10 [&.active]:text-foreground transition-colors"
          >
            <img
              src="https://d2bps9p1kiy4ka.cloudfront.net/5eb393ee95fab7468a79d189/f184fa99-6162-430e-a085-388f7857c2ca.png"
              alt="dashboard"
              className="w-[18px] h-[18px]"
            />
            dashboard
          </Link>
          <Link
            to="/admin/users"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground/70 hover:bg-foreground/5 hover:text-foreground [&.active]:bg-foreground/10 [&.active]:text-foreground transition-colors"
          >
            <Users size={18} />
            users
          </Link>
          <Link
            to="/admin/notifications"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground/70 hover:bg-foreground/5 hover:text-foreground [&.active]:bg-foreground/10 [&.active]:text-foreground transition-colors"
          >
            <Bell size={18} />
            notifications
          </Link>
          <Link
            to="/admin/feedback"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground/70 hover:bg-foreground/5 hover:text-foreground [&.active]:bg-foreground/10 [&.active]:text-foreground transition-colors"
          >
            <MessageSquare size={18} />
            feedback & help
          </Link>
          <Link
            to={"/admin/config" as any}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground/70 hover:bg-foreground/5 hover:text-foreground [&.active]:bg-foreground/10 [&.active]:text-foreground transition-colors"
          >
            <Sliders size={18} />
            site config
          </Link>
          <Link
            to="/admin/settings"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground/70 hover:bg-foreground/5 hover:text-foreground [&.active]:bg-foreground/10 [&.active]:text-foreground transition-colors"
          >
            <Settings size={18} />
            settings
          </Link>
        </nav>
        <div className="p-4 border-t border-foreground/10 space-y-2">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex w-full items-center justify-between px-3 py-2.5 rounded-lg border border-foreground/15 text-foreground/80 hover:bg-foreground/10 transition-colors text-xs font-semibold"
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
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-colors font-display text-sm"
          >
            <img
              src="data:image/svg+xml;base64,CiAgICA8c3ZnCiAgICAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgICAgZmlsbD0ibm9uZSIKICAgICAgdmlld0JveD0iMCAwIDI0IDI0IgogICAgICBzdHJva2Utd2lkdGg9IjEuNSIKICAgICAgc3Ryb2tlPSJjdXJyZW50Q29sb3IiCiAgICAgIAogICAgPgogICAgICA8cGF0aAogICAgICAgIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIKICAgICAgICBzdHJva2UtbGluZWpvaW49InJvdW5kIgogICAgICAgIGQ9Ik01LjYzNiA1LjYzNmE5IDkgMCAxIDAgMTIuNzI4IDBNMTIgM3Y5IgogICAgICAvPgogICAgPC9zdmc+CiA="
              alt="logout"
              className="w-[18px] h-[18px]"
            />
            logout
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
            <img
              src="data:image/svg+xml;base64,CiAgICA8c3ZnCiAgICAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgICAgZmlsbD0ibm9uZSIKICAgICAgdmlld0JveD0iMCAwIDI0IDI0IgogICAgICBzdHJva2Utd2lkdGg9IjEuNSIKICAgICAgc3Ryb2tlPSJjdXJyZW50Q29sb3IiCiAgICAgIAogICAgPgogICAgICA8cGF0aAogICAgICAgIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIKICAgICAgICBzdHJva2UtbGluZWpvaW49InJvdW5kIgogICAgICAgIGQ9Ik01LjYzNiA1LjYzNmE5IDkgMCAxIDAgMTIuNzI4IDBNMTIgM3Y5IgogICAgICAvPgogICAgPC9zdmc+CiA="
              alt="logout"
              className="w-[20px] h-[20px]"
            />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-14 pb-20 md:pt-0 md:pb-0">
        <div className="p-3 sm:p-6 md:p-8 max-w-6xl mx-auto w-full">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-foreground/10 flex items-center justify-around px-2 z-50 pb-safe">
        <Link
          to="/admin"
          className="flex flex-col items-center justify-center w-14 h-full text-foreground/50 [&.active]:text-foreground gap-1"
        >
          <img
            src="https://d2bps9p1kiy4ka.cloudfront.net/5eb393ee95fab7468a79d189/f184fa99-6162-430e-a085-388f7857c2ca.png"
            alt="home"
            className="w-[18px] h-[18px]"
          />
          <span className="text-[9px] font-medium tracking-wide">Home</span>
        </Link>
        <Link
          to="/admin/users"
          className="flex flex-col items-center justify-center w-14 h-full text-foreground/50 [&.active]:text-foreground gap-1"
        >
          <Users size={18} />
          <span className="text-[9px] font-medium tracking-wide">Users</span>
        </Link>
        <Link
          to="/admin/notifications"
          className="flex flex-col items-center justify-center w-14 h-full text-foreground/50 [&.active]:text-foreground gap-1"
        >
          <Bell size={18} />
          <span className="text-[9px] font-medium tracking-wide">Alerts</span>
        </Link>
        <Link
          to="/admin/feedback"
          className="flex flex-col items-center justify-center w-14 h-full text-foreground/50 [&.active]:text-foreground gap-1"
        >
          <MessageSquare size={18} />
          <span className="text-[9px] font-medium tracking-wide">Help</span>
        </Link>
        <Link
          to={"/admin/config" as any}
          className="flex flex-col items-center justify-center w-12 h-full text-foreground/50 [&.active]:text-foreground gap-1"
        >
          <Sliders size={18} />
          <span className="text-[9px] font-medium tracking-wide">Config</span>
        </Link>
        <Link
          to="/admin/settings"
          className="flex flex-col items-center justify-center w-12 h-full text-foreground/50 [&.active]:text-foreground gap-1"
        >
          <Settings size={18} />
          <span className="text-[9px] font-medium tracking-wide">Settings</span>
        </Link>
      </nav>
    </div>
  );
}
