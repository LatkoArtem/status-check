"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { useFiltersStore } from "~/store/filters";
import { api } from "~/trpc/react";
import { type CommitmentStatus } from "~/server/db/schema";
import { cn } from "~/lib/utils";

const ALL_STATUSES: CommitmentStatus[] = [
  "to_check",
  "expired",
  "done",
  "not_actual",
  "ideas_backlog",
];

const STATUS_DOT: Record<CommitmentStatus, string> = {
  to_check: "bg-blue-500",
  expired: "bg-red-500",
  done: "bg-green-500",
  not_actual: "bg-gray-500",
  ideas_backlog: "bg-purple-500",
};

export function CalendarFilters() {
  const t = useTranslations();
  const {
    projectIds,
    checkerIds,
    statuses,
    setProjectIds,
    setCheckerIds,
    setStatuses,
    clearAll,
    hasActiveFilters,
  } = useFiltersStore();

  const { data: projects } = api.project.list.useQuery();
  const { data: users } = api.user.listAll.useQuery();

  const selectedProjectId = projectIds[0] ?? "";
  const selectedCheckerId = checkerIds[0] ?? "";

  const toggleStatus = (s: CommitmentStatus) => {
    if (statuses.includes(s)) {
      setStatuses(statuses.filter((x) => x !== s));
    } else {
      setStatuses([...statuses, s]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={selectedProjectId}
        onChange={(e) => setProjectIds(e.target.value ? [e.target.value] : [])}
        aria-label={t("filters.byProject")}
        className="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">{t("filters.allProjects")}</option>
        {projects?.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <select
        value={selectedCheckerId}
        onChange={(e) => setCheckerIds(e.target.value ? [e.target.value] : [])}
        aria-label={t("filters.byChecker")}
        className="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">{t("filters.allCheckers")}</option>
        {users?.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>

      <div className="flex flex-wrap gap-1">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => toggleStatus(s)}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors",
              statuses.includes(s)
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[s])} />
            {t(`commitment.statuses.${s}`)}
          </button>
        ))}
      </div>

      {hasActiveFilters() && (
        <button
          onClick={clearAll}
          className="flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-3 w-3" />
          {t("common.clearFilters")}
        </button>
      )}
    </div>
  );
}
