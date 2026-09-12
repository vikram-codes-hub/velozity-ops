import { PrismaClient, Priority, TaskStatus } from '@prisma/client';
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding...");

  const passwordHash = await bcrypt.hash("Password123!", 10);

  // ── Users (upsert = safe to re-run) ──────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin@velozity.com" },
    update: { passwordHash },
    create: { email: "admin@velozity.com", name: "Alex Admin", role: "ADMIN", passwordHash },
  });
  await prisma.user.upsert({
    where: { email: "admin@company.com" },
    update: { passwordHash },
    create: { email: "admin@company.com", name: "Alex Admin", role: "ADMIN", passwordHash },
  });

  const pm1 = await prisma.user.upsert({
    where: { email: "pm1@velozity.com" },
    update: { passwordHash },
    create: { email: "pm1@velozity.com", name: "Priya Manager", role: "PM", passwordHash },
  });
  await prisma.user.upsert({
    where: { email: "pm@company.com" },
    update: { passwordHash },
    create: { email: "pm@company.com", name: "Priya Manager", role: "PM", passwordHash },
  });

  const pm2 = await prisma.user.upsert({
    where: { email: "pm2@velozity.com" },
    update: { passwordHash },
    create: { email: "pm2@velozity.com", name: "Marcus Manager", role: "PM", passwordHash },
  });

  await prisma.user.upsert({
    where: { email: "dev@company.com" },
    update: { passwordHash },
    create: { email: "dev@company.com", name: "Ravi Dev", role: "DEVELOPER", passwordHash },
  });

  const devNames = ["Ravi Dev", "Sara Dev", "Leo Dev", "Nina Dev"];
  const devs = await Promise.all(
    devNames.map((name, i) =>
      prisma.user.upsert({
        where: { email: `dev${i + 1}@velozity.com` },
        update: { passwordHash },
        create: { email: `dev${i + 1}@velozity.com`, name, role: "DEVELOPER", passwordHash },
      })
    )
  );

  // ── Clients (find-or-create by name) ─────────────────────────────────────
  async function findOrCreateClient(name: string) {
    const existing = await prisma.client.findFirst({ where: { name } });
    if (existing) return existing;
    return prisma.client.create({ data: { name } });
  }

  const client1 = await findOrCreateClient("Acme Corp");
  const client2 = await findOrCreateClient("Globex Inc");
  const client3 = await findOrCreateClient("Initech");

  // ── Projects (find-or-create by name + clientId) ──────────────────────────
  async function findOrCreateProject(name: string, clientId: string, createdById: string) {
    const existing = await prisma.project.findFirst({ where: { name, clientId } });
    if (existing) return existing;
    return prisma.project.create({ data: { name, clientId, createdById } });
  }

  const project1 = await findOrCreateProject("Acme Website Revamp", client1.id, pm1.id);
  const project2 = await findOrCreateProject("Globex Mobile App", client2.id, pm2.id);
  const project3 = await findOrCreateProject("Initech Internal Tools", client3.id, pm1.id);

  const statuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "TODO"];
  const priorities: Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL", "MEDIUM"];

  const projects = [project1, project2, project3];
  let overdueCreated = 0;
  let tasksSeeded = 0;

  for (const project of projects) {
    // Skip if this project already has tasks (idempotent)
    const existingTaskCount = await prisma.task.count({ where: { projectId: project.id } });
    if (existingTaskCount > 0) {
      console.log(`  Skipping tasks for "${project.name}" (already has ${existingTaskCount} tasks)`);
      continue;
    }

    for (let i = 0; i < 5; i++) {
      const dev = devs[i % devs.length];
      const isOverdue = overdueCreated < 2 && i === 0;
      const dueDate = isOverdue
        ? new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        : new Date(Date.now() + (i + 1) * 2 * 24 * 60 * 60 * 1000);

      const task = await prisma.task.create({
        data: {
          projectId: project.id,
          title: `${project.name} - Task ${i + 1}`,
          description: "Seed-generated task for demo purposes.",
          assignedToId: dev.id,
          status: isOverdue ? "OVERDUE" : statuses[i],
          priority: priorities[i],
          dueDate,
          overdueFlagged: isOverdue,
        },
      });

      if (isOverdue) overdueCreated++;
      tasksSeeded++;

      await prisma.activityLog.create({
        data: {
          taskId: task.id,
          projectId: project.id,
          userId: pm1.id,
          action: "TASK_CREATED",
          toValue: task.title,
        },
      });
    }
  }

  console.log("Seed complete:", {
    users: 1 + 2 + devs.length,
    projects: projects.length,
    tasksSeeded,
    overdueTasks: overdueCreated,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });