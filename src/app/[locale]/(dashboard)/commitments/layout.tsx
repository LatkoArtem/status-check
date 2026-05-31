import { getTranslations } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("commitments") };
}

export default function CommitmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
