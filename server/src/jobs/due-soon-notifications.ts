import { prisma } from "../config/prisma.js";

async function main() {
  const now = new Date();
  const deadline = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  );

  const tasks = await prisma.task.findMany({
    where: {
      dueDate: {
        gte: now,
        lte: deadline,
      },
      completedAt: null,
      assigneeId: {
        not: null,
      },
      column: {
        type: {
          not: "DONE",
        },
      },
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      assigneeId: true,
    },
  });

  const data = tasks.flatMap((task) => {
    if (!task.assigneeId || !task.dueDate) {
      return [];
    }

    return [{
      userId: task.assigneeId,
      taskId: task.id,
      type: "TASK_DUE_SOON" as const,
      message:
        `A tarefa "${task.title}" vence em breve.`,
      dedupeKey:
        `due-soon:${task.id}:${task.dueDate.toISOString()}`,
    }];
  });

  if (data.length > 0) {
    const result = await prisma.notification.createMany({
      data,
      skipDuplicates: true,
    });

    console.log(
      `Lembretes criados: ${result.count}`,
    );
  } else {
    console.log("Nenhuma tarefa próxima do vencimento.");
  }
}

main()
  .catch((error) => {
    console.error(
      "Erro ao gerar lembretes de prazo:",
      error,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
