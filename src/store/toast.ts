import { create } from "zustand";

type ToastType = "success" | "error" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
}

interface ToastStore {
  toasts: Toast[];
  add: (toast: Omit<Toast, "id">) => void;
  remove: (id: string) => void;
}

const DURATION = 3500;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: ({ type, title }) => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, type, title }] }));
    setTimeout(
      () => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      DURATION,
    );
  },
  remove: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function useToast() {
  const add = useToastStore((s) => s.add);
  return {
    success: (title: string) => add({ type: "success", title }),
    error: (title: string) => add({ type: "error", title }),
    warning: (title: string) => add({ type: "warning", title }),
  };
}
