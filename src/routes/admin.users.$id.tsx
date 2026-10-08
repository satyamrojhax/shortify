import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Save, Trash2, ShieldAlert, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/admin/users/$id")({
  component: AdminUserEdit,
});

function AdminUserEdit() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", total_coins: 0 });

  const loadUser = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [{ data: u }, { data: ud }] = await Promise.all([
        supabase.from("users").select("*").eq("id", id).single(),
        supabase.from("user_data").select("*").eq("user_id", id).order("key"),
      ]);
      if (u) {
        setUser(u);
        setFormData({ name: u.name || "", email: u.email || "", total_coins: u.total_coins || 0 });
      }
      if (ud) setUserData(ud);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("users").update({
        name: formData.name,
        email: formData.email,
        total_coins: formData.total_coins
      }).eq("id", id);
      if (error) throw error;
      
      // Also update the app data since the frontend reads from user_data
      await supabase.from("user_data").upsert([
        { user_id: id, key: "ig.coins", value: formData.total_coins },
        { user_id: id, key: "ig.username", value: formData.name }
      ]);
      
      alert("User updated successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this user and ALL their data?")) return;
    setSaving(true);
    try {
      await supabase.from("users").delete().eq("id", id);
      navigate({ to: "/admin/users" });
    } catch (err) {
      console.error(err);
      alert("Failed to delete user");
    } finally {
      setSaving(false);
    }
  };

  const updateDataRow = async (key: string, value: string) => {
    try {
      const parsedValue = JSON.parse(value);
      await supabase.from("user_data").update({ value: parsedValue }).eq("user_id", id).eq("key", key);
      alert(`Updated ${key}`);
    } catch (err) {
      alert("Invalid JSON value");
    }
  };

  const deleteDataRow = async (key: string) => {
    if (!confirm(`Delete ${key}?`)) return;
    try {
      await supabase.from("user_data").delete().eq("user_id", id).eq("key", key);
      setUserData(prev => prev.filter(d => d.key !== key));
    } catch(err) {
      alert("Failed to delete");
    }
  };

  if (loading) return <div className="animate-pulse p-10 font-display">loading user data...</div>;
  if (!user) return <div>User not found.</div>;

  return (
    <div>
      <div className="mb-6">
        <Link to="/admin/users" className="inline-flex items-center gap-2 text-sm font-medium text-foreground/60 hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> back to users
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
        <div>
          <h1 className="font-display text-4xl mb-2 lowercase text-foreground">edit <span className="marker-underline">user</span></h1>
          <p className="text-foreground/60">Manage account details and internal data for {user.name}.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => loadUser(true)}
            disabled={refreshing || saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-foreground/30 text-foreground hover:bg-foreground/10 transition-colors font-display text-sm uppercase tracking-widest"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> {refreshing ? "refreshing..." : "refresh"}
          </button>
          <button 
            onClick={handleDelete}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors font-display text-sm uppercase tracking-widest"
          >
            <Trash2 size={16} /> delete
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors font-display text-sm uppercase tracking-widest"
          >
            <Save size={16} /> {saving ? "saving..." : "save changes"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="bg-background border border-foreground/10 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-display uppercase tracking-widest text-xs text-foreground/60 mb-4 border-b border-foreground/10 pb-2">Profile</h3>
            <label className="block">
              <span className="text-xs font-medium text-foreground/60 mb-1 block">Display Name</span>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-background border border-foreground/20 rounded-lg px-3 py-2 text-sm focus:border-foreground/50 outline-none" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-foreground/60 mb-1 block">Email</span>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-background border border-foreground/20 rounded-lg px-3 py-2 text-sm focus:border-foreground/50 outline-none" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-foreground/60 mb-1 block">Total Coins</span>
              <input type="number" value={formData.total_coins} onChange={e => setFormData({...formData, total_coins: Number(e.target.value)})} className="w-full bg-background border border-foreground/20 rounded-lg px-3 py-2 text-sm focus:border-foreground/50 outline-none" />
            </label>
            <div className="pt-2 text-xs text-foreground/40 font-mono">ID: {user.id}</div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-background border border-foreground/10 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-foreground/10 pb-2 mb-4">
              <h3 className="font-display uppercase tracking-widest text-xs text-foreground/60">Session & App Data</h3>
              <div className="flex items-center gap-1 text-xs text-amber-500 font-medium bg-amber-500/10 px-2 py-1 rounded">
                <ShieldAlert size={14} /> Handle with care
              </div>
            </div>
            
            <div className="space-y-4">
              {userData.length === 0 ? (
                <div className="text-sm text-foreground/50 italic">No app data stored for this user yet.</div>
              ) : userData.map(d => (
                <div key={d.key} className="flex gap-2">
                  <input type="text" readOnly value={d.key} className="w-1/3 bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-xs font-mono text-foreground/60 outline-none" />
                  <input 
                    type="text" 
                    defaultValue={JSON.stringify(d.value)} 
                    onBlur={(e) => {
                      if (e.target.value !== JSON.stringify(d.value)) {
                        updateDataRow(d.key, e.target.value);
                      }
                    }}
                    className="flex-1 bg-background border border-foreground/20 rounded-lg px-3 py-2 text-xs font-mono focus:border-foreground/50 outline-none" 
                  />
                  <button onClick={() => deleteDataRow(d.key)} className="px-3 rounded-lg border border-destructive/20 text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
