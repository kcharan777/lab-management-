import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';

export default function NotificationDrawer({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = (item) => {
    if (!item.isRead) {
      api.patch(`/notifications/${item._id}/read`).catch(() => {});
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    onClose();
    if (item.complaintId) {
      navigate('/student-hub');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'RESOLUTION':
        return <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span>;
      case 'REJECTION':
        return <span className="material-symbols-outlined text-error text-[20px]">cancel</span>;
      case 'VERIFICATION_REQUIRED':
        return <span className="material-symbols-outlined text-primary text-[20px]">verified_user</span>;
      case 'ASSIGNMENT':
        return <span className="material-symbols-outlined text-purple-600 text-[20px]">engineering</span>;
      default:
        return <span className="material-symbols-outlined text-tertiary text-[20px]">info</span>;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-12 w-80 sm:w-96 bg-surface-container-lowest border border-outline-variant/40 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
      {/* Header */}
      <div className="p-3.5 bg-surface-container flex items-center justify-between border-b border-outline-variant/30">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">notifications</span>
          <span className="font-headline-sm text-body-sm font-bold text-on-surface">Campus Alerts</span>
          {unreadCount > 0 && (
            <span className="font-label-sm text-label-sm bg-primary text-on-primary px-1.5 py-0.2 rounded-full font-bold">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-body-sm text-primary hover:underline font-semibold cursor-pointer text-[12px]"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-outline-variant/20">
        {loading && notifications.length === 0 ? (
          <div className="p-6 text-center text-secondary text-body-sm">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading alerts...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-secondary text-body-sm space-y-1">
            <span className="material-symbols-outlined text-[32px] text-slate-400">notifications_off</span>
            <p className="font-medium text-on-surface">No alerts yet</p>
            <p className="text-[12px]">You will be notified when grievances progress through verification.</p>
          </div>
        ) : (
          notifications.map(item => (
            <div
              key={item._id}
              onClick={() => handleNotificationClick(item)}
              className={`p-3.5 hover:bg-surface-container-low transition-colors cursor-pointer flex items-start gap-3 ${
                !item.isRead ? 'bg-primary/5' : ''
              }`}
            >
              <div className="p-1 rounded-lg bg-surface-container-high shrink-0 mt-0.5">
                {getNotificationIcon(item.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-1">
                  <h5 className={`font-body-sm text-body-sm truncate ${!item.isRead ? 'font-bold text-on-surface' : 'font-medium text-on-surface-variant'}`}>
                    {item.title}
                  </h5>
                  <span className="font-label-sm text-[10px] text-secondary font-mono shrink-0">
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-body-sm text-[12px] text-secondary line-clamp-2 mt-0.5 leading-snug">
                  {item.message}
                </p>
              </div>
              {!item.isRead && (
                <button
                  onClick={(e) => handleMarkAsRead(item._id, e)}
                  title="Mark as read"
                  className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 self-center hover:scale-125 transition-transform"
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
