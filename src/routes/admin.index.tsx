import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Video, Heart, Bookmark, Flame } from "lucide-react";

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
  const [logs, setLogs] = useState<{type: string, user_id: string, username: string, reel_id: string, date: Date}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [usersReq, userDataReq, recentViewsReq, recentLikesReq, recentSavesReq] = await Promise.all([
          supabase.from("users").select("id", { count: "exact", head: true }),
          supabase.from("user_data").select("key, value"),
          supabase.from("user_watch_history").select("user_id, reel_id, watched_at, users(name, profile_details)").order("watched_at", { ascending: false }).limit(10),
          supabase.from("user_liked_reels").select("user_id, reel_id, created_at, users(name, profile_details)").order("created_at", { ascending: false }).limit(10),
          supabase.from("user_saved_reels").select("user_id, reel_id, created_at, users(name, profile_details)").order("created_at", { ascending: false }).limit(10),
        ]);

        let totalLikes = 0;
        let totalSaves = 0;
        let totalViews = 0;
        let activeStreaks = 0;

        if (userDataReq.data) {
          userDataReq.data.forEach((row: any) => {
            if (row.key === "ig.liked" && Array.isArray(row.value)) totalLikes += row.value.length;
            if (row.key === "ig.saved" && Array.isArray(row.value)) totalSaves += row.value.length;
            if (row.key === "ig.watched_count" && typeof row.value === "number") totalViews += row.value;
            if (row.key === "ig.streak" && row.value && typeof row.value === "object") {
              const streak = row.value;
              const today = new Date().toISOString().split("T")[0];
              // If the streak is at least 1 and was active either today or yesterday, count it as active
              if (streak.current > 0 && streak.lastActive) {
                const last = new Date(streak.lastActive);
                const curr = new Date(today);
                const diffDays = Math.floor(Math.abs(curr.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays <= 1) activeStreaks += 1;
              }
            }
          });
        }

        const getUsername = (u: any) => {
          if (!u) return "unknown";
          const userObj = Array.isArray(u) ? u[0] : u;
          return userObj?.profile_details?.username || userObj?.name || "unknown";
        };

        const combinedLogs = [
          ...(recentViewsReq.data || []).map((r: any) => ({ type: 'view', user_id: r.user_id, username: getUsername(r.users), reel_id: r.reel_id, date: new Date(r.watched_at) })),
          ...(recentLikesReq.data || []).map((r: any) => ({ type: 'like', user_id: r.user_id, username: getUsername(r.users), reel_id: r.reel_id, date: new Date(r.created_at) })),
          ...(recentSavesReq.data || []).map((r: any) => ({ type: 'save', user_id: r.user_id, username: getUsername(r.users), reel_id: r.reel_id, date: new Date(r.created_at) })),
        ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 15);

        setStats({
          users: usersReq.count || 0,
          likes: totalLikes,
          saves: totalSaves,
          views: totalViews,
          streaks: activeStreaks,
        } as any);
        setLogs(combinedLogs);
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
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <StatCard title="total users" value={stats.users} icon={<Users />} />
            <StatCard title="total likes" value={stats.likes} icon={<Heart />} />
            <StatCard title="total saves" value={stats.saves} icon={<Bookmark />} />
            <StatCard title="total views" value={stats.views} icon={<Video />} />
            <StatCard title="active streaks" value={(stats as any).streaks} icon={<Flame />} />
          </div>
          
          <div className="bg-background border border-foreground/10 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-display mb-4 text-foreground lowercase">recent activity logs</h2>
            {logs.length === 0 ? (
              <p className="text-foreground/60 text-sm">no recent activity</p>
            ) : (
              <div className="space-y-4">
                {logs.map((log, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-foreground/5 border border-foreground/5">
                    <div className="flex items-center gap-4 mb-2 sm:mb-0">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-white text-xs uppercase tracking-wider ${log.type === 'like' ? 'bg-rose-500' : log.type === 'save' ? 'bg-amber-500' : 'bg-blue-500'}`}>
                        {log.type}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">@{log.username}</div>
                        <div className="text-xs text-foreground/60 mt-0.5">
                          {log.type === 'view' ? 'Watched' : log.type === 'like' ? 'Liked' : 'Saved'} reel <span className="font-mono text-foreground/80">{log.reel_id.slice(0, 8)}...</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-medium text-foreground/50 sm:text-right">
                      {log.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} <br className="hidden sm:block" /> 
                      {log.date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
