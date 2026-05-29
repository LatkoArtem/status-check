import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const commitmentStatusEnum = pgEnum("commitment_status", [
  "to_check",
  "expired",
  "done",
  "not_actual",
  "ideas_backlog",
]);

export const userRoleEnum = pgEnum("user_role", ["admin", "member"]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").notNull().default("member"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").notNull().default("#3B82F6"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const commitments = pgTable("commitments", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  authorId: uuid("author_id")
    .notNull()
    .references(() => profiles.id),
  projectId: uuid("project_id").references(() => projects.id),
  responsibleExecutorId: uuid("responsible_executor_id").references(
    () => profiles.id,
  ),
  responsibleCheckerId: uuid("responsible_checker_id").references(
    () => profiles.id,
  ),
  deadline: timestamp("deadline", { withTimezone: true }).notNull(),
  status: commitmentStatusEnum("status").notNull().default("to_check"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedBy: uuid("updated_by").references(() => profiles.id),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => profiles.id),
  commitmentId: uuid("commitment_id").references(() => commitments.id),
  type: text("type").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Commitment = typeof commitments.$inferSelect;
export type NewCommitment = typeof commitments.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type CommitmentStatus = (typeof commitmentStatusEnum.enumValues)[number];
export type UserRole = (typeof userRoleEnum.enumValues)[number];
