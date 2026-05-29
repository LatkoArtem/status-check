import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "~/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const protectedPaths = ["/calendar", "/commitments", "/settings"];

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isProtected = protectedPaths.some((path) =>
    pathname.includes(path),
  );

  if (isProtected) {
    const token =
      request.cookies.get("sb-access-token")?.value ??
      request.cookies.get(
        `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split(".")?.[0]?.split("//")[1]}-auth-token`,
      )?.value;

    if (!token) {
      const locale = pathname.split("/")[1] ?? "uk";
      return NextResponse.redirect(
        new URL(`/${locale}/login`, request.url),
      );
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
