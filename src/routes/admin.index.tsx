import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Video, Heart, Bookmark } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    likes: 0,
    saves: 0,
    views: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [usersReq, likesReq, savesReq, viewsReq] = await Promise.all([
          supabase.from("users").select("id", { count: "exact", head: true }),
          supabase.from("user_liked_reels").select("id", { count: "exact", head: true }),
          supabase.from("user_saved_reels").select("id", { count: "exact", head: true }),
          supabase.from("user_watch_history").select("id", { count: "exact", head: true }),
        ]);

        setStats({
          users: usersReq.count || 0,
          likes: likesReq.count || 0,
          saves: savesReq.count || 0,
          views: viewsReq.count || 0,
        });
      } catch (err) {
        console.error("Failed to load stats", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div>
      <h1 className="font-display text-4xl mb-2 lowercase text-foreground">admin <span className="marker-underline">dashboard</span></h1>
      <p className="text-foreground/60 mb-8">welcome back, satyamrojha. here is a snapshot of your platform.</p>

      {loading ? (
        <div className="animate-pulse flex gap-4">
          <div className="h-32 flex-1 bg-foreground/5 rounded-xl border border-foreground/10" />
          <div className="h-32 flex-1 bg-foreground/5 rounded-xl border border-foreground/10" />
          <div className="h-32 flex-1 bg-foreground/5 rounded-xl border border-foreground/10" />
          <div className="h-32 flex-1 bg-foreground/5 rounded-xl border border-foreground/10" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="total users" value={stats.users} icon={<Users />} />
          <StatCard title="total likes" value={stats.likes} icon={<Heart />} />
          <StatCard title="total saves" value={stats.saves} icon={<Bookmark />} />
          <StatCard title="total views" value={stats.views} icon={<Video />} />
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: number, icon: React.ReactNode }) {
  return (
    <div className="bg-background border border-foreground/10 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
      <div className="absolute -right-4 -top-4 text-foreground/5 opacity-50 group-hover:scale-110 transition-transform duration-500 [&>svg]:w-24 [&>svg]:h-24">
        {icon}
      </div>
      <div className="relative">
        <h3 className="text-foreground/60 font-display uppercase tracking-widest text-xs mb-2">{title}</h3>
        <p className="text-4xl font-display text-foreground">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}
