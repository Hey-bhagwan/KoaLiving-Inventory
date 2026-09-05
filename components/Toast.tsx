'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error';
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: number) => void;
}

export default function Toast({ toasts, onRemove }: ToastProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 3500);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium max-w-sm animate-in slide-in-from-right
        ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
    >
      {toast.type === 'success' ? (
        <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
      ) : (
        <XCircle size={18} className="mt-0.5 shrink-0" />
      )}
      <span className="flex-1">{toast.message}</span>
      <button onClick={() => onRemove(toast.id)} className="opacity-75 hover:opacity-100">
        <X size={15} />
      </button>
    </div>
  );
}

// Hook for managing toasts
let _toastId = 0;
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = ++_toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, removeToast };
}
