import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/server/db";
import { notifications } from "~/server/db/schema";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const notificationRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.query.notifications.findMany({
      where: eq(notifications.userId, ctx.user.id),
      orderBy: desc(notifications.createdAt),
      limit: 50,
      with: {
        commitment: {
          columns: { id: true, title: true },
        },
      },
    });
  }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const unread = await db.query.notifications.findMany({
      where: and(
        eq(notifications.userId, ctx.user.id),
        eq(notifications.isRead, false),
      ),
      columns: { id: true },
    });
    return unread.length;
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(notifications)
        .set({ isRead: true })
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.userId, ctx.user.id),
          ),
        )
        .returning();
      return updated;
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.isRead, false),
        ),
      );
    return { success: true };
  }),
});
