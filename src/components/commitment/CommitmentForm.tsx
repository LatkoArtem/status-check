"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api, type RouterOutputs } from "~/trpc/react";
import { useToast } from "~/store/toast";
import { cn } from "~/lib/utils";

type CommitmentDetail = RouterOutputs["commitment"]["byId"];

interface CommitmentFormProps {
  defaultDate?: Date;
  initialData?: CommitmentDetail;
  onSuccess: () => void;
  onCancel: () => void;
}

function toDatetimeLocal(date?: Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CommitmentForm({
  defaultDate,
  initialData,
  onSuccess,
  onCancel,
}: CommitmentFormProps) {
  const t = useTranslations();
  const isEdit = !!initialData;

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );
  const [projectId, setProjectId] = useState(
    initialData?.projectId ?? "",
  );
  const [executorId, setExecutorId] = useState(
    initialData?.responsibleExecutorId ?? "",
  );
  const [checkerId, setCheckerId] = useState(
    initialData?.responsibleCheckerId ?? "",
  );
  const [deadline, setDeadline] = useState(
    toDatetimeLocal(initialData?.deadline ?? defaultDate),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: projects } = api.project.list.useQuery();
  const { data: users } = api.user.listAll.useQuery();
  const toast = useToast();

  const createMutation = api.commitment.create.useMutation({
    onSuccess: () => {
      toast.success(t("commitment.created"));
      onSuccess();
    },
    onError: () => toast.error(t("errors.generic")),
  });
  const updateMutation = api.commitment.update.useMutation({
    onSuccess: () => {
      toast.success(t("commitment.updated"));
      onSuccess();
    },
    onError: () => toast.error(t("errors.generic")),
  });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = t("commitment.titleRequired");
    if (!deadline) errs.deadline = t("commitment.deadlineRequired");
    return errs;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});

    const deadlineDate = new Date(deadline);

    if (isEdit) {
      updateMutation.mutate({
        id: initialData.id,
        title: title.trim(),
        description: description.trim() || undefined,
        projectId: projectId || null,
        responsibleExecutorId: executorId || null,
        responsibleCheckerId: checkerId || null,
        deadline: deadlineDate,
      });
    } else {
      createMutation.mutate({
        title: title.trim(),
        description: description.trim() || undefined,
        projectId: projectId || undefined,
        responsibleExecutorId: executorId || undefined,
        responsibleCheckerId: checkerId || undefined,
        deadline: deadlineDate,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-foreground">
          {t("commitment.title")}
          <span className="ml-0.5 text-destructive">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("commitment.title")}
          className={cn(
            "h-9 rounded-md border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring",
            errors.title ? "border-destructive" : "border-border",
          )}
        />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title}</p>
        )}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-foreground">
          {t("commitment.description")}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
      </div>

      {/* Deadline */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-foreground">
          {t("commitment.deadline")}
          <span className="ml-0.5 text-destructive">*</span>
        </label>
        <input
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className={cn(
            "h-9 rounded-md border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring",
            errors.deadline ? "border-destructive" : "border-border",
          )}
        />
        {errors.deadline && (
          <p className="text-xs text-destructive">{errors.deadline}</p>
        )}
      </div>

      {/* Project */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-foreground">
          {t("commitment.project")}
        </label>
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">{t("commitment.noProject")}</option>
          {projects?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Executor */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground">
            {t("commitment.executor")}
          </label>
          <select
            value={executorId}
            onChange={(e) => setExecutorId(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">{t("commitment.noExecutor")}</option>
            {users?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        {/* Checker */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground">
            {t("commitment.checker")}
          </label>
          <select
            value={checkerId}
            onChange={(e) => setCheckerId(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">{t("commitment.noChecker")}</option>
            {users?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="h-8 rounded-md border border-border px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
        >
          {t("common.cancel")}
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="h-8 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? t("common.loading") : t("common.save")}
        </button>
      </div>
    </form>
  );
}
