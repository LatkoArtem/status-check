import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  // Routers додаватимуться тут у Phase 3:
  // commitment: commitmentRouter,
  // project: projectRouter,
  // user: userRouter,
  // notification: notificationRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
