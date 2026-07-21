import { env } from "./config/env";
import { disconnectPrisma } from "./lib/prisma";
import { createApp } from "./app";

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`Klinthru backend listening on http://localhost:${env.port}`);
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down backend.`);
  server.close(async () => {
    await disconnectPrisma();
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
