import { initTRPC, TRPCError } from "@trpc/server";
import SuperJSON from "superjson";
import { ZodError } from "zod";
import { createClient } from "~/lib/supabase/server";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    supabase,
    user,
    headers: opts.headers,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: SuperJSON,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();
  if (t._config.isDev) {
    await new Promise((resolve) =>
      setTimeout(resolve, Math.floor(Math.random() * 400) + 100),
    );
  }
  const result = await next();
  console.log(`[tRPC] ${path} — ${Date.now() - start}ms`);
  return result;
});

export const publicProcedure = t.procedure.use(timingMiddleware);

export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  });

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const { data: profile } = await ctx.supabase
    .from("profiles")
    .select("role")
    .eq("id", ctx.user.id)
    .single();

  if (profile?.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  return next({ ctx });
});
