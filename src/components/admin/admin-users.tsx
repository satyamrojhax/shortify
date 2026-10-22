import { Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search,
  ChevronRight,
  RefreshCw,
  Coins,
  Calendar,
  Mail,
  Copy,
  X,
  Users as UsersIcon,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { toast } from "sonner";

interface UserRecord {
  id: string;
  name?: string;
  email?: string;
  total_coins?: number;
  created_at?: string;
  password?: string;
  [key: string]: unknown;
}

export function AdminUsers() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const loadUsers = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data) setUsers(data as UserRecord[]);
      if (isManualRefresh) {
        toast.success("Users list refreshed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const copyText = (e: React.MouseEvent, text: string, label = "Copied to clipboard") => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success(label);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.id && u.id.toLowerCase().includes(q)),
    );
  }, [users, search]);

  return (
    <div className="w-full max-w-full space-y-6 animate-fade-in pb-12">
      {/* Top Header: Title & Responsive Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-foreground/10 pb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-1.5 lowercase text-foreground tracking-tight flex items-center gap-2 flex-wrap">
            <span>user</span>
            <span className="marker-underline">management</span>
          </h1>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-foreground/60 flex-wrap">
            <span>View and manage all registered accounts</span>
            <span className="w-1 h-1 rounded-full bg-foreground/30" />
            <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-foreground/80 bg-foreground/5 px-2 py-0.5 rounded-full border border-foreground/10">
              <UsersIcon size={12} className="text-primary" />
              <span>{users.length} total</span>
              {search.trim() && (
                <span className="text-foreground/50">({filtered.length} found)</span>
              )}
            </span>
          </div>
        </div>

        {/* Action Controls: Search & Refresh */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none"
              size={16}
            />
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 bg-background border border-foreground/20 rounded-xl pl-9 pr-8 text-xs sm:text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-foreground/50 focus:ring-2 focus:ring-foreground/5 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground p-1 transition-colors"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => loadUsers(true)}
            disabled={refreshing || loading}
            className="h-10 px-3.5 rounded-xl border border-foreground/20 text-foreground hover:bg-foreground/10 active:scale-95 transition-all text-xs font-semibold inline-flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-60 cursor-pointer"
            title="Refresh users list"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div>
        {loading ? (
          /* Loading State: Skeletons */
          <div className="space-y-3">
            {/* Mobile Loading Cards */}
            <div className="space-y-3 md:hidden">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="p-4 rounded-2xl border border-foreground/10 bg-card/60 animate-pulse space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-foreground/10 shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 bg-foreground/10 rounded w-1/2" />
                      <div className="h-3 bg-foreground/5 rounded w-3/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Loading Table */}
            <div className="hidden md:block bg-card/70 border border-foreground/10 rounded-2xl overflow-hidden p-8 text-center text-foreground/60 animate-pulse font-display">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-foreground/40" />
              <span>loading users directory...</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          /* Empty State */
          <div className="bg-card/70 border border-foreground/10 rounded-2xl p-8 sm:p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-foreground/5 text-foreground/40 flex items-center justify-center mx-auto">
              <Search size={22} />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground lowercase">
              no users found
            </h3>
            <p className="text-xs sm:text-sm text-foreground/60 max-w-sm mx-auto">
              {search.trim()
                ? `No accounts matched your search "${search}". Try checking for typos or searching by user ID.`
                : "No registered users exist in the database yet."}
            </p>
            {search.trim() && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="px-4 py-2 rounded-xl bg-foreground/10 hover:bg-foreground/15 text-xs font-semibold text-foreground transition-colors cursor-pointer"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : (
          <>
            {/* 1. Mobile Cards View (< md) */}
            <div className="space-y-3 md:hidden">
              {filtered.map((user) => (
                <Link
                  key={user.id}
                  to={"/madarchod.admin" as any}
                  search={{ isLogged: true, page: "user-detail", id: user.id } as any}
                  className="block p-3.5 sm:p-4 rounded-2xl border border-foreground/10 bg-card/70 hover:bg-card/90 hover:border-foreground/20 active:scale-[0.99] transition-all shadow-xs space-y-3 group"
                >
                  {/* Top: Avatar, Name & Coins */}
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        name={user.name}
                        seed={user.name || user.id}
                        size="md"
                        className="shrink-0 ring-2 ring-foreground/5"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                          {user.name || "Unknown"}
                        </div>
                        {user.email ? (
                          <div className="text-xs text-foreground/60 flex items-center gap-1 truncate">
                            <Mail size={11} className="shrink-0 text-foreground/40" />
                            <span className="truncate">{user.email}</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-foreground/40 italic">
                            No email attached
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Coins Badge */}
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-xs font-semibold shrink-0">
                      <Coins size={13} className="text-amber-500" />
                      <span>{(user.total_coins || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Bottom: ID, Joined Date & Manage Arrow */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-foreground/5 text-xs text-foreground/50">
                    <button
                      type="button"
                      onClick={(e) => copyText(e, user.id, "User ID copied")}
                      className="font-mono text-[10px] text-foreground/60 hover:text-foreground inline-flex items-center gap-1 px-2 py-0.5 rounded bg-foreground/5 hover:bg-foreground/10 transition-colors truncate max-w-[170px]"
                      title="Tap to copy user ID"
                    >
                      <span className="truncate">{user.id}</span>
                      <Copy size={10} className="shrink-0" />
                    </button>

                    <div className="flex items-center gap-3 shrink-0">
                      {user.created_at && (
                        <span className="text-[11px] text-foreground/40 inline-flex items-center gap-1">
                          <Calendar size={11} />
                          <span>{new Date(user.created_at).toLocaleDateString()}</span>
                        </span>
                      )}

                      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
                        <span>Edit</span>
                        <ChevronRight size={13} />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* 2. Desktop Table View (≥ md) */}
            <div className="hidden md:block bg-card/70 border border-foreground/10 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-sm">
                <thead className="bg-foreground/5 text-foreground/60 font-display uppercase tracking-wider text-xs border-b border-foreground/10">
                  <tr>
                    <th className="px-6 py-4 font-semibold">User</th>
                    <th className="px-6 py-4 font-semibold">Email</th>
                    <th className="px-6 py-4 font-semibold text-center">Coins</th>
                    <th className="px-6 py-4 font-semibold">Joined Date</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/10">
                  {filtered.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-foreground/[0.02] transition-colors group"
                    >
                      {/* User Cell */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            name={user.name}
                            seed={user.name || user.id}
                            size="md"
                            className="shrink-0 ring-1 ring-foreground/10"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                              {user.name || "Unknown"}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => copyText(e, user.id, "User ID copied")}
                              className="text-[11px] font-mono text-foreground/40 hover:text-foreground inline-flex items-center gap-1 transition-colors"
                              title="Click to copy ID"
                            >
                              <span className="truncate max-w-[120px]">{user.id}</span>
                              <Copy size={10} />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Email Cell */}
                      <td className="px-6 py-4 text-foreground/70">
                        {user.email ? (
                          <span className="truncate block max-w-xs">{user.email}</span>
                        ) : (
                          <span className="text-foreground/40 italic text-xs">None</span>
                        )}
                      </td>

                      {/* Coins Cell */}
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-xs font-semibold">
                          <Coins size={12} className="text-amber-500" />
                          <span>{(user.total_coins || 0).toLocaleString()}</span>
                        </span>
                      </td>

                      {/* Joined Date Cell */}
                      <td className="px-6 py-4 text-foreground/60 text-xs font-medium">
                        {user.created_at ? (
                          new Date(user.created_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        ) : (
                          <span className="italic text-foreground/40">Unknown</span>
                        )}
                      </td>

                      {/* Actions Cell */}
                      <td className="px-6 py-4 text-right">
                        <Link
                          to={"/madarchod.admin" as any}
                          search={{ isLogged: true, page: "user-detail", id: user.id } as any}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-foreground/15 text-foreground hover:bg-foreground/10 hover:border-foreground/30 active:scale-95 transition-all text-xs font-semibold"
                        >
                          <span>Manage</span>
                          <ChevronRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
