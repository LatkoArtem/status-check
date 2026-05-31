"use client";

import { useLocale, useTranslations } from "next-intl";
import { LogOut, Menu } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NotificationBell } from "~/components/notifications/NotificationBell";
import { createClient } from "~/lib/supabase/client";
import { api } from "~/trpc/react";
import { useUiStore } from "~/store/ui";

export function Header() {
  const locale = useLocale();
  const t = useTranslations();
  const { data: user } = api.user.me.useQuery();
  const { toggleSidebar } = useUiStore();

  const handleSignOut = async () => {
    // Use the shared client so signOut clears the cookie under the same
    // storageKey ("sc") that the middleware reads.
    const supabase = createClient();
    await supabase.auth.signOut();
    // Hard navigation so the middleware re-runs on a server request and the
    // cleared cookies are seen — soft router.push() can keep the session alive.
    window.location.href = `/${locale}/login`;
  };

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
          <span className="hidden max-w-[120px] truncate text-sm text-muted-foreground sm:block">
            {user.name}
          </span>
        )}
        <button
          onClick={handleSignOut}
          aria-label={t("auth.logout")}
          className="ml-1 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
