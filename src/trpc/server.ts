import "server-only";

import { createHydrationHelpers } from "@trpc/react-query/rsc";
import { headers } from "next/headers";
import { cache } from "react";
import { createCaller, type AppRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { getQueryClient } from "./query-client";

const createContext = cache(async () => {
  const heads = new Headers(await headers());
  heads.set("x-trpc-source", "rsc");
  return createTRPCContext({ headers: heads });
});

const cachedGetQueryClient = cache(getQueryClient);

export const { trpc: api, HydrateClient } = createHydrationHelpers<AppRouter>(
  createCaller(createContext),
  cachedGetQueryClient,
);
