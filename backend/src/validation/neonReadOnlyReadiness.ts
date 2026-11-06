import { getPrismaClient } from "../lib/prisma";

type MigrationRow = { migration_name: string; finished_at: Date | null };
type CountRow = { count: bigint };

async function main() {
  const db = getPrismaClient();
  if (!db) throw new Error("Configured database is unavailable.");

  try {
    const identity = await db.$queryRawUnsafe<Array<{ database: string; role: string; serverVersion: string }>>(
      "SELECT current_database()::text AS database, current_user::text AS role, version()::text AS \"serverVersion\""
    );
    const migrations = await db.$queryRawUnsafe<MigrationRow[]>(
      'SELECT migration_name, finished_at FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 10'
    );
    const users = await db.$queryRawUnsafe<CountRow[]>('SELECT COUNT(*)::bigint AS count FROM "User"');
    const pipelines = await db.$queryRawUnsafe<CountRow[]>('SELECT COUNT(*)::bigint AS count FROM "Pipeline"');
    const admins = await db.$queryRawUnsafe<CountRow[]>('SELECT COUNT(*)::bigint AS count FROM "User" WHERE "role" = \'Admin\'');

    console.log(JSON.stringify({
      databaseIdentity: identity,
      counts: { users: String(users[0]?.count ?? 0), pipelines: String(pipelines[0]?.count ?? 0), admins: String(admins[0]?.count ?? 0) },
      appliedMigrations: migrations
    }, null, 2));
  } finally {
    await db.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Read-only readiness check failed.");
  process.exitCode = 1;
});
