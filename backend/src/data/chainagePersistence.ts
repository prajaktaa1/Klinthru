import { parseKp } from "../coreEngine/chainage/ChainageAgent";
import { chainageSettingsShape, ChainageSettings } from "../validation/chainageSettings";
import { createValidationError } from "../validation/validationErrors";

type Client = { $queryRawUnsafe<T = unknown>(sql: string, ...values: unknown[]): Promise<T> };
const fields = Object.keys(chainageSettingsShape);
const quote = (name: string) => `"${name}"`;

// Keep the current generated client compatible with development's unmigrated schema.
// Inspect the actual connection; never cache readiness across databases or migrations.
export async function hasChainageColumns(db: Client, table: "Pipeline" | "Segment" | "Asset") {
  const required = table === "Pipeline" ? fields : table === "Segment" ? ["startChainageMeters", "endChainageMeters"] : ["chainageMeters"];
  const rows = await db.$queryRawUnsafe<Array<{ column_name: string }>>(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name = ANY($2::text[])", table, required);
  return rows.length === required.length;
}

export async function readChainageSettings(db: Client, id: string): Promise<ChainageSettings> {
  if (!await hasChainageColumns(db, "Pipeline")) return {};
  const [row] = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT ${fields.map(quote).join(",")} FROM public."Pipeline" WHERE id=$1`, id);
  if (!row) return {};
  for (const field of ["chainageOriginMeters", "chainageMatchToleranceMeters", "parentTieInChainageMeters"]) {
    if (row[field] != null) row[field] = Number(row[field]);
  }
  // Omit unknown values so existing clients can round-trip records unchanged.
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value != null)) as ChainageSettings;
}

export async function saveChainageSettings(db: Client, id: string, settings: ChainageSettings, ownerId?: string) {
  const keys = fields.filter(field => settings[field as keyof ChainageSettings] !== undefined);
  if (!keys.length) return;
  if (!await hasChainageColumns(db, "Pipeline")) throw createValidationError({ chainageDirection: "Chainage settings require the separately approved database migration." });
  const effective = { ...await readChainageSettings(db, id), ...settings };
  if ((effective.chainageOriginLatitude == null) !== (effective.chainageOriginLongitude == null)) throw createValidationError({ chainageOriginLatitude: "Latitude and longitude must be provided together." });
  if (effective.chainageOriginMeters != null && effective.chainageOriginMeters < 0 && effective.allowNegativeChainage !== true) throw createValidationError({ chainageOriginMeters: "Enable negative chainage before saving a negative origin." });
  if (effective.parentTieInChainageMeters != null && !effective.parentPipelineId) throw createValidationError({ parentPipelineId: "A parent pipeline is required for a tie-in." });
  if (effective.parentPipelineId) {
    const parents = await db.$queryRawUnsafe<Array<{ id: string; createdById: string | null }>>('SELECT id,"createdById" FROM public."Pipeline" WHERE id=$1', effective.parentPipelineId);
    if (!parents.length || (ownerId && parents[0].createdById !== ownerId)) throw createValidationError({ parentPipelineId: "Select an accessible parent pipeline." });
    const cycles = await db.$queryRawUnsafe<Array<{ id: string }>>('WITH RECURSIVE parents AS (SELECT id,"parentPipelineId" FROM public."Pipeline" WHERE id=$1 UNION SELECT p.id,p."parentPipelineId" FROM public."Pipeline" p JOIN parents a ON p.id=a."parentPipelineId") SELECT id FROM parents WHERE id=$2', effective.parentPipelineId, id);
    if (cycles.length) throw createValidationError({ parentPipelineId: "Pipeline branch relationships cannot contain cycles." });
  }
  const casts: Record<string, string> = { chainageDirection: '::public."ChainageDirection"', chainageBoundaryPolicy: '::public."ChainageBoundaryPolicy"', chainageCalibration: "::jsonb" };
  const values = keys.map(key => key === "chainageCalibration" && settings[key] != null ? JSON.stringify(settings[key]) : settings[key as keyof ChainageSettings]);
  await db.$queryRawUnsafe(`UPDATE public."Pipeline" SET ${keys.map((key, i) => `${quote(key)}=$${i + 2}${casts[key] || ""}`).join(",")} WHERE id=$1 RETURNING id`, id, ...values);
}

export async function saveNumericChainage(db: Client, table: "Segment" | "Asset", record: { id: string; kp?: string | null; startKp?: string | null; endKp?: string | null }) {
  if (!await hasChainageColumns(db, table)) return;
  const meters = (kp?: string | null) => kp?.trim() ? parseKp(kp).meters : null;
  if (table === "Segment") await db.$queryRawUnsafe('UPDATE public."Segment" SET "startChainageMeters"=$2::numeric,"endChainageMeters"=$3::numeric WHERE id=$1 RETURNING id', record.id, meters(record.startKp), meters(record.endKp));
  else await db.$queryRawUnsafe('UPDATE public."Asset" SET "chainageMeters"=$2::numeric WHERE id=$1 RETURNING id', record.id, meters(record.kp));
}
