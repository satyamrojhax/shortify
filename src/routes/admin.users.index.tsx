import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Search, ChevronRight, User } from "lucide-react";

export const Route = createFileRoute("/admin/users/")({
  component: AdminUsers,
});

function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadUsers() {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .order("created_at", { ascending: false });
        if (data) setUsers(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  const filtered = users.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-4xl mb-2 lowercase text-foreground">user <span className="marker-underline">management</span></h1>
          <p className="text-foreground/60">view and manage all registered users.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" size={18} />
          <input 
            type="text" 
            placeholder="Search users..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full md:w-64 bg-background border border-foreground/20 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-foreground/50 transition-colors"
          />
        </div>
      </div>

      <div className="bg-background border border-foreground/10 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-foreground/60 animate-pulse font-display">loading users...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-foreground/60 font-display">no users found.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-foreground/5 text-foreground/60 font-display uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium hidden md:table-cell">Email</th>
                <th className="px-6 py-4 font-medium hidden lg:table-cell">Joined</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/10">
              {filtered.map(user => (
                <tr key={user.id} className="hover:bg-foreground/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center text-foreground/50">
                        <User size={20} />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{user.name || "Unknown"}</div>
                        <div className="text-xs text-foreground/50 md:hidden">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-foreground/70 hidden md:table-cell">{user.email}</td>
                  <td className="px-6 py-4 text-foreground/70 hidden lg:table-cell">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      to={`/admin/users/${user.id}`}
                      className="inline-flex items-center gap-1 text-xs font-display uppercase tracking-widest text-foreground hover:text-foreground/70 transition-colors"
                    >
                      manage <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
