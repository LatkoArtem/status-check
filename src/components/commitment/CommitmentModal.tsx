"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { uk, enUS } from "date-fns/locale";
import { X, Pencil, Trash2 } from "lucide-react";
import { api, type RouterOutputs } from "~/trpc/react";
import { type CommitmentStatus } from "~/server/db/schema";
import { useToast } from "~/store/toast";
import { CommitmentForm } from "./CommitmentForm";
import { StatusBadge, STATUS_COLORS } from "./StatusBadge";

type CommitmentDetail = RouterOutputs["commitment"]["byId"];
type ModalMode = "view" | "create" | "edit";

interface CommitmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ModalMode;
  commitmentId?: string;
  defaultDate?: Date;
  onMutationSuccess?: () => void;
}

const ALL_STATUSES: CommitmentStatus[] = [
  "to_check",
  "expired",
  "done",
  "not_actual",
  "ideas_backlog",
];

export function CommitmentModal({
  isOpen,
  onClose,
  mode: initialMode,
  commitmentId,
  defaultDate,
  onMutationSuccess,
}: CommitmentModalProps) {
  const t = useTranslations();
  const backdropRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<ModalMode>(initialMode);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const toast = useToast();

  const { data: commitment, refetch } = api.commitment.byId.useQuery(
    { id: commitmentId! },
    { enabled: !!commitmentId && isOpen },
  );

  const { data: currentUser } = api.user.me.useQuery();
  const canEdit =
    !!currentUser &&
    !!commitment &&
    (currentUser.id === commitment.authorId || currentUser.role === "admin");

  const utils = api.useUtils();

  const updateStatus = api.commitment.updateStatus.useMutation({
    onSuccess: () => {
      toast.success(t("commitment.statusChanged"));
      void refetch();
      onMutationSuccess?.();
    },
    onError: () => toast.error(t("errors.generic")),
  });

  const deleteCommitment = api.commitment.delete.useMutation({
    onSuccess: () => {
      toast.success(t("commitment.deleted"));
      void utils.commitment.list.invalidate();
      onMutationSuccess?.();
      onClose();
    },
    onError: () => toast.error(t("errors.generic")),
  });

  const handleMutationSuccess = () => {
    void utils.commitment.list.invalidate();
    onMutationSuccess?.();
    onClose();
  };

  const handleDelete = () => {
    if (!commitmentId) return;
    if (window.confirm(t("commitment.deleteConfirm"))) {
      deleteCommitment.mutate({ id: commitmentId });
    }
  };

  if (!isOpen) return null;

  const isCreateOrEdit = mode === "create" || mode === "edit";
  const title =
    mode === "create"
      ? t("commitment.newCommitment")
      : mode === "edit"
        ? t("commitment.editCommitment")
        : (commitment?.title ?? "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      ref={backdropRef}
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <div className="flex items-center gap-1">
            {mode === "view" && canEdit && (
              <>
                <button
                  onClick={() => setMode("edit")}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteCommitment.isPending}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-5 py-4">
          {isCreateOrEdit ? (
            <CommitmentForm
              defaultDate={defaultDate}
              initialData={mode === "edit" ? commitment : undefined}
              onSuccess={handleMutationSuccess}
              onCancel={mode === "edit" ? () => setMode("view") : onClose}
            />
          ) : commitment ? (
            <ViewMode
              commitment={commitment}
              allStatuses={ALL_STATUSES}
              onStatusChange={(status) =>
                updateStatus.mutate({ id: commitment.id, status })
              }
              isStatusPending={updateStatus.isPending}
              canChangeStatus={canEdit}
            />
          ) : (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ViewModeProps {
  commitment: CommitmentDetail;
  allStatuses: CommitmentStatus[];
  onStatusChange: (status: CommitmentStatus) => void;
  isStatusPending: boolean;
  canChangeStatus: boolean;
}

function ViewMode({
  commitment,
  allStatuses,
  onStatusChange,
  isStatusPending,
  canChangeStatus,
}: ViewModeProps) {
  const t = useTranslations();
  const locale = useLocale();
  const dateFnsLocale = locale === "uk" ? uk : enUS;
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <StatusBadge status={commitment.status} />
        {canChangeStatus && (
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu((v) => !v)}
              disabled={isStatusPending}
              className="h-7 rounded-md border border-border px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
            >
              {t("commitment.changeStatus")}
            </button>
            {showStatusMenu && (
              <div className="absolute right-0 z-10 mt-1 w-44 rounded-md border border-border bg-popover shadow-lg">
                {allStatuses.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      onStatusChange(s);
                      setShowStatusMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground transition-colors hover:bg-accent"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[s] }}
                    />
                    {t(`commitment.statuses.${s}`)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Field label={t("commitment.deadline")}>
        {format(new Date(commitment.deadline), "dd MMM yyyy, HH:mm", {
          locale: dateFnsLocale,
        })}
      </Field>

      {commitment.description && (
        <Field label={t("commitment.description")}>
          <p className="whitespace-pre-wrap text-sm text-foreground">
            {commitment.description}
          </p>
        </Field>
      )}

      {commitment.projectName && (
        <Field label={t("commitment.project")}>
          <span className="flex items-center gap-2">
            {commitment.projectColor && (
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: commitment.projectColor }}
              />
            )}
            {commitment.projectName}
          </span>
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("commitment.executor")}>
          {commitment.executorName ?? t("commitment.noExecutor")}
        </Field>
        <Field label={t("commitment.checker")}>
          {commitment.checkerName ?? t("commitment.noChecker")}
        </Field>
      </div>

      <Field label={t("commitment.author")}>
        {commitment.authorName ?? "—"}
      </Field>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}
