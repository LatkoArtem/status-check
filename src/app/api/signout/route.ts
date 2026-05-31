import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "~/lib/supabase/server";
import { routing } from "~/i18n/routing";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const localeParam = request.nextUrl.searchParams.get("locale");
  const locale = routing.locales.includes(localeParam as "uk" | "en")
    ? localeParam!
    : routing.defaultLocale;

  // Next.js standalone in Docker binds to 0.0.0.0; request.url then carries
  // that as the host, and the browser refuses to redirect to 0.0.0.0. Build
  // the absolute URL from the forwarded host header instead.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host") ?? "localhost:3000";
  const proto =
    request.headers.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");

  return NextResponse.redirect(`${proto}://${host}/${locale}/login`, {
    status: 303,
  });
}
