import { useState, useCallback, createContext, useContext } from 'react';
import type { ReactNode } from 'react';

interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface ToastContextType {
  toast: (message: string, type?: ToastItem['type']) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() { return useContext(ToastContext); }

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, type: ToastItem['type'] = 'info') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const removeToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 2000, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            pointerEvents: 'auto', padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: t.type === 'error' ? 'color-mix(in srgb, var(--error) 20%, var(--surface))' :
                        t.type === 'success' ? 'color-mix(in srgb, var(--success) 20%, var(--surface))' :
                        t.type === 'warning' ? 'color-mix(in srgb, var(--warning) 20%, var(--surface))' :
                        'var(--surface)',
            border: '1px solid var(--border)', color: 'var(--text)',
            boxShadow: '0 8px 24px rgba(0,0,0,.2)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', gap: 10, maxWidth: 380,
            animation: 'toast-in .25s cubic-bezier(.2,.8,.2,1)',
          }}>
            <span>{t.message}</span>
            <button onClick={() => removeToast(t.id)}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, fontSize: 16, lineHeight: 1 }}>
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* Toast animation */
const style = document.createElement('style');
style.textContent = `@keyframes toast-in{from{opacity:0;transform:translateX(20px) scale(.95)}to{opacity:1;transform:translateX(0) scale(1)}}`;
document.head.appendChild(style);
