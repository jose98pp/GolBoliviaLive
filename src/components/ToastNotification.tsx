import React, { useEffect } from 'react';
import { Bell, X, Sparkles } from 'lucide-react';
import { NotificationItem } from '../types/football';

interface ToastNotificationProps {
  notification: NotificationItem | null;
  onDismiss: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  notification,
  onDismiss,
}) => {
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 6000);
    return () => clearTimeout(timer);
  }, [notification, onDismiss]);

  if (!notification) return null;

  return (
    <div className="fixed top-16 right-4 z-50 max-w-sm w-full animate-bounce duration-300">
      <div className="p-3.5 rounded-2xl bg-[#0c1424]/95 border border-emerald-500/50 shadow-2xl backdrop-blur-md text-white flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
          <Bell className="w-4 h-4" />
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 font-display uppercase tracking-wide">
              {notification.title}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{notification.timestamp}</span>
          </div>
          <p className="text-xs text-slate-200 mt-1 leading-snug">{notification.body}</p>
        </div>

        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-md"
          aria-label="Cerrar notificación"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
