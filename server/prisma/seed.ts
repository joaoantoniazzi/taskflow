import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não definida.");
}

const pool = new Pool({
  connectionString,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("Iniciando seed do TaskFlow...");

  /*
   * --------------------------------------------------
   * IDs fixos
   * --------------------------------------------------
   *
   * Usamos IDs conhecidos para que o seed seja
   * reproduzível e possa ser executado novamente.
   */

  const userIds = {
    joao: "11111111-1111-4111-8111-111111111111",
    maria: "22222222-2222-4222-8222-222222222222",
    pedro: "33333333-3333-4333-8333-333333333333",
  };

  const teamId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const projectId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const boardId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

  const columnIds = {
    todo: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    doing: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    done: "ffffffff-ffff-4fff-8fff-ffffffffffff",
  };

  /*
   * --------------------------------------------------
   * Senhas
   * --------------------------------------------------
   */

  const passwordHash = await bcrypt.hash("TaskFlow@123", 10);

  /*
   * --------------------------------------------------
   * Usuários
   * --------------------------------------------------
   */

  const joao = await prisma.user.upsert({
    where: {
      email: "joao@taskflow.local",
    },
    update: {
      name: "João Silva",
      passwordHash,
    },
    create: {
      id: userIds.joao,
      name: "João Silva",
      email: "joao@taskflow.local",
      passwordHash,
    },
  });

  const maria = await prisma.user.upsert({
    where: {
      email: "maria@taskflow.local",
    },
    update: {
      name: "Maria Souza",
      passwordHash,
    },
    create: {
      id: userIds.maria,
      name: "Maria Souza",
      email: "maria@taskflow.local",
      passwordHash,
    },
  });

  const pedro = await prisma.user.upsert({
    where: {
      email: "pedro@taskflow.local",
    },
    update: {
      name: "Pedro Oliveira",
      passwordHash,
    },
    create: {
      id: userIds.pedro,
      name: "Pedro Oliveira",
      email: "pedro@taskflow.local",
      passwordHash,
    },
  });

  /*
   * --------------------------------------------------
   * Equipe
   * --------------------------------------------------
   */

  const team = await prisma.team.upsert({
    where: {
      id: teamId,
    },
    update: {
      name: "Equipe TaskFlow",
    },
    create: {
      id: teamId,
      name: "Equipe TaskFlow",
    },
  });

  /*
   * --------------------------------------------------
   * Membros da equipe
   * --------------------------------------------------
   */

  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: team.id,
        userId: joao.id,
      },
    },
    update: {
      role: "OWNER",
    },
    create: {
      teamId: team.id,
      userId: joao.id,
      role: "OWNER",
    },
  });

  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: team.id,
        userId: maria.id,
      },
    },
    update: {
      role: "ADMIN",
    },
    create: {
      teamId: team.id,
      userId: maria.id,
      role: "ADMIN",
    },
  });

  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: team.id,
        userId: pedro.id,
      },
    },
    update: {
      role: "MEMBER",
    },
    create: {
      teamId: team.id,
      userId: pedro.id,
      role: "MEMBER",
    },
  });

  /*
   * --------------------------------------------------
   * Projeto
   * --------------------------------------------------
   */

  const project = await prisma.project.upsert({
    where: {
      id: projectId,
    },
    update: {
      name: "Projeto Faculdade",
      description:
        "Projeto acadêmico para desenvolvimento e avaliação do TaskFlow.",
      dueDate: new Date("2026-12-15"),
    },
    create: {
      id: projectId,
      teamId: team.id,
      createdById: joao.id,
      name: "Projeto Faculdade",
      description:
        "Projeto acadêmico para desenvolvimento e avaliação do TaskFlow.",
      dueDate: new Date("2026-12-15"),
    },
  });

  /*
   * --------------------------------------------------
   * Quadro
   * --------------------------------------------------
   */

  const board = await prisma.board.upsert({
    where: {
      id: boardId,
    },
    update: {
      name: "Quadro principal",
    },
    create: {
      id: boardId,
      projectId: project.id,
      name: "Quadro principal",
    },
  });

  /*
   * --------------------------------------------------
   * Colunas
   * --------------------------------------------------
   */

  const todo = await prisma.boardColumn.upsert({
    where: {
      id: columnIds.todo,
    },
    update: {
      name: "A Fazer",
      type: "TODO",
      position: 0,
      wipLimit: null,
    },
    create: {
      id: columnIds.todo,
      boardId: board.id,
      name: "A Fazer",
      type: "TODO",
      position: 0,
    },
  });

  const doing = await prisma.boardColumn.upsert({
    where: {
      id: columnIds.doing,
    },
    update: {
      name: "Em Andamento",
      type: "DOING",
      position: 1,
      wipLimit: 3,
    },
    create: {
      id: columnIds.doing,
      boardId: board.id,
      name: "Em Andamento",
      type: "DOING",
      position: 1,
      wipLimit: 3,
    },
  });

  const done = await prisma.boardColumn.upsert({
    where: {
      id: columnIds.done,
    },
    update: {
      name: "Concluído",
      type: "DONE",
      position: 2,
      wipLimit: null,
    },
    create: {
      id: columnIds.done,
      boardId: board.id,
      name: "Concluído",
      type: "DONE",
      position: 2,
    },
  });

  /*
   * --------------------------------------------------
   * Tarefas
   * --------------------------------------------------
   */

  const taskIds = {
    login: "10111111-1111-4111-8111-111111111111",
    database: "10222222-2222-4222-8222-222222222222",
    board: "10333333-3333-4333-8333-333333333333",
    profile: "10444444-4444-4444-8444-444444444444",
    api: "10555555-5555-4555-8555-555555555555",
    test: "10666666-6666-4666-8666-666666666666",
  };

  await prisma.task.upsert({
    where: {
      id: taskIds.login,
    },
    update: {
      title: "Implementar tela de login",
      description: "Criar a tela de autenticação do aplicativo móvel.",
      priority: "HIGH",
      position: 0,
      assigneeId: maria.id,
      columnId: doing.id,
      dueDate: new Date("2026-10-05T23:59:00-03:00"),
      completedAt: null,
    },
    create: {
      id: taskIds.login,
      columnId: doing.id,
      assigneeId: maria.id,
      createdById: joao.id,
      title: "Implementar tela de login",
      description: "Criar a tela de autenticação do aplicativo móvel.",
      priority: "HIGH",
      dueDate: new Date("2026-10-05T23:59:00-03:00"),
      position: 0,
    },
  });

  await prisma.task.upsert({
    where: {
      id: taskIds.database,
    },
    update: {
      title: "Modelar banco de dados",
      description: "Finalizar o modelo relacional do PostgreSQL.",
      priority: "HIGH",
      position: 0,
      assigneeId: joao.id,
      columnId: done.id,
      dueDate: new Date("2026-09-30T23:59:00-03:00"),
      completedAt: new Date("2026-09-20T18:00:00-03:00"),
    },
    create: {
      id: taskIds.database,
      columnId: done.id,
      assigneeId: joao.id,
      createdById: joao.id,
      title: "Modelar banco de dados",
      description: "Finalizar o modelo relacional do PostgreSQL.",
      priority: "HIGH",
      dueDate: new Date("2026-09-30T23:59:00-03:00"),
      position: 0,
      completedAt: new Date("2026-09-20T18:00:00-03:00"),
    },
  });

  await prisma.task.upsert({
    where: {
      id: taskIds.board,
    },
    update: {
      title: "Implementar quadro Kanban",
      description: "Criar quadro com colunas e cartões de tarefas.",
      priority: "HIGH",
      position: 1,
      assigneeId: joao.id,
      columnId: doing.id,
      dueDate: new Date("2026-10-15T23:59:00-03:00"),
      completedAt: null,
    },
    create: {
      id: taskIds.board,
      columnId: doing.id,
      assigneeId: joao.id,
      createdById: joao.id,
      title: "Implementar quadro Kanban",
      description: "Criar quadro com colunas e cartões de tarefas.",
      priority: "HIGH",
      dueDate: new Date("2026-10-15T23:59:00-03:00"),
      position: 1,
    },
  });

  await prisma.task.upsert({
    where: {
      id: taskIds.profile,
    },
    update: {
      title: "Criar tela de perfil",
      description: "Tela para visualização e edição dos dados do usuário.",
      priority: "MEDIUM",
      position: 0,
      assigneeId: pedro.id,
      columnId: todo.id,
      dueDate: new Date("2026-10-20T23:59:00-03:00"),
      completedAt: null,
    },
    create: {
      id: taskIds.profile,
      columnId: todo.id,
      assigneeId: pedro.id,
      createdById: maria.id,
      title: "Criar tela de perfil",
      description: "Tela para visualização e edição dos dados do usuário.",
      priority: "MEDIUM",
      dueDate: new Date("2026-10-20T23:59:00-03:00"),
      position: 0,
    },
  });

  await prisma.task.upsert({
    where: {
      id: taskIds.api,
    },
    update: {
      title: "Implementar endpoints de projetos",
      description: "Criar endpoints REST para criação e consulta de projetos.",
      priority: "MEDIUM",
      position: 1,
      assigneeId: maria.id,
      columnId: todo.id,
      dueDate: new Date("2026-10-12T23:59:00-03:00"),
      completedAt: null,
    },
    create: {
      id: taskIds.api,
      columnId: todo.id,
      assigneeId: maria.id,
      createdById: joao.id,
      title: "Implementar endpoints de projetos",
      description: "Criar endpoints REST para criação e consulta de projetos.",
      priority: "MEDIUM",
      dueDate: new Date("2026-10-12T23:59:00-03:00"),
      position: 1,
    },
  });

  await prisma.task.upsert({
    where: {
      id: taskIds.test,
    },
    update: {
      title: "Testar autenticação",
      description: "Validar cadastro, login e renovação de sessão.",
      priority: "LOW",
      position: 2,
      assigneeId: null,
      columnId: todo.id,
      dueDate: null,
      completedAt: null,
    },
    create: {
      id: taskIds.test,
      columnId: todo.id,
      createdById: joao.id,
      title: "Testar autenticação",
      description: "Validar cadastro, login e renovação de sessão.",
      priority: "LOW",
      position: 2,
    },
  });

  /*
   * --------------------------------------------------
   * Comentários
   * --------------------------------------------------
   */

  await prisma.comment.upsert({
    where: {
      id: "20111111-1111-4111-8111-111111111111",
    },
    update: {
      content: "A estrutura inicial da tela já foi definida.",
    },
    create: {
      id: "20111111-1111-4111-8111-111111111111",
      taskId: taskIds.login,
      userId: maria.id,
      content: "A estrutura inicial da tela já foi definida.",
    },
  });

  await prisma.comment.upsert({
    where: {
      id: "20222222-2222-4222-8222-222222222222",
    },
    update: {
      content: "O modelo relacional foi concluído.",
    },
    create: {
      id: "20222222-2222-4222-8222-222222222222",
      taskId: taskIds.database,
      userId: joao.id,
      content: "O modelo relacional foi concluído.",
    },
  });

  /*
   * --------------------------------------------------
   * Notificações
   * --------------------------------------------------
   */

  await prisma.notification.upsert({
    where: {
      id: "30111111-1111-4111-8111-111111111111",
    },
    update: {
      message: "Você foi atribuído à tarefa 'Implementar quadro Kanban'.",
      readAt: null,
    },
    create: {
      id: "30111111-1111-4111-8111-111111111111",
      userId: joao.id,
      taskId: taskIds.board,
      type: "TASK_ASSIGNED",
      message: "Você foi atribuído à tarefa 'Implementar quadro Kanban'.",
    },
  });

  await prisma.notification.upsert({
    where: {
      id: "30222222-2222-4222-8222-222222222222",
    },
    update: {
      message: "Maria comentou na tarefa 'Implementar tela de login'.",
      readAt: null,
    },
    create: {
      id: "30222222-2222-4222-8222-222222222222",
      userId: joao.id,
      taskId: taskIds.login,
      type: "TASK_COMMENTED",
      message: "Maria comentou na tarefa 'Implementar tela de login'.",
    },
  });

  console.log("Seed concluído com sucesso.");
  console.log("");
  console.log("Usuários:");
  console.log("  joao@taskflow.local");
  console.log("  maria@taskflow.local");
  console.log("  pedro@taskflow.local");
  console.log("");
  console.log("Senha dos usuários:");
  console.log("  TaskFlow@123");
}

main()
  .catch((error) => {
    console.error("Erro durante o seed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });