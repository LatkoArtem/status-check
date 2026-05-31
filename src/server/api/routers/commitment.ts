import { TRPCError } from "@trpc/server";
import { alias } from "drizzle-orm/pg-core";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { render } from "@react-email/render";
import { z } from "zod";
import { db } from "~/server/db";
import { commitments, notifications, profiles, projects } from "~/server/db/schema";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { sendEmail } from "~/lib/email";
import { AssignedEmail } from "~/emails/Assigned";
import { StatusChangedEmail } from "~/emails/StatusChanged";

const commitmentStatusSchema = z.enum([
  "to_check",
  "expired",
  "done",
  "not_actual",
  "ideas_backlog",
]);

const listFiltersSchema = z.object({
  projectId: z.string().uuid().optional(),
  checkerId: z.string().uuid().optional(),
  status: z.array(commitmentStatusSchema).optional(),
  from: z.date().optional(),
  to: z.date().optional(),
});

// Aliases for multiple joins to profiles
const author = alias(profiles, "author");
const executor = alias(profiles, "executor");
const checker = alias(profiles, "checker");
const updater = alias(profiles, "updater");

export const commitmentRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listFiltersSchema.optional())
    .query(async ({ input }) => {
      const conditions = [];

      if (input?.projectId) {
        conditions.push(eq(commitments.projectId, input.projectId));
      }
      if (input?.checkerId) {
        conditions.push(eq(commitments.responsibleCheckerId, input.checkerId));
      }
      if (input?.status?.length) {
        conditions.push(inArray(commitments.status, input.status));
      }
      if (input?.from) {
        conditions.push(gte(commitments.deadline, input.from));
      }
      if (input?.to) {
        conditions.push(lte(commitments.deadline, input.to));
      }

      return db
        .select({
          id: commitments.id,
          title: commitments.title,
          description: commitments.description,
          deadline: commitments.deadline,
          status: commitments.status,
          createdAt: commitments.createdAt,
          updatedAt: commitments.updatedAt,
          authorId: commitments.authorId,
          authorName: author.name,
          authorEmail: author.email,
          projectId: commitments.projectId,
          projectName: projects.name,
          projectColor: projects.color,
          responsibleExecutorId: commitments.responsibleExecutorId,
          executorName: executor.name,
          executorEmail: executor.email,
          responsibleCheckerId: commitments.responsibleCheckerId,
          checkerName: checker.name,
          checkerEmail: checker.email,
        })
        .from(commitments)
        .leftJoin(author, eq(commitments.authorId, author.id))
        .leftJoin(executor, eq(commitments.responsibleExecutorId, executor.id))
        .leftJoin(checker, eq(commitments.responsibleCheckerId, checker.id))
        .leftJoin(updater, eq(commitments.updatedBy, updater.id))
        .leftJoin(projects, eq(commitments.projectId, projects.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(asc(commitments.deadline));
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const rows = await db
        .select({
          id: commitments.id,
          title: commitments.title,
          description: commitments.description,
          deadline: commitments.deadline,
          status: commitments.status,
          createdAt: commitments.createdAt,
          updatedAt: commitments.updatedAt,
          authorId: commitments.authorId,
          authorName: author.name,
          authorEmail: author.email,
          projectId: commitments.projectId,
          projectName: projects.name,
          projectColor: projects.color,
          responsibleExecutorId: commitments.responsibleExecutorId,
          executorName: executor.name,
          executorEmail: executor.email,
          responsibleCheckerId: commitments.responsibleCheckerId,
          checkerName: checker.name,
          checkerEmail: checker.email,
        })
        .from(commitments)
        .leftJoin(author, eq(commitments.authorId, author.id))
        .leftJoin(executor, eq(commitments.responsibleExecutorId, executor.id))
        .leftJoin(checker, eq(commitments.responsibleCheckerId, checker.id))
        .leftJoin(projects, eq(commitments.projectId, projects.id))
        .where(eq(commitments.id, input.id))
        .limit(1);

      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND" });
      return rows[0];
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        description: z.string().max(2000).optional(),
        projectId: z.string().uuid().optional(),
        responsibleExecutorId: z.string().uuid().optional(),
        responsibleCheckerId: z.string().uuid().optional(),
        deadline: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // If the deadline is already in the past on create, mark it as
      // expired up-front instead of waiting for the pg_cron sweep.
      const initialStatus = input.deadline < new Date() ? "expired" : "to_check";

      const [commitment] = await db
        .insert(commitments)
        .values({
          ...input,
          status: initialStatus,
          authorId: ctx.user.id,
          updatedBy: ctx.user.id,
        })
        .returning();

      // Create "assigned" notifications for executor and checker
      const notifTargets = [
        input.responsibleExecutorId,
        input.responsibleCheckerId,
      ].filter((id): id is string => !!id && id !== ctx.user.id);

      if (notifTargets.length) {
        await db.insert(notifications).values(
          notifTargets.map((userId) => ({
            userId,
            commitmentId: commitment!.id,
            type: "assigned" as const,
          })),
        );

        // Send "assigned" emails (non-blocking)
        void (async () => {
          try {
            const recipients = await db.query.profiles.findMany({
              where: inArray(profiles.id, notifTargets),
              columns: { id: true, name: true, email: true },
            });
            await Promise.allSettled(
              recipients.map(async (r) => {
                const isExecutor = r.id === input.responsibleExecutorId;
                const html = await render(
                  AssignedEmail({
                    recipientName: r.name,
                    commitmentTitle: commitment!.title,
                    deadline: commitment!.deadline,
                    role: isExecutor ? "виконавець" : "перевіряючий",
                  }),
                );
                return sendEmail({
                  to: r.email,
                  subject: `Вас призначено: ${commitment!.title}`,
                  html,
                });
              }),
            );
          } catch (err) {
            console.error("[email] assigned:", err);
          }
        })();
      }

      return commitment;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().max(2000).nullable().optional(),
        projectId: z.string().uuid().nullable().optional(),
        responsibleExecutorId: z.string().uuid().nullable().optional(),
        responsibleCheckerId: z.string().uuid().nullable().optional(),
        deadline: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.commitments.findFirst({
        where: eq(commitments.id, input.id),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.id, ctx.user.id),
      });
      const isAdmin = profile?.role === "admin";
      const isOwner = existing.authorId === ctx.user.id;

      if (!isAdmin && !isOwner) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const { id, ...fields } = input;
      const [updated] = await db
        .update(commitments)
        .set({ ...fields, updatedBy: ctx.user.id, updatedAt: new Date() })
        .where(eq(commitments.id, id))
        .returning();

      // Notify newly assigned executor/checker
      const newTargets: string[] = [];
      if (
        input.responsibleExecutorId &&
        input.responsibleExecutorId !== existing.responsibleExecutorId &&
        input.responsibleExecutorId !== ctx.user.id
      ) {
        newTargets.push(input.responsibleExecutorId);
      }
      if (
        input.responsibleCheckerId &&
        input.responsibleCheckerId !== existing.responsibleCheckerId &&
        input.responsibleCheckerId !== ctx.user.id
      ) {
        newTargets.push(input.responsibleCheckerId);
      }
      if (newTargets.length) {
        await db.insert(notifications).values(
          newTargets.map((userId) => ({
            userId,
            commitmentId: id,
            type: "assigned" as const,
          })),
        );
      }

      return updated;
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: commitmentStatusSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.commitments.findFirst({
        where: eq(commitments.id, input.id),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.id, ctx.user.id),
      });
      const isAdmin = profile?.role === "admin";
      const isOwner = existing.authorId === ctx.user.id;

      if (!isAdmin && !isOwner) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const [updated] = await db
        .update(commitments)
        .set({
          status: input.status,
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        })
        .where(eq(commitments.id, input.id))
        .returning();

      // Notify author and assigned users about status change
      const notifTargets = [
        existing.authorId,
        existing.responsibleExecutorId,
        existing.responsibleCheckerId,
      ]
        .filter((id): id is string => !!id && id !== ctx.user.id)
        .filter((id, i, arr) => arr.indexOf(id) === i);

      if (notifTargets.length) {
        await db.insert(notifications).values(
          notifTargets.map((userId) => ({
            userId,
            commitmentId: input.id,
            type: "status_changed" as const,
          })),
        );

        // Send "status_changed" emails (non-blocking)
        void (async () => {
          try {
            const recipients = await db.query.profiles.findMany({
              where: inArray(profiles.id, notifTargets),
              columns: { id: true, name: true, email: true },
            });
            const changerProfile = await db.query.profiles.findFirst({
              where: eq(profiles.id, ctx.user.id),
              columns: { name: true },
            });
            const html = await render(
              StatusChangedEmail({
                recipientName: "{{NAME}}",
                commitmentTitle: existing.title,
                newStatus: input.status,
                changedByName: changerProfile?.name ?? "Система",
              }),
            );
            await Promise.allSettled(
              recipients.map((r) =>
                sendEmail({
                  to: r.email,
                  subject: `Статус змінено: ${existing.title}`,
                  html: html.replace("{{NAME}}", r.name),
                }),
              ),
            );
          } catch (err) {
            console.error("[email] status_changed:", err);
          }
        })();
      }

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.commitments.findFirst({
        where: eq(commitments.id, input.id),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.id, ctx.user.id),
      });
      const isAdmin = profile?.role === "admin";
      const isOwner = existing.authorId === ctx.user.id;

      if (!isAdmin && !isOwner) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const [deleted] = await db
        .delete(commitments)
        .where(eq(commitments.id, input.id))
        .returning();
      return deleted;
    }),
});
