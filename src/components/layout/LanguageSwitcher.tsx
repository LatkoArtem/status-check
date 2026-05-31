"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useRouter, usePathname } from "~/i18n/navigation";
import { cn } from "~/lib/utils";

/**
 * Switches between `uk` and `en` while keeping the user on the same route.
 *
 * Uses next-intl's locale-aware router/pathname so:
 *   - The path is computed without the locale prefix and re-prefixed by the
 *     router under the hood — no manual segment surgery, no off-by-one.
 *   - The transition is wrapped in `useTransition` so React shows the new
 *     locale without unmounting the page; no white flash.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("layout");
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const next = locale === "uk" ? "en" : "uk";
    startTransition(() => {
      // `pathname` here is the un-prefixed path (e.g. "/calendar"). next-intl
      // re-applies the chosen locale, preserving any [param] segments.
      router.replace(
        // @ts-expect-error — params type is loose; next-intl accepts it
        { pathname, params },
        { locale: next, scroll: false },
      );
    });
  };

  return (
    <button
      onClick={toggle}
      disabled={pending}
      aria-label={t("switchLanguage")}
      className={cn(
        "flex h-8 items-center rounded-md px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50",
        className,
      )}
    >
      {locale === "uk" ? "EN" : "UK"}
    </button>
  );
}
