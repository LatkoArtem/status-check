"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "~/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Themed confirmation dialog replacing native `window.confirm`.
 *
 * - Rendered as a portal-less overlay (matches the rest of the app's modals).
 * - Closes on Escape and on backdrop click.
 * - Focuses the cancel button by default — safer for destructive actions.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const t = useTranslations("common");
  const cancelRef = useRef<HTMLButtonElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter" && !isPending) onConfirm();
    };
    window.addEventListener("keydown", onKey);
    // Focus cancel by default for destructive prompts so the user has to
    // deliberately move focus to "Delete".
    queueMicrotask(() => cancelRef.current?.focus());
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel, onConfirm, isPending]);

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      onClick={(e) => {
        if (e.target === backdropRef.current && !isPending) onCancel();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={description ? "confirm-desc" : undefined}
        className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl"
      >
        <div className="mb-3 flex items-start gap-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              destructive
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-primary",
            )}
          >
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <h2
              id="confirm-title"
              className="text-sm font-semibold text-foreground"
            >
              {title}
            </h2>
            {description && (
              <p
                id="confirm-desc"
                className="mt-1 text-xs text-muted-foreground"
              >
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onCancel}
            disabled={isPending}
            aria-label={t("close")}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={isPending}
            className="h-8 rounded-md border border-border px-3 text-sm text-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            {cancelLabel ?? t("cancel")}
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            aria-busy={isPending}
            className={cn(
              "h-8 rounded-md px-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50",
              destructive
                ? "bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground",
            )}
          >
            {isPending
              ? (confirmLabel ?? t("confirm")) + "…"
              : confirmLabel ?? t("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
