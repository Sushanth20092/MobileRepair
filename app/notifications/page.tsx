"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setNotifications(data || []);
        setLoading(false);
      });
  }, [user]);

  const handleMarkAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>
      <div className="bg-background rounded-lg shadow divide-y divide-gray-700 border border-gray-700">
        {loading ? (
          <div className="p-6 text-center text-muted-foreground">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">No notifications found.</div>
        ) : notifications.map((n) => (
          <div
            key={n.id}
            className={`p-4 flex flex-col sm:flex-row sm:items-center gap-2 ${!n.is_read ? "bg-blue-900/20" : ""}`}
          >
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-100 text-base line-clamp-1">{n.title}</div>
              <div className="text-sm text-gray-300 mb-1 line-clamp-2">{n.message}</div>
              <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</div>
            </div>
            <div className="flex-shrink-0 flex gap-2">
              {!n.is_read ? (
                <Button size="sm" variant="outline" onClick={() => handleMarkAsRead(n.id)}>
                  Mark as read
                </Button>
              ) : (
                <span className="text-xs text-green-500">Read</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 