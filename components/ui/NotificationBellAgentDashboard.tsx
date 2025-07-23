// NotificationBellAgentDashboard.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/api';

interface NotificationBellAgentDashboardProps {
  userId: string;
}

const NOTIF_TYPES = ['new_booking', 'chat_message_user', 'booking_status_change'];

export const NotificationBellAgentDashboard: React.FC<NotificationBellAgentDashboardProps> = ({ userId }) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .in('type', NOTIF_TYPES)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setNotifications(data || []);
        setUnreadCount((data || []).filter((n: any) => !n.is_read).length);
        setLoading(false);
      });
  }, [userId, open]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleMarkAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="relative p-2 rounded-full hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
      >
        <Bell className="h-6 w-6 text-gray-700 dark:text-gray-200" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[95vw] bg-background border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 font-semibold flex items-center justify-between bg-gray-50 dark:bg-gray-900">
            Notifications
            <button className="text-xs text-muted-foreground hover:underline" onClick={() => setOpen(false)}>Close</button>
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">No notifications</div>
            ) : notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition flex flex-col ${!n.is_read ? "bg-blue-100/30 dark:bg-blue-900/30" : ""}`}
                onClick={() => handleMarkAsRead(n.id)}
              >
                <div className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1 line-clamp-1">{n.title}</div>
                <div className="text-xs text-gray-700 dark:text-gray-300 mb-1 line-clamp-2">{n.message}</div>
                <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 