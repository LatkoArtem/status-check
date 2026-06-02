import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;
const isDocker = !!process.env.SUPABASE_INTERNAL_URL;
const client = postgres(connectionString, {
  prepare: false,
  ...(!isDocker && { ssl: "require" }),
});
export const db = drizzle(client, { schema });
