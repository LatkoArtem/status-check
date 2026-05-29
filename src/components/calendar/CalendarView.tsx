"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Plus, CalendarDays } from "lucide-react";
import { api } from "~/trpc/react";
import { useFiltersStore } from "~/store/filters";
import { STATUS_COLORS } from "~/components/commitment/StatusBadge";
import { CommitmentModal } from "~/components/commitment/CommitmentModal";
import { CalendarFilters } from "./CalendarFilters";
import type { EventClickArg, EventDropArg } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";

// FullCalendar must be dynamically imported to prevent SSR issues
const FullCalendarComponent = dynamic(
  () => import("./_FullCalendarInner"),
  { ssr: false, loading: () => <CalendarSkeleton /> },
);

function CalendarSkeleton() {
  return (
    <div className="flex-1 animate-pulse rounded-lg bg-muted" />
  );
}

type ModalState =
  | { isOpen: false }
  | { isOpen: true; mode: "create"; defaultDate?: Date }
  | { isOpen: true; mode: "view" | "edit"; commitmentId: string };

export function CalendarView() {
  const t = useTranslations();
  const { projectIds, checkerIds, statuses } = useFiltersStore();
  const [modal, setModal] = useState<ModalState>({ isOpen: false });

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

  const updateDeadline = api.commitment.update.useMutation({
    onSuccess: () => { void refetch(); },
  });

  const events = (commitments ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    start: new Date(c.deadline),
    allDay: false,
    backgroundColor: STATUS_COLORS[c.status],
    borderColor: STATUS_COLORS[c.status],
    textColor: "#ffffff",
    extendedProps: { status: c.status },
  }));

  const handleEventClick = useCallback((arg: EventClickArg) => {
    setModal({ isOpen: true, mode: "view", commitmentId: arg.event.id });
  }, []);

  const handleDateClick = useCallback((arg: DateClickArg) => {
    setModal({ isOpen: true, mode: "create", defaultDate: arg.date });
  }, []);

  const handleEventDrop = useCallback(
    (arg: EventDropArg) => {
      if (!arg.event.start) { arg.revert(); return; }
      updateDeadline.mutate({
        id: arg.event.id,
        deadline: arg.event.start,
      });
    },
    [updateDeadline],
  );

  const closeModal = useCallback(() => setModal({ isOpen: false }), []);

  const handleSuccess = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-foreground">
          {t("calendar.title")}
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

      {/* Calendar */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-card">
        {commitments?.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <CalendarDays className="h-10 w-10 opacity-30" />
            <p className="text-sm">{t("calendar.empty")}</p>
          </div>
        ) : (
          <FullCalendarComponent
            events={events}
            onEventClick={handleEventClick}
            onDateClick={handleDateClick}
            onEventDrop={handleEventDrop}
          />
        )}
      </div>

      {/* Modal */}
      {modal.isOpen && modal.mode === "create" && (
        <CommitmentModal
          isOpen
          onClose={closeModal}
          mode="create"
          defaultDate={modal.defaultDate}
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
