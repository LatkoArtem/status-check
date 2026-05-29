"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "~/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const toggle = () => {
    const next = locale === "uk" ? "en" : "uk";
    const segments = pathname.split("/");
    segments[1] = next;
    router.push(segments.join("/"));
  };

  return (
    <button
      onClick={toggle}
      className={cn(
        "flex h-8 items-center rounded-md px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        className,
      )}
    >
      {locale === "uk" ? "EN" : "UK"}
    </button>
  );
}
