import { redirect } from "next/navigation";

export default function DashboardRootPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  void params;
  redirect("calendar");
}
