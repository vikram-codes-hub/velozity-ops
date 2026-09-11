import { PrismaClient, Priority, TaskStatus } from '@prisma/client';
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding...");

  const passwordHash = await bcrypt.hash("Password123!", 10);

  const admin = await prisma.user.create({
    data: { email: "admin@velozity.com", name: "Alex Admin", role: "ADMIN", passwordHash },
  });

  const pm1 = await prisma.user.create({
    data: { email: "pm1@velozity.com", name: "Priya Manager", role: "PM", passwordHash },
  });
  const pm2 = await prisma.user.create({
    data: { email: "pm2@velozity.com", name: "Marcus Manager", role: "PM", passwordHash },
  });

  const devNames = ["Ravi Dev", "Sara Dev", "Leo Dev", "Nina Dev"];
  const devs = await Promise.all(
    devNames.map((name, i) =>
      prisma.user.create({
        data: { email: `dev${i + 1}@velozity.com`, name, role: "DEVELOPER", passwordHash },
      })
    )
  );

  const client1 = await prisma.client.create({ data: { name: "Acme Corp" } });
  const client2 = await prisma.client.create({ data: { name: "Globex Inc" } });
  const client3 = await prisma.client.create({ data: { name: "Initech" } });

  const project1 = await prisma.project.create({
    data: { name: "Acme Website Revamp", clientId: client1.id, createdById: pm1.id },
  });
  const project2 = await prisma.project.create({
    data: { name: "Globex Mobile App", clientId: client2.id, createdById: pm2.id },
  });
  const project3 = await prisma.project.create({
    data: { name: "Initech Internal Tools", clientId: client3.id, createdById: pm1.id },
  });

  const statuses: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "TODO"];
  const priorities: Priority[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL", "MEDIUM"];

  const projects = [project1, project2, project3];
  let overdueCreated = 0;

  for (const project of projects) {
    for (let i = 0; i < 5; i++) {
      const dev = devs[i % devs.length];
      const isOverdue = overdueCreated < 2 && i === 0;
      const dueDate = isOverdue
        ? new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days in the past
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