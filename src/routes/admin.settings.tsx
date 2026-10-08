import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const [maintenance, setMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data, error } = await supabase
          .from("platform_settings")
          .select("value")
          .eq("key", "maintenance")
          .single();
        if (error && error.code !== 'PGRST116') throw error; // ignore if not found
        if (data) {
          setMaintenance(data.value === 'true' || data.value === true);
        }
      } catch (err) {
        console.error("Failed to load settings", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const toggleMaintenance = async () => {
    const newVal = !maintenance;
    setMaintenance(newVal);
    try {
      await supabase.from("platform_settings").upsert({
        key: "maintenance",
        value: newVal,
      });
    } catch (err) {
      console.error(err);
      setMaintenance(!newVal);
      alert("Failed to update maintenance mode");
    }
  };

  const apis = [
    { name: "VITE_SUPABASE_URL", value: import.meta.env.VITE_SUPABASE_URL },
    { name: "VITE_SUPABASE_PUBLISHABLE_KEY", value: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
  ];

  return (
    <div>
      <h1 className="font-display text-4xl mb-2 lowercase text-foreground">admin <span className="marker-underline">settings</span></h1>
      <p className="text-foreground/60 mb-8">configure global platform parameters.</p>

      <div className="bg-background border border-foreground/10 rounded-2xl p-6 shadow-sm max-w-2xl">
        <div className="space-y-6">
          <div>
            <h3 className="font-medium text-foreground mb-1">Maintenance Mode</h3>
            <p className="text-sm text-foreground/60 mb-3">Temporarily disable access to the platform for all non-admin users.</p>
            <button 
              onClick={toggleMaintenance}
              disabled={loading}
              className={`px-4 py-2 font-display text-sm uppercase tracking-widest rounded-lg transition-colors ${maintenance ? "bg-red-500/20 text-red-500 hover:bg-red-500/30" : "bg-foreground/10 hover:bg-foreground/20 text-foreground"}`}
            >
              {loading ? "Loading..." : maintenance ? "Disable Maintenance" : "Enable Maintenance"}
            </button>
          </div>
          
          <div className="pt-4 border-t border-foreground/10">
            <h3 className="font-medium text-foreground mb-1">Environment Config</h3>
            <p className="text-sm text-foreground/60 mb-3">Public API keys and endpoints currently in use.</p>
            <div className="space-y-3">
              {apis.map(api => (
                <div key={api.name}>
                  <label className="text-xs text-foreground/60 mb-1 block">{api.name}</label>
                  <input type="text" value={api.value || ""} disabled className="w-full bg-foreground/5 border border-foreground/10 rounded-lg px-3 py-2 text-sm outline-none opacity-60 font-mono" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
