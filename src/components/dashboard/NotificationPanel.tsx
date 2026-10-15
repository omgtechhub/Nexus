import { X, CheckCheck, Bell } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { cn } from '../../utils/cn';
import { Badge } from '../ui/Badge';

import { useDismissOnEscape } from '../../hooks/useDismissOnEscape';
export function NotificationPanel() {
  const { notifications, notificationPanelOpen, setNotificationPanelOpen, markNotificationRead, markAllRead, unreadCount } = useApp();
  useDismissOnEscape(notificationPanelOpen, () => setNotificationPanelOpen(false));

  if (!notificationPanelOpen) return null;

  const typeToVariant = (type: string) => {
    switch (type) {
      case 'success': return 'success' as const;
      case 'warning': return 'warning' as const;
      case 'error': return 'error' as const;
      default: return 'info' as const;
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={() => setNotificationPanelOpen(false)} aria-hidden="true" />
      <div className="fixed top-16 right-4 w-80 bg-[var(--surface-2)] border border-[var(--ink)]/20 rounded-2xl shadow-2xl z-40 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--ink)]/10">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-secondary" />
            <h3 className="text-sm font-semibold text-primary">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs bg-[#FF5F56] text-white px-1.5 py-0.5 rounded-full font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-[var(--brand-yellow-ink)] hover:text-[var(--brand-green-ink)] transition-colors"
              >
                <CheckCheck size={12} />
                Mark all read
              </button>
            )}
            <button aria-label="Close notifications"
              onClick={() => setNotificationPanelOpen(false)}
              className="p-1 rounded-lg text-muted hover:text-primary hover:bg-[var(--ink)]/10 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Notifications list */}
        <div className="max-h-96 overflow-y-auto scrollbar-hide">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted text-sm">
              No notifications yet
            </div>
          ) : (
            notifications.map(notification => (
              <div
                key={notification.id}
                onClick={() => markNotificationRead(notification.id)}
                className={cn(
                  'p-4 border-b border-[var(--ink)]/5 cursor-pointer hover:bg-[var(--ink)]/5 transition-colors',
                  !notification.read && 'bg-[#FFBD2E]/5'
                )}
              >
                <div className="flex items-start gap-3">
                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-[#27C93F] flex-shrink-0 mt-1.5" />
                  )}
                  {notification.read && <div className="w-2 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-primary truncate">
                        {notification.title}
                      </span>
                      <Badge variant={typeToVariant(notification.type)} size="sm">
                        {notification.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">{notification.message}</p>
                    <p className="text-[10px] text-muted mt-1">{notification.time}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--ink)]/10">
          <button
            onClick={() => { setNotificationPanelOpen(false); }}
            className="w-full text-xs text-center text-[var(--brand-yellow-ink)] hover:text-[var(--brand-green-ink)] py-1 transition-colors"
          >
            View all notifications →
          </button>
        </div>
      </div>
    </>
  );
}
