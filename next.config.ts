import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const config = {
  outputFileTracingRoot: process.cwd(),
};

export default withNextIntl(config);
