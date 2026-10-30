const { readFileSync, existsSync, mkdirSync, writeFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { createHash } = require("node:crypto");
require("dotenv").config({ path: resolve(__dirname, "../../.env") });
const { PrismaClient } = require("@prisma/client");

async function run() {
  const db = new PrismaClient();
  try {
    const history = await db.$queryRawUnsafe('SELECT migration_name, checksum, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY started_at');
    const migrations = history.map(row => {
      const file = resolve(__dirname, "../../prisma/migrations", row.migration_name, "migration.sql");
      const checksum = existsSync(file) ? createHash("sha256").update(readFileSync(file)).digest("hex") : null;
      const sql = existsSync(file) ? readFileSync(file, "utf8") : "";
      const variants = sql ? [sql.replace(/\r\n/g, "\n"), sql.replace(/\r?\n/g, "\r\n"), sql.trimEnd(), sql.replace(/^\uFEFF/, "")] : [];
      return { name: row.migration_name, applied: !!row.finished_at && !row.rolled_back_at, filePresent: !!checksum, checksumMatches: checksum === row.checksum,
        ...checksum !== row.checksum ? { appliedChecksum: row.checksum, localChecksum: checksum, localBytes: Buffer.byteLength(sql), formattingVariantMatches: variants.some(value => createHash("sha256").update(value).digest("hex") === row.checksum) } : {} };
    });
    const counts = {};
    for (const table of ["ScadaTag", "SharedTimeSeriesReading", "ScadaAlarm", "ScadaEvent", "ScadaAnomaly", "ScadaIndicator", "DataQualityRecord", "ScadaAlarmNote"]) {
      counts[table] = Number((await db.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "${table}"`))[0].count);
    }
    const inconsistentQuality = await db.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM "DataQualityRecord" q JOIN "SharedTimeSeriesReading" r ON r."tagId"=q."tagId" AND r."sourceTimestamp"=q."recordedAt" AND q."recordId"=r."tagId" || ':' || to_char(r."sourceTimestamp",'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') || ':' || r.sequence WHERE q.quality!=r.quality`);
    const logicalSettingsColumns = await db.$queryRawUnsafe(`SELECT column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='ScadaTag' AND column_name IN ('groupName','historianEnabled','displayPrecision','updatedAt') ORDER BY column_name`);
    const configurationChanges = Number((await db.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "ScadaConfigChange"'))[0].count);
    const report = { checkedAt: new Date().toISOString(), readOnly: true, migrations, counts, logicalSettingsColumns, configurationChanges, inconsistentQualityRecords: inconsistentQuality[0].count };
    const directory = resolve(__dirname, "../../../.scada-verification");
    mkdirSync(directory, { recursive: true });
    writeFileSync(resolve(directory, "database-audit.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await db.$disconnect(); }
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
