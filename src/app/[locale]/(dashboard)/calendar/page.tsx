import { getTranslations } from "next-intl/server";
import { CalendarView } from "~/components/calendar/CalendarView";

export async function generateMetadata() {
  const t = await getTranslations("calendar");
  return { title: t("title") };
}

export default function CalendarPage() {
  return <CalendarView />;
}
