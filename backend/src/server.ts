import { startSensorIngestionRuntime } from "./sensorIngestion/runtime";
import { env } from "./config/env";
import { initializeStorage } from "./data/store";
import { disconnectPrisma } from "./lib/prisma";
import { createApp } from "./app";

let sensorRuntime:Awaited<ReturnType<typeof startSensorIngestionRuntime>>|null=null;
let server: ReturnType<ReturnType<typeof createApp>["listen"]> | null = null;

async function start() {
  await initializeStorage();
  sensorRuntime=await startSensorIngestionRuntime();
  const app = createApp();

  const listening = () => console.log(`Klinthru backend listening on configured host, port ${env.port}`);
  server = env.apiHost ? app.listen(env.port, env.apiHost, listening) : app.listen(env.port, listening);
}

async function shutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down backend.`);
  await sensorRuntime?.close();
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
  await sensorRuntime?.close();
  await disconnectPrisma();
  process.exitCode = 1;
});
