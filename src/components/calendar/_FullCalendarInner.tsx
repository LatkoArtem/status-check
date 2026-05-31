"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import ukLocale from "@fullcalendar/core/locales/uk";
import enGbLocale from "@fullcalendar/core/locales/en-gb";
import { useLocale, useTranslations } from "next-intl";
import type {
  EventClickArg,
  EventDropArg,
  EventInput,
} from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";

interface FullCalendarInnerProps {
  events: EventInput[];
  onEventClick: (arg: EventClickArg) => void;
  onDateClick: (arg: DateClickArg) => void;
  onEventDrop: (arg: EventDropArg) => void;
}

export default function FullCalendarInner({
  events,
  onEventClick,
  onDateClick,
  onEventDrop,
}: FullCalendarInnerProps) {
  const locale = useLocale();
  const t = useTranslations("calendar");
  // Passing the FULL locale OBJECT (not just the code string) is what makes
  // FullCalendar localize "+ще N", "Увесь день", "Немає подій для
  // відображення", "Тиж", weekday names, etc.
  const fcLocale = locale === "uk" ? ukLocale : enGbLocale;

  // Give every event a 30-minute visible duration so they tile nicely in the
  // week view instead of collapsing to invisible-thin lines.
  const eventsWithDuration: EventInput[] = events.map((e) => {
    const start = e.start instanceof Date ? e.start : new Date(e.start as string);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    return { ...e, end };
  });

  return (
    <div className="h-full p-2 [&_.fc]:h-full">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={fcLocale}
        firstDay={1}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,listWeek",
        }}
        buttonText={{
          today: t("today"),
          month: t("month"),
          week: t("week"),
          list: t("list"),
        }}
        events={eventsWithDuration}
        editable
        eventStartEditable
        eventDurationEditable={false}
        selectable
        eventClick={onEventClick}
        dateClick={onDateClick}
        eventDrop={onEventDrop}
        height="100%"
        // Month view — keep 2 inline; the rest collapse into the +more popover
        // (which scrolls if there are more than ~5).
        dayMaxEvents={2}
        moreLinkClick="popover"
        // Week / day timeGrid — side-by-side stacking, cap at 4 events per
        // slot; anything beyond collapses into the same "+more" popover the
        // month view uses.
        slotEventOverlap={false}
        eventMaxStack={4}
        nowIndicator
        eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        // Time grid — show the full 24h so nothing is hidden, but scroll to
        // a sensible morning anchor on first render so empty hours don't take
        // up the visible area.
        slotMinTime="00:00:00"
        slotMaxTime="24:00:00"
        scrollTime="08:00:00"
        // Hide the "all-day" row — our model requires a concrete deadline
        // timestamp, so there is no all-day concept and the row is always
        // empty (and not droppable). Removing it declutters the week view.
        allDaySlot={false}
        expandRows
        stickyHeaderDates
      />
    </div>
  );
}
