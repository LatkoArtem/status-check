"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, Clock, RefreshCw, UserPlus, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { uk } from "date-fns/locale";
import { api } from "~/trpc/react";
import { useRealtimeNotifications } from "~/hooks/use-realtime-notifications";
import { cn } from "~/lib/utils";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  deadline_approaching: <Clock className="h-3.5 w-3.5 text-orange-400" />,
  status_changed: <RefreshCw className="h-3.5 w-3.5 text-blue-400" />,
  assigned: <UserPlus className="h-3.5 w-3.5 text-green-400" />,
};

export function NotificationBell({ userId }: { userId?: string }) {
  const t = useTranslations("notifications");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Supabase Realtime — falls back to polling gracefully
  useRealtimeNotifications(userId);

  const { data: count = 0, refetch: refetchCount } =
    api.notification.unreadCount.useQuery(undefined, {
      refetchInterval: 30_000,
    });

  const { data: notifs, refetch: refetchList } =
    api.notification.list.useQuery(undefined, {
      enabled: open,
    });

  const markRead = api.notification.markRead.useMutation({
    onSuccess: () => {
      void refetchCount();
      void refetchList();
    },
  });

  const markAllRead = api.notification.markAllRead.useMutation({
    onSuccess: () => {
      void refetchCount();
      void refetchList();
    },
  });

  // Close on outside click
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t("title")}
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
          open && "bg-accent text-accent-foreground",
        )}
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-foreground">
              {t("title")}
            </span>
            {count > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {t("markAllAsRead")}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {!notifs ? (
              <NotifSkeleton />
            ) : notifs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <Bell className="h-8 w-8 opacity-20" />
                <p className="text-xs">{t("noNotifications")}</p>
              </div>
            ) : (
              notifs.map((n) => (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.isRead) markRead.mutate({ id: n.id });
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-border/50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-accent/50",
                    !n.isRead && "bg-primary/5",
                  )}
                >
                  <span className="mt-0.5 shrink-0">
                    {TYPE_ICONS[n.type] ?? (
                      <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">
                      {n.commitment?.title ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(`types.${n.type}`)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/60">
                      {formatDistanceToNow(new Date(n.createdAt), {
                        addSuffix: true,
                        locale: uk,
                      })}
                    </p>
                  </div>
                  {!n.isRead && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotifSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3 border-b border-border/50 px-4 py-3 last:border-0">
          <div className="h-3.5 w-3.5 animate-pulse rounded-full bg-muted" />
          <div className="flex flex-col gap-1.5">
            <div className="h-3 w-40 animate-pulse rounded bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </>
  );
}
