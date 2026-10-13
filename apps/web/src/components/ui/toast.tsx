'use client';

import * as React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type?: 'success' | 'warning' | 'error' | 'info';
}

interface ToastContextType {
  toast: (options: Omit<ToastMessage, 'id'>) => void;
  toasts: ToastMessage[];
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const toast = React.useCallback(
    ({ title, description, type = 'info' }: Omit<ToastMessage, 'id'>) => {
      const id = 'toast-' + Math.random().toString(36).substr(2, 9);
      setToasts((prev) => [...prev, { id, title, description, type }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, toasts, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          const icons = {
            success: <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />,
            warning: <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />,
            error: <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />,
            info: <Info className="h-5 w-5 text-navy-600 flex-shrink-0" />,
          };
          const borders = {
            success: 'border-emerald-200 bg-emerald-50/95',
            warning: 'border-amber-200 bg-amber-50/95',
            error: 'border-red-200 bg-red-50/95',
            info: 'border-navy-200 bg-navy-50/95',
          };

          return (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur transition-all duration-200 animate-in slide-in-from-bottom-2',
                borders[t.type || 'info']
              )}
            >
              {icons[t.type || 'info']}
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">{t.title}</p>
                {t.description && <p className="text-xs text-slate-600 mt-0.5">{t.description}</p>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
