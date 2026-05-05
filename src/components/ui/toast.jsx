import React, { createContext, useContext, useState, useCallback } from "react";
import { cn } from "../../lib/utils";
import { X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ title, description, variant = "default" }) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, title, description, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast viewport */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-start justify-between rounded-lg border p-4 shadow-lg text-sm",
              t.variant === "destructive"
                ? "bg-red-50 border-red-300 text-red-800"
                : "bg-white border-gray-200 text-gray-800"
            )}
          >
            <div>
              {t.title && <p className="font-semibold">{t.title}</p>}
              {t.description && <p className="mt-0.5 text-gray-600">{t.description}</p>}
            </div>
            <button
              onClick={() => remove(t.id)}
              className="ml-4 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
