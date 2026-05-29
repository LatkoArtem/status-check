import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/server/db";
import { profiles } from "~/server/db/schema";
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "../trpc";

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => {
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, ctx.user.id),
    });
    if (!profile) throw new TRPCError({ code: "NOT_FOUND" });
    return profile;
  }),

  list: adminProcedure.query(async () => {
    return db.query.profiles.findMany({
      orderBy: (p, { asc }) => asc(p.name),
    });
  }),

  listAll: protectedProcedure.query(async () => {
    return db.query.profiles.findMany({
      orderBy: (p, { asc }) => asc(p.name),
      columns: { id: true, name: true, email: true, avatarUrl: true },
    });
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        avatarUrl: z.string().url().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(profiles)
        .set({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
        })
        .where(eq(profiles.id, ctx.user.id))
        .returning();
      return updated;
    }),

  updateRole: adminProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        role: z.enum(["admin", "member"]),
      }),
    )
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(profiles)
        .set({ role: input.role })
        .where(eq(profiles.id, input.userId))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),
});
