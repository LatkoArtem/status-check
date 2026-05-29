"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { uk, enUS } from "date-fns/locale";
import { useLocale } from "next-intl";
import { Plus, ListTodo } from "lucide-react";
import { api } from "~/trpc/react";
import { useFiltersStore } from "~/store/filters";
import { CalendarFilters } from "~/components/calendar/CalendarFilters";
import { StatusBadge } from "~/components/commitment/StatusBadge";
import { CommitmentModal } from "~/components/commitment/CommitmentModal";

type ModalState =
  | { isOpen: false }
  | { isOpen: true; mode: "create" }
  | { isOpen: true; mode: "view" | "edit"; commitmentId: string };

export default function CommitmentsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const dateFnsLocale = locale === "uk" ? uk : enUS;
  const [modal, setModal] = useState<ModalState>({ isOpen: false });

  const { projectIds, checkerIds, statuses } = useFiltersStore();

  const filters = {
    projectId: projectIds[0],
    checkerId: checkerIds[0],
    status: statuses.length ? statuses : undefined,
  };

  const { data: commitments, refetch } = api.commitment.list.useQuery(
    Object.keys(filters).some(
      (k) => filters[k as keyof typeof filters] !== undefined,
    )
      ? filters
      : undefined,
  );

  const closeModal = useCallback(() => setModal({ isOpen: false }), []);
  const handleSuccess = useCallback(() => { void refetch(); }, [refetch]);

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">
          {t("nav.commitments")}
        </h1>
        <button
          onClick={() => setModal({ isOpen: true, mode: "create" })}
          className="flex h-8 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          {t("calendar.newCommitment")}
        </button>
      </div>

      {/* Filters */}
      <CalendarFilters />

      {/* Table */}
      {!commitments ? (
        <TableSkeleton />
      ) : commitments.length === 0 ? (
        <EmptyState t={t} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <Th>{t("commitment.title")}</Th>
                <Th>{t("commitment.status")}</Th>
                <Th>{t("commitment.deadline")}</Th>
                <Th>{t("commitment.project")}</Th>
                <Th>{t("commitment.executor")}</Th>
                <Th>{t("commitment.checker")}</Th>
              </tr>
            </thead>
            <tbody>
              {commitments.map((c) => (
                <tr
                  key={c.id}
                  onClick={() =>
                    setModal({ isOpen: true, mode: "view", commitmentId: c.id })
                  }
                  className="cursor-pointer border-b border-border/50 transition-colors last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {c.title}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {format(new Date(c.deadline), "dd MMM yyyy", {
                      locale: dateFnsLocale,
                    })}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.projectName ? (
                      <span className="flex items-center gap-1.5">
                        {c.projectColor && (
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: c.projectColor }}
                          />
                        )}
                        {c.projectName}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.executorName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.checkerName ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal.isOpen && modal.mode === "create" && (
        <CommitmentModal
          isOpen
          onClose={closeModal}
          mode="create"
          onMutationSuccess={handleSuccess}
        />
      )}
      {modal.isOpen && (modal.mode === "view" || modal.mode === "edit") && (
        <CommitmentModal
          isOpen
          onClose={closeModal}
          mode={modal.mode}
          commitmentId={modal.commitmentId}
          onMutationSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
      {children}
    </th>
  );
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 border-b border-border/50 px-4 py-3 last:border-0"
        >
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card text-muted-foreground">
      <ListTodo className="h-10 w-10 opacity-30" />
      <p className="text-sm">{t("common.noData")}</p>
    </div>
  );
}
