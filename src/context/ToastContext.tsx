import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  showToast: (title: string, type?: ToastType, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((title: string, type: ToastType = 'info', message?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4">
        {toasts.map((toast) => {
          let bgClass = 'bg-white border-[#D8CBE8] text-[#5D4634]';
          let Icon = Info;
          let iconColor = 'text-[#C4A484]';

          if (toast.type === 'success') {
            bgClass = 'bg-[#FFFFFF] border-[#388E65]/30 text-[#5D4634]';
            Icon = CheckCircle2;
            iconColor = 'text-[#388E65]';
          } else if (toast.type === 'error') {
            bgClass = 'bg-[#FFFFFF] border-[#C94C4C]/30 text-[#5D4634]';
            Icon = AlertCircle;
            iconColor = 'text-[#C94C4C]';
          } else if (toast.type === 'warning') {
            bgClass = 'bg-[#FFFFFF] border-[#D99A36]/30 text-[#5D4634]';
            Icon = AlertCircle;
            iconColor = 'text-[#D99A36]';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg ${bgClass} transition-all duration-300 animate-in fade-in slide-in-from-bottom-2`}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-[#5D4634]">{toast.title}</h4>
                {toast.message && (
                  <p className="text-xs text-[#5F5A64] mt-0.5 leading-relaxed">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-[#5F5A64] hover:text-[#5D4634] p-1 rounded-md transition-colors"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
