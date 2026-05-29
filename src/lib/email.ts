import { Resend } from "resend";

const client = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!client) return;
  try {
    await client.emails.send({ from: FROM_EMAIL, to, subject, html });
  } catch (err) {
    console.error("[email] send failed:", err);
  }
}
