import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const supabaseInternalUrl = process.env.SUPABASE_INTERNAL_URL;

const config = {
  // standalone output is only needed for Docker self-hosted; Vercel handles its own output
  ...(supabaseInternalUrl && {
    output: "standalone" as const,
    outputFileTracingRoot: process.cwd(),
  }),
  eslint: {
    ignoreDuringBuilds: true,
  },
  // proxy /auth/v1/* to Kong (Docker only); on Vercel clients talk directly to Supabase Cloud
  ...(supabaseInternalUrl && {
    async rewrites() {
      return [
        {
          source: "/auth/v1/:path*",
          destination: `${supabaseInternalUrl}/auth/v1/:path*`,
        },
      ];
    },
  }),
};

export default withNextIntl(config);
