import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const ToastContext = createContext(null);
const DEFAULT_TOAST_DURATION_MS = 4500;
const MAX_VISIBLE_TOASTS = 4;

function createToastId() {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismissToast = useCallback((toastId) => {
    const timer = timersRef.current.get(toastId);

    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(toastId);
    }

    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== toastId),
    );
  }, []);

  const notify = useCallback(
    (message, variant = 'info', options = {}) => {
      if (!message) {
        return null;
      }

      const id = createToastId();
      const duration = options.duration ?? DEFAULT_TOAST_DURATION_MS;
      const nextToast = {
        id,
        message,
        variant,
      };

      setToasts((currentToasts) =>
        [nextToast, ...currentToasts].slice(0, MAX_VISIBLE_TOASTS),
      );

      if (duration > 0) {
        const timer = window.setTimeout(() => {
          dismissToast(id);
        }, duration);

        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismissToast],
  );

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.clear();
    },
    [],
  );

  const value = useMemo(
    () => ({
      notify,
      dismissToast,
    }),
    [notify, dismissToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-relevant="additions">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.variant}`}
            role={toast.variant === 'error' ? 'alert' : 'status'}
          >
            <p>{toast.message}</p>
            <button
              type="button"
              className="toast-close"
              onClick={() => dismissToast(toast.id)}
              aria-label="Fechar aviso"
            >
              x
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast deve ser usado dentro de ToastProvider');
  }

  return context;
}
