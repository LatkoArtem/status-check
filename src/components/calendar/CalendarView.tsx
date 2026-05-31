"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useTranslations, useLocale } from "next-intl";
import { format } from "date-fns";
import { uk, enUS } from "date-fns/locale";
import { Plus, CalendarDays } from "lucide-react";
import { api } from "~/trpc/react";
import { useFiltersStore } from "~/store/filters";
import { useToast } from "~/store/toast";
import { STATUS_COLORS } from "~/components/commitment/StatusBadge";
import { CommitmentModal } from "~/components/commitment/CommitmentModal";
import { ConfirmDialog } from "~/components/ui/ConfirmDialog";
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

interface PendingDrop {
  id: string;
  title: string;
  oldDeadline: Date;
  newDeadline: Date;
  revert: () => void;
}

export function CalendarView() {
  const t = useTranslations();
  const locale = useLocale();
  const dateFnsLocale = locale === "uk" ? uk : enUS;
  const toast = useToast();
  const { projectIds, checkerIds, statuses } = useFiltersStore();
  const [modal, setModal] = useState<ModalState>({ isOpen: false });
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  // Cache the rendered commitments so we can look up the original deadline
  // (with original time-of-day) when the user drags to a new date.
  const commitmentMapRef = useRef<Map<string, Date>>(new Map());

  // FullCalendar mounts the "+more" popover inside `.fc-view-harness` with
  // absolute top/left positions tied to the source cell. Near the right or
  // bottom edge of the viewport it spills off-screen.
  //
  // Strategy:
  //   1. Observe body subtree for popover mount (FullCalendar appends it
  //      deep inside the calendar tree, not on body directly).
  //   2. On every reposition cycle, FIRST clamp max-height so the popover
  //      can never be taller than the viewport (otherwise we'd squeeze it
  //      against the top edge after a downward overflow correction).
  //   3. Then nudge left/top so the bounding rect fits inside the viewport
  //      with a small margin.
  //   4. Re-run on size changes via ResizeObserver (the popover's content
  //      loads in async ticks; the first measurement is often stale).
  useEffect(() => {
    const MARGIN = 8;

    const reposition = (popover: HTMLElement) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Don't allow popover taller than viewport.
      popover.style.maxHeight = `${vh - 2 * MARGIN}px`;

      const rect = popover.getBoundingClientRect();
      let left = parseFloat(popover.style.left || "0");
      let top = parseFloat(popover.style.top || "0");
      let newRight = rect.right;
      let newBottom = rect.bottom;
      let newLeft = rect.left;
      let newTop = rect.top;

      if (newRight > vw - MARGIN) {
        const dx = newRight - (vw - MARGIN);
        left -= dx;
        newLeft -= dx;
      }
      if (newBottom > vh - MARGIN) {
        const dy = newBottom - (vh - MARGIN);
        top -= dy;
        newTop -= dy;
      }
      if (newLeft < MARGIN) left += MARGIN - newLeft;
      if (newTop < MARGIN) top += MARGIN - newTop;

      popover.style.left = `${left}px`;
      popover.style.top = `${top}px`;
    };

    let sizeObserver: ResizeObserver | null = null;

    const onPopoverMounted = (popover: HTMLElement) => {
      // FullCalendar appends the popover inside `.fc-view-harness`, which has
      // `overflow: hidden` — so the popover can't render outside the calendar
      // box no matter how we reposition it. Move it to <body> first; then it
      // sits in the viewport's coordinate system and our clamp logic works.
      if (popover.parentElement !== document.body) {
        const rect = popover.getBoundingClientRect();
        document.body.appendChild(popover);
        // Switch to viewport-relative (fixed) so scrolling the calendar
        // doesn't move the popover.
        popover.style.position = "fixed";
        popover.style.left = `${rect.left}px`;
        popover.style.top = `${rect.top}px`;
      }
      requestAnimationFrame(() => reposition(popover));
      sizeObserver?.disconnect();
      sizeObserver = new ResizeObserver(() => reposition(popover));
      sizeObserver.observe(popover);
      const body = popover.querySelector(".fc-popover-body");
      if (body) sizeObserver.observe(body);
    };

    const mutationObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (!(n instanceof HTMLElement)) return;
          if (n.classList.contains("fc-popover")) {
            onPopoverMounted(n);
          }
        });
        m.removedNodes.forEach((n) => {
          if (!(n instanceof HTMLElement)) return;
          if (n.classList.contains("fc-popover")) {
            sizeObserver?.disconnect();
            sizeObserver = null;
          }
        });
      }
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      sizeObserver?.disconnect();
    };
  }, []);

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

  // Refresh the lookup map whenever the list updates.
  if (commitments) {
    const map = new Map<string, Date>();
    for (const c of commitments) map.set(c.id, new Date(c.deadline));
    commitmentMapRef.current = map;
  }

  const updateDeadline = api.commitment.update.useMutation({
    onSuccess: () => {
      toast.success(t("commitment.updated"));
      void refetch();
    },
    onError: () => toast.error(t("errors.generic")),
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

  // Preserve the original time-of-day when a drag changes only the date.
  // FullCalendar's `event.start` reflects the day the user dropped on; we
  // graft the hours/minutes from the cached original deadline onto it.
  const composeNewDeadline = (id: string, droppedAt: Date) => {
    const original = commitmentMapRef.current.get(id) ?? droppedAt;
    const out = new Date(droppedAt);
    out.setHours(
      original.getHours(),
      original.getMinutes(),
      original.getSeconds(),
      original.getMilliseconds(),
    );
    return out;
  };

  const handleEventClick = useCallback((arg: EventClickArg) => {
    // FullCalendar keeps the "+more" popover open when you click an event
    // inside, then internally re-renders it — so simply removing the DOM
    // node is overwritten on the next tick. Click its close button instead:
    // FullCalendar treats that as a real close and clears its own state.
    document
      .querySelectorAll<HTMLElement>(".fc-popover .fc-popover-close")
      .forEach((btn) => btn.click());
    setModal({ isOpen: true, mode: "view", commitmentId: arg.event.id });
  }, []);

  const handleDateClick = useCallback((arg: DateClickArg) => {
    setModal({ isOpen: true, mode: "create", defaultDate: arg.date });
  }, []);

  const handleEventDrop = useCallback(
    (arg: EventDropArg) => {
      if (!arg.event.start) {
        arg.revert();
        return;
      }
      const id = arg.event.id;
      const oldDeadline = commitmentMapRef.current.get(id) ?? arg.event.start;
      const newDeadline = composeNewDeadline(id, arg.event.start);
      // Same calendar day → nothing to confirm.
      if (oldDeadline.toDateString() === newDeadline.toDateString()) {
        arg.revert();
        return;
      }
      setPendingDrop({
        id,
        title: arg.event.title,
        oldDeadline,
        newDeadline,
        revert: () => arg.revert(),
      });
    },
    // composeNewDeadline only reads from a ref, no deps needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const acceptDrop = () => {
    if (!pendingDrop) return;
    updateDeadline.mutate(
      { id: pendingDrop.id, deadline: pendingDrop.newDeadline },
      {
        onSettled: () => setPendingDrop(null),
        onError: () => pendingDrop.revert(),
      },
    );
  };

  const cancelDrop = () => {
    pendingDrop?.revert();
    setPendingDrop(null);
  };

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

      {/* Inline empty-state hint — sits above the calendar instead of
          covering it, so events are never hidden by the overlay. */}
      {commitments?.length === 0 && (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          <CalendarDays className="h-4 w-4 opacity-50" />
          <span>{t("calendar.empty")}</span>
        </div>
      )}

      {/* Calendar */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-card">
        <FullCalendarComponent
          events={events}
          onEventClick={handleEventClick}
          onDateClick={handleDateClick}
          onEventDrop={handleEventDrop}
        />
      </div>

      {/* Drag&drop deadline confirmation */}
      <ConfirmDialog
        open={!!pendingDrop}
        title={t("calendar.dropConfirmTitle")}
        description={
          pendingDrop
            ? `${pendingDrop.title}\n${format(pendingDrop.oldDeadline, "dd MMM yyyy", { locale: dateFnsLocale })} → ${format(pendingDrop.newDeadline, "dd MMM yyyy", { locale: dateFnsLocale })}`
            : undefined
        }
        confirmLabel={t("common.confirm")}
        cancelLabel={t("common.cancel")}
        isPending={updateDeadline.isPending}
        onConfirm={acceptDrop}
        onCancel={cancelDrop}
      />

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
