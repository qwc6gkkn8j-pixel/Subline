import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContext {
  show: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastCtx = createContext<ToastContext | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const value: ToastContext = {
    show,
    success: (m) => show(m, 'success'),
    error: (m) => show(m, 'error'),
  };

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed top-4 inset-x-0 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-card shadow-card-lg',
              'bg-card border max-w-sm w-full animate-slide-up',
              t.type === 'success' && 'border-success/30',
              t.type === 'error' && 'border-danger/30',
              t.type === 'info' && 'border-line',
            )}
          >
            {t.type === 'success' && <CheckCircle2 className="text-success shrink-0" size={20} />}
            {t.type === 'error' && <AlertCircle className="text-danger shrink-0" size={20} />}
            <p className="text-sm text-ink flex-1">{t.message}</p>
            <button
              type="button"
              onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
              className="text-muted hover:text-ink"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastContext {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
