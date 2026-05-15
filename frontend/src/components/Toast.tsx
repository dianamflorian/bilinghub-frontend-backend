// ============================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================

import React, { createContext, useContext, useCallback, useState } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

const TOAST_STYLES: Record<ToastType, string> = {
  success: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
  error: 'bg-red-500/20 border-red-500/40 text-red-300',
  warning: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
  info: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
};

const ICON_STYLES: Record<ToastType, string> = {
  success: 'bg-emerald-500/30 text-emerald-400',
  error: 'bg-red-500/30 text-red-400',
  warning: 'bg-amber-500/30 text-amber-400',
  info: 'bg-blue-500/30 text-blue-400',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = `toast_${Date.now()}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  const success = useCallback(
    (title: string, message?: string) => showToast('success', title, message),
    [showToast]
  );
  const error = useCallback(
    (title: string, message?: string) => showToast('error', title, message),
    [showToast]
  );
  const info = useCallback(
    (title: string, message?: string) => showToast('info', title, message),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}
      {/* Toast portal */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-sm
              shadow-lg pointer-events-auto animate-slide-up
              ${TOAST_STYLES[toast.type]}`}
            role="alert"
          >
            <span
              className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold
                ${ICON_STYLES[toast.type]}`}
            >
              {TOAST_ICONS[toast.type]}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{toast.title}</p>
              {toast.message && (
                <p className="text-xs opacity-80 mt-0.5 leading-relaxed">
                  {toast.message}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
