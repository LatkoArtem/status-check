import { eq } from "drizzle-orm";
import { db } from "./index";
import { profiles, projects, commitments } from "./schema";

const ONE_DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

async function seed() {
  console.log("🌱 Seeding database...");

  // Get first registered user and make them admin
  const users = await db.select().from(profiles).limit(2);
  if (!users.length) {
    console.error(
      "❌ No users found. Please register at least one user at /register first.",
    );
    process.exit(1);
  }

  const [admin, member] = users;

  await db
    .update(profiles)
    .set({ role: "admin" })
    .where(eq(profiles.id, admin!.id));

  console.log(`✓ Admin: ${admin!.name} (${admin!.email})`);
  if (member) console.log(`✓ Member: ${member.name} (${member.email})`);

  // Projects
  const [proj1, proj2, proj3] = await db
    .insert(projects)
    .values([
      {
        name: "Продуктові оновлення",
        description: "Планові оновлення продукту Q2 2026",
        color: "#3B82F6",
        createdBy: admin!.id,
      },
      {
        name: "Технічний борг",
        description: "Рефакторинг та оптимізація кодової бази",
        color: "#8B5CF6",
        createdBy: admin!.id,
      },
      {
        name: "Маркетинг",
        description: "Маркетингові активності та контент",
        color: "#F59E0B",
        createdBy: admin!.id,
      },
    ])
    .returning();

  console.log(`✓ Created ${3} projects`);

  const secondUserId = member?.id ?? admin!.id;

  // Commitments with various statuses and deadlines
  const commitmentData = [
    {
      title: "Оновити документацію API",
      description: "Оновити всі ендпоінти до нової версії v2",
      authorId: admin!.id,
      projectId: proj1!.id,
      responsibleExecutorId: secondUserId,
      responsibleCheckerId: admin!.id,
      deadline: new Date(now + 2 * ONE_DAY),
      status: "to_check" as const,
    },
    {
      title: "Написати unit тести для auth модуля",
      description: "Покрити тестами всі auth endpoints (мін. 80%)",
      authorId: admin!.id,
      projectId: proj2!.id,
      responsibleExecutorId: secondUserId,
      responsibleCheckerId: admin!.id,
      deadline: new Date(now + 5 * ONE_DAY),
      status: "to_check" as const,
    },
    {
      title: "Підготувати презентацію для інвесторів",
      description: "Deck з метриками за Q1 та Q2 план",
      authorId: admin!.id,
      projectId: proj3!.id,
      responsibleExecutorId: admin!.id,
      responsibleCheckerId: secondUserId,
      deadline: new Date(now + 7 * ONE_DAY),
      status: "to_check" as const,
    },
    {
      title: "Мігрувати базу даних на нову схему",
      description: "Застосувати міграції v2.0 без downtime",
      authorId: admin!.id,
      projectId: proj2!.id,
      responsibleExecutorId: secondUserId,
      responsibleCheckerId: admin!.id,
      deadline: new Date(now - 1 * ONE_DAY),
      status: "done" as const,
    },
    {
      title: "Налаштувати CI/CD pipeline",
      description: "GitHub Actions: lint → test → build → deploy",
      authorId: admin!.id,
      projectId: proj2!.id,
      responsibleExecutorId: admin!.id,
      deadline: new Date(now - 3 * ONE_DAY),
      status: "expired" as const,
    },
    {
      title: "Дизайн нового онбордингу",
      description: "Wireframes та прототипи в Figma",
      authorId: admin!.id,
      projectId: proj1!.id,
      responsibleExecutorId: secondUserId,
      responsibleCheckerId: admin!.id,
      deadline: new Date(now + 10 * ONE_DAY),
      status: "to_check" as const,
    },
    {
      title: "SEO оптимізація лендингу",
      description: "Core Web Vitals, мета-теги, sitemap",
      authorId: admin!.id,
      projectId: proj3!.id,
      responsibleExecutorId: secondUserId,
      deadline: new Date(now + 14 * ONE_DAY),
      status: "ideas_backlog" as const,
    },
    {
      title: "Рефакторинг компонента таблиці",
      description: "Витягнути в shared UI компонент",
      authorId: admin!.id,
      projectId: proj2!.id,
      responsibleExecutorId: admin!.id,
      deadline: new Date(now - 5 * ONE_DAY),
      status: "not_actual" as const,
    },
  ];

  await db.insert(commitments).values(
    commitmentData.map((c) => ({ ...c, updatedBy: admin!.id })),
  );

  console.log(`✓ Created ${commitmentData.length} commitments`);
  console.log("\n✅ Seed completed successfully!");
  console.log(`\n👤 Login as admin: ${admin!.email}`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
