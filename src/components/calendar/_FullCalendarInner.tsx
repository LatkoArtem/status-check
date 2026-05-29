"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import { useLocale, useTranslations } from "next-intl";
import type { EventClickArg, EventDropArg, EventInput } from "@fullcalendar/core";
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

  return (
    <div className="h-full p-2 [&_.fc]:h-full [&_.fc-toolbar-title]:text-sm [&_.fc-toolbar-title]:font-semibold [&_.fc-button]:rounded [&_.fc-button]:border [&_.fc-button]:border-border [&_.fc-button]:bg-card [&_.fc-button]:text-foreground [&_.fc-button:hover]:bg-accent [&_.fc-button-active]:!bg-accent [&_.fc-button-primary]:!shadow-none [&_.fc-col-header-cell]:text-xs [&_.fc-col-header-cell]:font-medium [&_.fc-col-header-cell]:text-muted-foreground [&_.fc-daygrid-day-number]:text-xs [&_.fc-daygrid-day-number]:text-muted-foreground [&_.fc-event]:cursor-pointer [&_.fc-event]:rounded [&_.fc-event]:border-none [&_.fc-event]:px-1 [&_.fc-event]:text-xs [&_.fc-list-event]:cursor-pointer [&_.fc-theme-standard_.fc-scrollgrid]:border-border [&_td]:border-border [&_th]:border-border">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={locale}
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
        events={events}
        editable
        selectable
        eventClick={onEventClick}
        dateClick={onDateClick}
        eventDrop={onEventDrop}
        height="100%"
        dayMaxEvents={3}
        nowIndicator
      />
    </div>
  );
}
