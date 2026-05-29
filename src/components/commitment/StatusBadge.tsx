"use client";

import { useTranslations } from "next-intl";
import { type CommitmentStatus } from "~/server/db/schema";
import { cn } from "~/lib/utils";

const STATUS_CLASSES: Record<CommitmentStatus, string> = {
  to_check: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  expired: "bg-red-500/10 text-red-500 border-red-500/20",
  done: "bg-green-500/10 text-green-500 border-green-500/20",
  not_actual: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  ideas_backlog: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

export const STATUS_COLORS: Record<CommitmentStatus, string> = {
  to_check: "#3b82f6",
  expired: "#ef4444",
  done: "#22c55e",
  not_actual: "#6b7280",
  ideas_backlog: "#a855f7",
};

export function StatusBadge({
  status,
  className,
}: {
  status: CommitmentStatus;
  className?: string;
}) {
  const t = useTranslations("commitment.statuses");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        STATUS_CLASSES[status],
        className,
      )}
    >
      {t(status)}
    </span>
  );
}
