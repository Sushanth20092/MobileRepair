"use client"

import { Bell } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface NotificationDropdownProps {
  notifications: any[]
  unreadCount: number
  notifOpen: boolean
  notifLoading: boolean
  onToggle: () => void
  onMarkAsRead: (id: string) => void
  onClose: () => void
}

export default function NotificationDropdown({
  notifications,
  unreadCount,
  notifOpen,
  notifLoading,
  onToggle,
  onMarkAsRead,
  onClose
}: NotificationDropdownProps) {
  return (
    <div className="relative">
      <button
        className="relative p-2 rounded-full hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
        onClick={onToggle}
        aria-label="Notifications"
      >
        <Bell className="h-6 w-6 text-gray-200" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
            {unreadCount}
          </span>
        )}
      </button>
      
      {/* Dropdown */}
      {notifOpen && (
        <div className="absolute right-0 mt-2 w-80 max-w-[95vw] bg-background border border-gray-700 rounded-lg shadow-2xl z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-700 font-semibold text-gray-100 flex items-center justify-between bg-gray-900">
            Notifications
            <button className="text-xs text-muted-foreground hover:underline" onClick={onClose}>
              Close
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-800 bg-gray-900">
            {notifLoading ? (
              <div className="p-4 text-center text-muted-foreground">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">No notifications</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 cursor-pointer hover:bg-gray-800 transition flex flex-col ${!n.is_read ? "bg-blue-900/30" : ""}`}
                  onClick={() => onMarkAsRead(n.id)}
                >
                  <div className="font-medium text-gray-100 text-sm mb-1 line-clamp-1">{n.title}</div>
                  <div className="text-xs text-gray-300 mb-1 line-clamp-2">{n.message}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
} 