import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("settings");
  return { title: t("title") };
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
