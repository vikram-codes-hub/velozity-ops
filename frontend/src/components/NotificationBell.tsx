// frontend/src/components/NotificationBell.tsx
//
// Badge + dropdown powered by useNotifications hook.
// Badge count arrives live via WebSocket; dropdown list is fetched lazily on first open.

import { useEffect, useRef, useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadFirstPage,
    loadMore,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function toggleDropdown() {
    if (isOpen) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
      await loadFirstPage();
    }
  }

  return (
    <div className="notification-bell" ref={containerRef}>
      <button
        type="button"
        className="notification-bell__trigger"
        onClick={toggleDropdown}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      >
        🔔
        {unreadCount > 0 && (
          <span className="notification-bell__badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-bell__dropdown">
          <div className="notification-bell__header">
            <span>Notifications</span>
            {notifications.some((n) => !n.read) && (
              <button type="button" onClick={markAllAsRead}>
                Mark all as read
              </button>
            )}
          </div>

          {isLoading && <div className="notification-bell__state">Loading…</div>}
          {error && (
            <div className="notification-bell__state notification-bell__state--error">
              {error}
            </div>
          )}
          {!isLoading && !error && notifications.length === 0 && (
            <div className="notification-bell__state">No notifications yet.</div>
          )}

          <ul className="notification-bell__list">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`notification-bell__item ${
                  n.read ? '' : 'notification-bell__item--unread'
                }`}
                onClick={() => !n.read && markAsRead(n.id)}
              >
                <span className="notification-bell__message">{n.message}</span>
                <span className="notification-bell__time">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </span>
              </li>
            ))}
          </ul>

          {hasMore && (
            <button
              type="button"
              className="notification-bell__load-more"
              onClick={loadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}