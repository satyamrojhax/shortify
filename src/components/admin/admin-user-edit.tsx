import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  Save,
  Trash2,
  ShieldAlert,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  Coins,
  Mail,
  User,
  KeyRound,
  Search,
  Plus,
  X,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

interface UserRecord {
  id: string;
  name?: string;
  email?: string;
  total_coins?: number;
  password?: string;
  created_at?: string;
  [key: string]: unknown;
}

interface UserDataRow {
  id?: string;
  user_id: string;
  key: string;
  value: unknown;
  created_at?: string;
  updated_at?: string;
}

export function AdminUserEdit({ id: propId }: { id?: string } = {}) {
  let routeId = propId;
  try {
    const params = useParams({ strict: false }) as any;
    if (!routeId && params?.id) routeId = params.id;
  } catch {
    // not in Route context
  }
  if (!routeId && typeof window !== "undefined") {
    const urlParams = new URLSearchParams(window.location.search);
    routeId = urlParams.get("id") || "";
  }
  const id = routeId || "";
  const navigate = useNavigate();
  const [user, setUser] = useState<UserRecord | null>(null);
  const [userData, setUserData] = useState<UserDataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchKey, setSearchKey] = useState("");
  const [showAddKey, setShowAddKey] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [addingKey, setAddingKey] = useState(false);
  const [savingRowKey, setSavingRowKey] = useState<string | null>(null);

  // Track editable values per key
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    total_coins: 0,
    password: "",
  });

  const loadUser = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const [{ data: u }, { data: ud }] = await Promise.all([
          supabase.from("users").select("*").eq("id", id).single(),
          supabase.from("user_data").select("*").eq("user_id", id).order("key"),
        ]);
        if (u) {
          setUser(u as UserRecord);
          setFormData({
            name: u.name || "",
            email: u.email || "",
            total_coins: u.total_coins || 0,
            password: u.password || "",
          });
        }
        if (ud) {
          setUserData(ud as UserDataRow[]);
          // Initialize editing values
          const initial: Record<string, string> = {};
          for (const row of ud) {
            initial[row.key] =
              typeof row.value === "string" ? row.value : JSON.stringify(row.value);
          }
          setEditedValues(initial);
        }
        if (isManualRefresh) {
          toast.success("User data refreshed");
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to load user data");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const copyText = (text: string, label = "Copied to clipboard") => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success(label);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          name: formData.name,
          email: formData.email,
          total_coins: formData.total_coins,
          password: formData.password,
        })
        .eq("id", id);
      if (error) throw error;

      // Synchronize frontend storage keys in user_data
      const rpcResult1 = await supabase.rpc("admin_upsert_user_data", {
        p_user_id: id,
        p_key: "ig.coins",
        p_value: formData.total_coins,
      });
      const rpcResult2 = await supabase.rpc("admin_upsert_user_data", {
        p_user_id: id,
        p_key: "ig.username",
        p_value: formData.name,
      });

      if (rpcResult1.error || rpcResult2.error) {
        await supabase
          .from("user_data")
          .upsert([
            { user_id: id, key: "ig.coins", value: formData.total_coins },
            { user_id: id, key: "ig.username", value: formData.name },
          ])
          .catch(() => {});
      }

      toast.success("User updated successfully");
      // Update local user state
      setUser((prev) => (prev ? { ...prev, ...formData } : null));
    } catch (err) {
      console.error(err);
      toast.error("Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("users").delete().eq("id", id);
      if (error) throw error;
      window.location.href = "/madarchod.admin?isLogged=true&page=users";
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete user");
    } finally {
      setSaving(false);
    }
  };

  const handleValueChange = (key: string, val: string) => {
    setEditedValues((prev) => ({ ...prev, [key]: val }));
  };

  const updateDataRow = async (key: string, rawVal: string) => {
    setSavingRowKey(key);
    try {
      let parsedValue: unknown;
      try {
        parsedValue = JSON.parse(rawVal);
      } catch {
        // Allow raw string value if not valid JSON
        parsedValue = rawVal;
      }

      const rpcRes = await supabase.rpc("admin_upsert_user_data", {
        p_user_id: id,
        p_key: key,
        p_value: parsedValue,
      });
      if (rpcRes.error) {
        await supabase
          .from("user_data")
          .update({ value: parsedValue })
          .eq("user_id", id)
          .eq("key", key);
      }

      setUserData((prev) => prev.map((d) => (d.key === key ? { ...d, value: parsedValue } : d)));
      toast.success(`Updated ${key}`);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to update ${key}`);
    } finally {
      setSavingRowKey(null);
    }
  };

  const deleteDataRow = async (key: string) => {
    try {
      const rpcRes = await supabase.rpc("admin_delete_user_data", {
        p_user_id: id,
        p_key: key,
      });
      if (rpcRes.error) {
        await supabase.from("user_data").delete().eq("user_id", id).eq("key", key);
      }
      setUserData((prev) => prev.filter((d) => d.key !== key));
      setEditedValues((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      toast.success(`Deleted ${key}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete key");
    }
  };

  const handleAddNewKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedKey = newKey.trim();
    if (!trimmedKey) {
      toast.error("Key name cannot be empty");
      return;
    }
    setAddingKey(true);
    try {
      let parsedValue: unknown;
      try {
        parsedValue = JSON.parse(newValue);
      } catch {
        parsedValue = newValue;
      }

      const rpcRes = await supabase.rpc("admin_upsert_user_data", {
        p_user_id: id,
        p_key: trimmedKey,
        p_value: parsedValue,
      });
      if (rpcRes.error) {
        await supabase.from("user_data").upsert([
          {
            user_id: id,
            key: trimmedKey,
            value: parsedValue,
          },
        ]);
      }

      setUserData((prev) => {
        const filtered = prev.filter((d) => d.key !== trimmedKey);
        return [...filtered, { user_id: id, key: trimmedKey, value: parsedValue }].sort((a, b) =>
          a.key.localeCompare(b.key),
        );
      });
      setEditedValues((prev) => ({
        ...prev,
        [trimmedKey]: typeof parsedValue === "string" ? parsedValue : JSON.stringify(parsedValue),
      }));

      setNewKey("");
      setNewValue("");
      setShowAddKey(false);
      toast.success(`Added key ${trimmedKey}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to add key");
    } finally {
      setAddingKey(false);
    }
  };

  const addCoins = (amount: number) => {
    setFormData((prev) => ({ ...prev, total_coins: Math.max(0, prev.total_coins + amount) }));
  };

  const filteredUserData = useMemo(() => {
    if (!searchKey.trim()) return userData;
    const q = searchKey.toLowerCase();
    return userData.filter(
      (d) => d.key.toLowerCase().includes(q) || JSON.stringify(d.value).toLowerCase().includes(q),
    );
  }, [userData, searchKey]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center animate-pulse">
        <div className="w-12 h-12 rounded-2xl bg-foreground/10 flex items-center justify-center mb-4">
          <RefreshCw className="h-6 w-6 text-foreground/40 animate-spin" />
        </div>
        <p className="font-display text-lg text-foreground/70">loading user details...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="font-display text-2xl font-bold">User Not Found</h2>
        <p className="text-sm text-foreground/60 max-w-sm">
          The requested user could not be found or may have been deleted.
        </p>
        <Link
          to={"/madarchod.admin" as any}
          search={{ isLogged: true, page: "users" } as any}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <ArrowLeft size={16} /> Back to Users
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full space-y-6 sm:space-y-8 animate-fade-in pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to={"/madarchod.admin" as any}
          search={{ isLogged: true, page: "users" } as any}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-foreground/70 hover:text-foreground transition-all py-1.5 px-2.5 -ml-2 rounded-lg hover:bg-foreground/5 active:scale-95"
        >
          <ArrowLeft size={16} />
          <span>Back to Users</span>
        </Link>
      </div>

      {/* Header with Title & Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 border-b border-foreground/10 pb-6">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold lowercase text-foreground tracking-tight flex items-center gap-2 flex-wrap">
            <span>edit</span>
            <span className="marker-underline">{user.name || "user"}</span>
          </h1>

          {/* User Metadata Chips */}
          <div className="flex flex-wrap items-center gap-2 mt-2.5 text-xs">
            <button
              type="button"
              onClick={() => copyText(user.id, "User ID copied")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-foreground/5 border border-foreground/10 font-mono text-foreground/80 hover:bg-foreground/10 transition-colors cursor-pointer group active:scale-95"
              title="Click to copy full ID"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate max-w-[130px] sm:max-w-[220px]">ID: {user.id}</span>
              <Copy size={11} className="text-foreground/40 group-hover:text-foreground shrink-0" />
            </button>

            {formData.email && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium truncate max-w-[200px] sm:max-w-none">
                <Mail size={12} className="shrink-0" />
                <span className="truncate">{formData.email}</span>
              </span>
            )}
          </div>
        </div>

        {/* Responsive Actions: Grid on mobile, Flex on desktop */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full md:w-auto shrink-0">
          <button
            type="button"
            onClick={() => loadUser(true)}
            disabled={refreshing || saving}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl border border-foreground/20 text-foreground hover:bg-foreground/10 active:scale-95 transition-all text-xs sm:text-sm font-semibold disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 active:scale-95 transition-all text-xs sm:text-sm font-semibold disabled:opacity-60 cursor-pointer"
          >
            <Trash2 size={15} />
            <span>Delete</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-md text-xs sm:text-sm font-semibold disabled:opacity-60 cursor-pointer"
          >
            <Save size={15} className={saving ? "animate-spin" : ""} />
            <span>{saving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Profile Form & Session Data */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left Column: Account Profile */}
        <div className="space-y-6">
          <div className="bg-card/70 border border-foreground/10 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-foreground/10 pb-3">
              <User size={16} className="text-primary" />
              <h2 className="font-display uppercase tracking-widest text-xs font-bold text-foreground/80">
                Account Profile
              </h2>
            </div>

            {/* Display Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/70 flex items-center gap-1.5">
                <span>Display Name</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Username"
                  className="w-full h-10 sm:h-11 bg-background border border-foreground/20 rounded-xl px-3.5 text-sm text-foreground focus:border-foreground/50 focus:ring-2 focus:ring-foreground/5 outline-none transition-all"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/70 flex items-center gap-1.5">
                <span>Email Address</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@example.com"
                  className="w-full h-10 sm:h-11 bg-background border border-foreground/20 rounded-xl px-3.5 text-sm text-foreground focus:border-foreground/50 focus:ring-2 focus:ring-foreground/5 outline-none transition-all"
                />
              </div>
            </div>

            {/* Total Coins */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/70 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Coins size={14} className="text-amber-500" />
                  <span>Total Coins</span>
                </span>
                <span className="font-mono text-xs text-foreground/50">
                  {formData.total_coins.toLocaleString()} coins
                </span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.total_coins}
                onChange={(e) =>
                  setFormData({ ...formData, total_coins: Math.max(0, Number(e.target.value)) })
                }
                className="w-full h-10 sm:h-11 bg-background border border-foreground/20 rounded-xl px-3.5 text-sm font-mono text-foreground focus:border-foreground/50 focus:ring-2 focus:ring-foreground/5 outline-none transition-all"
              />
              {/* Quick coin adjustment pills */}
              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                <span className="text-[10px] text-foreground/50 uppercase tracking-wider font-semibold mr-1">
                  Quick Add:
                </span>
                <button
                  type="button"
                  onClick={() => addCoins(100)}
                  className="px-2 py-0.5 rounded-md bg-foreground/5 hover:bg-foreground/10 text-[11px] font-mono text-foreground/75 transition-colors border border-foreground/10"
                >
                  +100
                </button>
                <button
                  type="button"
                  onClick={() => addCoins(500)}
                  className="px-2 py-0.5 rounded-md bg-foreground/5 hover:bg-foreground/10 text-[11px] font-mono text-foreground/75 transition-colors border border-foreground/10"
                >
                  +500
                </button>
                <button
                  type="button"
                  onClick={() => addCoins(1000)}
                  className="px-2 py-0.5 rounded-md bg-foreground/5 hover:bg-foreground/10 text-[11px] font-mono text-foreground/75 transition-colors border border-foreground/10"
                >
                  +1K
                </button>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/70 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Lock size={13} className="text-foreground/50" />
                  <span>Password</span>
                </span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Set account password"
                  className="w-full h-10 sm:h-11 bg-background border border-foreground/20 rounded-xl px-3.5 pr-10 text-sm font-mono text-foreground focus:border-foreground/50 focus:ring-2 focus:ring-foreground/5 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground p-1 transition-colors"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Quick Metadata Info */}
            <div className="pt-3 border-t border-foreground/10 space-y-1.5 text-xs text-foreground/50 font-mono">
              <div className="flex items-center justify-between">
                <span>Unique ID:</span>
                <span className="truncate max-w-[150px]">{user.id}</span>
              </div>
              {user.created_at && (
                <div className="flex items-center justify-between">
                  <span>Registered:</span>
                  <span>{new Date(user.created_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Session & App Data */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card/70 border border-foreground/10 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-foreground/10 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound size={16} className="text-primary" />
                <h2 className="font-display uppercase tracking-widest text-xs font-bold text-foreground/80">
                  Session & App Data
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-foreground/10 text-[11px] font-mono font-medium text-foreground/70">
                  {userData.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1 text-[11px] text-amber-500 font-medium bg-amber-500/10 px-2 py-0.5 rounded-md">
                  <ShieldAlert size={13} />
                  <span>Careful</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddKey(!showAddKey)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-foreground/10 hover:bg-foreground/15 text-xs font-semibold text-foreground transition-colors cursor-pointer"
                >
                  {showAddKey ? <X size={13} /> : <Plus size={13} />}
                  <span>{showAddKey ? "Close" : "Add Key"}</span>
                </button>
              </div>
            </div>

            {/* Add New Key Form (Collapsible) */}
            {showAddKey && (
              <form
                onSubmit={handleAddNewKey}
                className="p-3.5 sm:p-4 rounded-xl border border-foreground/15 bg-background space-y-3 animate-fade-in"
              >
                <div className="text-xs font-bold uppercase tracking-wider text-foreground/70">
                  Add New Data Key
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-medium text-foreground/60 mb-1 block">
                      Key Name (e.g. ig.pin)
                    </label>
                    <input
                      type="text"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      placeholder="key_name"
                      className="w-full h-9 bg-card border border-foreground/20 rounded-lg px-2.5 text-xs font-mono text-foreground focus:border-foreground/50 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-foreground/60 mb-1 block">
                      Value (String, Number, or JSON)
                    </label>
                    <input
                      type="text"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      placeholder='"true" or 100 or {"foo": "bar"}'
                      className="w-full h-9 bg-card border border-foreground/20 rounded-lg px-2.5 text-xs font-mono text-foreground focus:border-foreground/50 outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddKey(false)}
                    className="px-3 py-1.5 rounded-lg border border-foreground/15 text-xs font-semibold hover:bg-foreground/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingKey}
                    className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {addingKey ? "Adding..." : "Add Key"}
                  </button>
                </div>
              </form>
            )}

            {/* Filter Search Box (Super helpful on mobile when having 20+ keys) */}
            {userData.length > 3 && (
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
                />
                <input
                  type="text"
                  value={searchKey}
                  onChange={(e) => setSearchKey(e.target.value)}
                  placeholder="Filter keys or values..."
                  className="w-full h-9 bg-background/80 border border-foreground/15 rounded-xl pl-8 pr-3 text-xs text-foreground placeholder:text-foreground/40 focus:border-foreground/40 outline-none transition-all"
                />
                {searchKey && (
                  <button
                    type="button"
                    onClick={() => setSearchKey("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground p-1"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            {/* App Data Rows */}
            <div className="space-y-3">
              {userData.length === 0 ? (
                <div className="py-8 text-center text-sm text-foreground/50 italic border border-dashed border-foreground/10 rounded-xl">
                  No app data stored for this user yet.
                </div>
              ) : filteredUserData.length === 0 ? (
                <div className="py-6 text-center text-xs text-foreground/50">
                  No keys match "{searchKey}".
                </div>
              ) : (
                filteredUserData.map((d) => {
                  const currentValue =
                    editedValues[d.key] !== undefined
                      ? editedValues[d.key]
                      : typeof d.value === "string"
                        ? d.value
                        : JSON.stringify(d.value);
                  const originalString =
                    typeof d.value === "string" ? d.value : JSON.stringify(d.value);
                  const isModified = currentValue !== originalString;
                  const isSavingThis = savingRowKey === d.key;

                  return (
                    <div
                      key={d.key}
                      className="p-3 sm:p-3.5 rounded-xl border border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/[0.04] transition-all flex flex-col gap-2"
                    >
                      {/* Top Header Row of Data Item: Key Name, Copy Button & Delete */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="font-mono text-xs font-semibold text-foreground/90 truncate select-all"
                            title={d.key}
                          >
                            {d.key}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyText(d.key, "Key name copied")}
                            className="text-foreground/40 hover:text-foreground p-1 transition-colors rounded shrink-0 cursor-pointer"
                            title="Copy key name"
                          >
                            <Copy size={11} />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => deleteDataRow(d.key)}
                          className="p-1.5 rounded-lg text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 cursor-pointer"
                          title={`Delete ${d.key}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Value Input (Full Width on Mobile!) */}
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1 min-w-0">
                          <input
                            type="text"
                            value={currentValue}
                            onChange={(e) => handleValueChange(d.key, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && isModified) {
                                e.preventDefault();
                                updateDataRow(d.key, currentValue);
                              }
                            }}
                            className={`w-full h-9 bg-background border rounded-lg px-2.5 text-xs font-mono text-foreground focus:outline-none transition-all ${
                              isModified
                                ? "border-amber-500/60 ring-1 ring-amber-500/20"
                                : "border-foreground/20 focus:border-foreground/50"
                            }`}
                            placeholder="Value..."
                          />
                        </div>

                        {/* Save Button for Modified Value */}
                        {isModified && (
                          <button
                            type="button"
                            onClick={() => updateDataRow(d.key, currentValue)}
                            disabled={isSavingThis}
                            className="h-9 px-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                          >
                            {isSavingThis ? (
                              <RefreshCw size={12} className="animate-spin" />
                            ) : (
                              <Check size={12} />
                            )}
                            <span className="hidden sm:inline">Save</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete User Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-card border border-foreground/15 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl bg-destructive/15 text-destructive shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-lg font-bold text-foreground lowercase">
                  delete user account?
                </h3>
                <p className="text-xs sm:text-sm text-foreground/70 leading-relaxed">
                  Are you sure you want to permanently delete{" "}
                  <strong className="text-foreground">{user.name || "this user"}</strong>? All
                  associated courses, progress, coins, and internal storage data will be deleted
                  forever.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl border border-foreground/20 text-foreground font-semibold text-xs sm:text-sm hover:bg-foreground/5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-semibold text-xs sm:text-sm hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 size={15} />
                <span>{saving ? "Deleting..." : "Yes, Delete User"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
