import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";

const server = app.listen(env.PORT, () => {
  console.log(
    `TaskFlow API executando em http://localhost:${env.PORT}`
  );
});

async function shutdown(signal: string) {
  console.log(`\nRecebido ${signal}. Encerrando servidor...`);

  server.close(async () => {
    await prisma.$disconnect();

    console.log("Servidor encerrado.");
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});