import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { BrandMark } from "@/components/nav";
import { Settings, Users, LayoutDashboard } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { ready, username } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (ready && username !== "Admin") {
      navigate({ to: "/login", search: { admin: true } });
    }
  }, [ready, username, navigate]);

  if (!ready || username !== "Admin") return <div className="p-10 text-white font-display text-2xl">loading admin portal...</div>;

  const handleLogout = () => {
    localStorage.removeItem("ig.user_id");
    localStorage.removeItem("ig.user_name");
    sessionStorage.clear();
    window.location.href = "/login?admin=true";
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-foreground/10 bg-background/50 flex-col">
        <div className="p-6 pb-2 border-b border-foreground/10">
          <div className="flex items-center gap-2">
            <BrandMark size={28} />
            <span className="font-display font-bold uppercase tracking-wider text-sm mt-1">Admin</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2 font-display text-sm">
          <Link to="/admin" className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground/70 hover:bg-foreground/5 hover:text-foreground [&.active]:bg-foreground/10 [&.active]:text-foreground transition-colors">
            <img src="https://d2bps9p1kiy4ka.cloudfront.net/5eb393ee95fab7468a79d189/f184fa99-6162-430e-a085-388f7857c2ca.png" alt="dashboard" className="w-[18px] h-[18px]" />
            dashboard
          </Link>
          <Link to="/admin/users" className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground/70 hover:bg-foreground/5 hover:text-foreground [&.active]:bg-foreground/10 [&.active]:text-foreground transition-colors">
            <Users size={18} />
            users
          </Link>
          <Link to="/admin/settings" className="flex items-center gap-3 px-4 py-3 rounded-lg text-foreground/70 hover:bg-foreground/5 hover:text-foreground [&.active]:bg-foreground/10 [&.active]:text-foreground transition-colors">
            <Settings size={18} />
            settings
          </Link>
        </nav>
        <div className="p-4 border-t border-foreground/10">
          <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-destructive/70 hover:bg-destructive/10 hover:text-destructive transition-colors font-display text-sm">
            <img src="data:image/svg+xml;base64,CiAgICA8c3ZnCiAgICAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgICAgZmlsbD0ibm9uZSIKICAgICAgdmlld0JveD0iMCAwIDI0IDI0IgogICAgICBzdHJva2Utd2lkdGg9IjEuNSIKICAgICAgc3Ryb2tlPSJjdXJyZW50Q29sb3IiCiAgICAgIAogICAgPgogICAgICA8cGF0aAogICAgICAgIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIKICAgICAgICBzdHJva2UtbGluZWpvaW49InJvdW5kIgogICAgICAgIGQ9Ik01LjYzNiA1LjYzNmE5IDkgMCAxIDAgMTIuNzI4IDBNMTIgM3Y5IgogICAgICAvPgogICAgPC9zdmc+CiA=" alt="logout" className="w-[18px] h-[18px]" />
            logout
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-background/80 backdrop-blur-md border-b border-foreground/10 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <BrandMark size={24} />
          <span className="font-display font-bold uppercase tracking-wider text-sm mt-1">Admin</span>
        </div>
        <button onClick={handleLogout} className="text-destructive p-2 rounded-full hover:bg-destructive/10">
          <img src="data:image/svg+xml;base64,CiAgICA8c3ZnCiAgICAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgICAgZmlsbD0ibm9uZSIKICAgICAgdmlld0JveD0iMCAwIDI0IDI0IgogICAgICBzdHJva2Utd2lkdGg9IjEuNSIKICAgICAgc3Ryb2tlPSJjdXJyZW50Q29sb3IiCiAgICAgIAogICAgPgogICAgICA8cGF0aAogICAgICAgIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIKICAgICAgICBzdHJva2UtbGluZWpvaW49InJvdW5kIgogICAgICAgIGQ9Ik01LjYzNiA1LjYzNmE5IDkgMCAxIDAgMTIuNzI4IDBNMTIgM3Y5IgogICAgICAvPgogICAgPC9zdmc+CiA=" alt="logout" className="w-[20px] h-[20px]" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-14 pb-20 md:pt-0 md:pb-0">
        <div className="p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-foreground/10 flex items-center justify-around px-2 z-50 pb-safe">
        <Link to="/admin" className="flex flex-col items-center justify-center w-16 h-full text-foreground/50 [&.active]:text-foreground gap-1">
          <img src="https://d2bps9p1kiy4ka.cloudfront.net/5eb393ee95fab7468a79d189/f184fa99-6162-430e-a085-388f7857c2ca.png" alt="home" className="w-[20px] h-[20px]" />
          <span className="text-[10px] font-medium tracking-wide">Home</span>
        </Link>
        <Link to="/admin/users" className="flex flex-col items-center justify-center w-16 h-full text-foreground/50 [&.active]:text-foreground gap-1">
          <Users size={20} />
          <span className="text-[10px] font-medium tracking-wide">Users</span>
        </Link>
        <Link to="/admin/settings" className="flex flex-col items-center justify-center w-16 h-full text-foreground/50 [&.active]:text-foreground gap-1">
          <Settings size={20} />
          <span className="text-[10px] font-medium tracking-wide">Settings</span>
        </Link>
      </nav>
    </div>
  );
}
