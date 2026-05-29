import { type NextRequest, NextResponse } from "next/server";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { render } from "@react-email/render";
import { db } from "~/server/db";
import { commitments, notifications, profiles } from "~/server/db/schema";
import { sendEmail } from "~/lib/email";
import { DeadlineApproachingEmail } from "~/emails/DeadlineApproaching";

export async function POST(req: NextRequest) {
  // Verify request is from pg_cron / Supabase
  const auth = req.headers.get("authorization");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const ago23h = new Date(now.getTime() - 23 * 60 * 60 * 1000);

  // Find commitments with deadline in next 24 hours that are still pending
  const upcoming = await db.query.commitments.findMany({
    where: and(
      eq(commitments.status, "to_check"),
      gte(commitments.deadline, now),
      lte(commitments.deadline, in24h),
    ),
    with: {
      author: true,
    },
  });

  if (!upcoming.length) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;

  for (const commitment of upcoming) {
    // Collect executor + checker IDs (skip if missing)
    const targets = [
      commitment.responsibleExecutorId,
      commitment.responsibleCheckerId,
    ].filter((id): id is string => !!id);

    for (const userId of targets) {
      // Deduplicate: skip if already notified in last 23 hours
      const existing = await db.query.notifications.findFirst({
        where: and(
          eq(notifications.commitmentId, commitment.id),
          eq(notifications.userId, userId),
          eq(notifications.type, "deadline_approaching"),
          gte(notifications.createdAt, ago23h),
        ),
        columns: { id: true },
      });

      if (existing) continue;

      // Create notification record
      await db.insert(notifications).values({
        userId,
        commitmentId: commitment.id,
        type: "deadline_approaching",
      });

      // Send email
      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.id, userId),
        columns: { name: true, email: true },
      });

      if (profile) {
        try {
          const html = await render(
            DeadlineApproachingEmail({
              recipientName: profile.name,
              commitmentTitle: commitment.title,
              deadline: commitment.deadline,
              authorName: (commitment as { author?: { name?: string } }).author?.name ?? "—",
            }),
          );
          await sendEmail({
            to: profile.email,
            subject: `⚠️ Дедлайн завтра: ${commitment.title}`,
            html,
          });
          sent++;
        } catch (err) {
          console.error("[deadline-email]", commitment.id, err);
        }
      }
    }
  }

  return NextResponse.json({ sent });
}
