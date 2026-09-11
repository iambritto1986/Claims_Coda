import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';

export type NotificationType = 'info' | 'success' | 'error';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  notify: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  const remove = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={clsx(
                "pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md",
                n.type === 'info' ? "bg-brand-surface/90 border-brand-border text-brand-text" :
                n.type === 'success' ? "bg-brand-surface/90 border-brand-gold/50 text-brand-text" :
                "bg-[#1A0B0B]/90 border-red-900/50 text-red-200"
              )}
            >
              <div className="mt-0.5 shrink-0">
                {n.type === 'info' && <Info className="w-5 h-5 text-brand-gold-muted" />}
                {n.type === 'success' && <CheckCircle2 className="w-5 h-5 text-brand-gold" />}
                {n.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
              </div>
              <p className="flex-1 text-sm leading-relaxed">{n.message}</p>
              <button 
                onClick={() => remove(n.id)} 
                className="text-brand-text-muted hover:text-brand-text transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
