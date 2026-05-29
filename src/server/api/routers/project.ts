import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/server/db";
import { projects } from "~/server/db/schema";
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
} from "../trpc";

export const projectRouter = createTRPCRouter({
  list: protectedProcedure.query(async () => {
    return db.query.projects.findMany({
      orderBy: (p, { asc }) => asc(p.name),
    });
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#3B82F6"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [project] = await db
        .insert(projects)
        .values({
          name: input.name,
          description: input.description,
          color: input.color,
          createdBy: ctx.user.id,
        })
        .returning();
      return project;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).nullable().optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...fields } = input;
      const [updated] = await db
        .update(projects)
        .set(fields)
        .where(eq(projects.id, id))
        .returning();
      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const [deleted] = await db
        .delete(projects)
        .where(eq(projects.id, input.id))
        .returning();
      if (!deleted) throw new TRPCError({ code: "NOT_FOUND" });
      return deleted;
    }),
});
