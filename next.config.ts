import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const supabaseInternalUrl =
  process.env.SUPABASE_INTERNAL_URL ?? "http://localhost:54321";

const config = {
  output: "standalone" as const,
  outputFileTracingRoot: process.cwd(),
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: "/auth/v1/:path*",
        destination: `${supabaseInternalUrl}/auth/v1/:path*`,
      },
    ];
  },
};

export default withNextIntl(config);
