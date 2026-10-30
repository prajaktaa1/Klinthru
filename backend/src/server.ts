import { env } from "./config/env";
import { initializeStorage } from "./data/store";
import { disconnectPrisma } from "./lib/prisma";
import { createApp } from "./app";

let server: ReturnType<ReturnType<typeof createApp>["listen"]> | null = null;

async function start() {
  await initializeStorage();
  const app = createApp();

  server = app.listen(env.port, () => {
    console.log(`Klinthru backend listening on http://localhost:${env.port}`);
  });
}

async function shutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down backend.`);
  if (!server) {
    await disconnectPrisma();
    process.exit(0);
  }

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

start().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await disconnectPrisma();
  process.exitCode = 1;
});
