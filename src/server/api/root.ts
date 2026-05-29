import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { commitmentRouter } from "./routers/commitment";
import { notificationRouter } from "./routers/notification";
import { projectRouter } from "./routers/project";
import { userRouter } from "./routers/user";

export const appRouter = createTRPCRouter({
  commitment: commitmentRouter,
  project: projectRouter,
  user: userRouter,
  notification: notificationRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
