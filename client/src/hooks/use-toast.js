import { useState } from "react";

const toastContext = {
  toasts: [],
  setToasts: null
};

export function useToast() {
  const [toasts, setToasts] = useState([]);
  toastContext.toasts = toasts;
  toastContext.setToasts = setToasts;

  const toast = ({ title, description, variant = "default" }) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = {
      id,
      title,
      description,
      variant,
      createdAt: Date.now()
    };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
    
    return newToast;
  };

  const dismiss = (toastId) => {
    setToasts(prev => prev.filter(t => t.id !== toastId));
  };

  return {
    toast,
    dismiss,
    toasts
  };
}