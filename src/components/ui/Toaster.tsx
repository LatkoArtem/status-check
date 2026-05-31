"use client";

import { CheckCircle2, XCircle, AlertTriangle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useToastStore } from "~/store/toast";
import { cn } from "~/lib/utils";

const ICON = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
};

const STYLE = {
  success: "border-green-500/30 text-green-400",
  error: "border-red-500/30 text-red-400",
  warning: "border-orange-500/30 text-orange-400",
};

export function Toaster() {
  const { toasts, remove } = useToastStore();
  const tr = useTranslations("common");

  if (!toasts.length) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none"
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((t) => {
        const Icon = ICON[t.type];
        return (
          <div
            key={t.id}
            role={t.type === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex min-w-[260px] max-w-xs items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-xl animate-toast",
              STYLE[t.type],
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <p className="flex-1 text-sm font-medium text-foreground">
              {t.title}
            </p>
            <button
              onClick={() => remove(t.id)}
              aria-label={tr("close")}
              className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
