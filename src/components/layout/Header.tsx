"use client";

import { useLocale, useTranslations } from "next-intl";
import { LogOut, Menu } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NotificationBell } from "~/components/notifications/NotificationBell";
import { api } from "~/trpc/react";
import { useUiStore } from "~/store/ui";

export function Header() {
  const locale = useLocale();
  const t = useTranslations();
  const { data: user } = api.user.me.useQuery();
  const { toggleSidebar } = useUiStore();

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-4">
      {/* Mobile hamburger */}
      <button
        onClick={toggleSidebar}
        aria-label={t("layout.openMenu")}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <LanguageSwitcher />
        <ThemeToggle />
        <NotificationBell userId={user?.id} />
        <div className="mx-2 h-4 w-px bg-border" />
        {user && (
          <div className="hidden max-w-[140px] flex-col items-end leading-tight sm:flex">
            <span className="truncate text-sm text-muted-foreground">
              {user.name}
            </span>
            {user.role === "admin" && (
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                {t("settings.role.admin")}
              </span>
            )}
          </div>
        )}
        {/*
          Server-side signout: posts to /api/signout which clears cookies via
          @supabase/ssr and returns a 303 redirect to /login. Doing it on the
          server is the only reliable way — client-side signOut() can leave
          stale auth cookies that the middleware then accepts as valid,
          causing /login to bounce right back to /calendar.
        */}
        <form action={`/api/signout?locale=${locale}`} method="post">
          <button
            type="submit"
            aria-label={t("auth.logout")}
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
