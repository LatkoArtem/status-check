"use client";

import { useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { api } from "~/trpc/react";

export function useRealtimeNotifications(userId: string | undefined) {
  const utils = api.useUtils();

  useEffect(() => {
    if (!userId) return;

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void utils.notification.list.invalidate();
          void utils.notification.unreadCount.invalidate();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, utils]);
}
