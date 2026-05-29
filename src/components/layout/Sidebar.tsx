"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Calendar, ListTodo, Settings } from "lucide-react";
import { useUiStore } from "~/store/ui";
import { cn } from "~/lib/utils";

const NAV_ITEMS = [
  { key: "calendar" as const, href: "/calendar", icon: Calendar },
  { key: "commitments" as const, href: "/commitments", icon: ListTodo },
  { key: "settings" as const, href: "/settings", icon: Settings },
];

export function Sidebar() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const { sidebarOpen, closeSidebar } = useUiStore();

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col border-r border-border bg-card transition-transform duration-200",
          "md:relative md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center border-b border-border px-4">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            Status Check
          </span>
        </div>

        <nav className="flex flex-col gap-1 p-2 pt-3">
          {NAV_ITEMS.map(({ key, href, icon: Icon }) => {
            const fullHref = `/${locale}${href}`;
            const isActive = pathname.startsWith(fullHref);
            return (
              <Link
                key={key}
                href={fullHref}
                onClick={closeSidebar}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {t(key)}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
