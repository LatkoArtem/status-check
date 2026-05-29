import { getTranslations } from "next-intl/server";
import { RegisterForm } from "~/components/auth/RegisterForm";

export async function generateMetadata() {
  const t = await getTranslations("auth");
  return { title: `${t("registerTitle")} — Status Check` };
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Status Check
          </h1>
          <p className="text-sm text-muted-foreground">
            Заповніть форму для реєстрації
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
