import { createId } from "../lib/ids";
type Client = { $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T> };
export type MasterEntity = "Pipeline" | "Segment" | "Asset";
export async function auditStoreAvailable(db: Client) {
  const [row] = await db.$queryRawUnsafe<Array<{ available: boolean }>>("SELECT to_regclass('public.\"MasterChangeEvent\"') IS NOT NULL AS available");
  return row?.available === true;
}
export async function masterSnapshot(db: Client, entity: MasterEntity, id: string) {
  const [row] = await db.$queryRawUnsafe<Array<{ data: Record<string, unknown> }>>(`SELECT to_jsonb(t) AS data FROM public."${entity}" t WHERE id=$1`, id);
  return row?.data ?? null;
}
export async function recordMasterChange(db: Client, pipelineId: string, entity: MasterEntity, id: string, userId: string | undefined, before: Record<string, unknown> | null) {
  if (!userId || !await auditStoreAvailable(db)) return;
  const after = await masterSnapshot(db, entity, id);
  if (!after) return;
  const meaningful = (value: Record<string, unknown> | null) => value == null ? null : Object.fromEntries(Object.entries(value).filter(([key]) => !["updatedAt", "createdAt"].includes(key)).sort(([a], [b]) => a.localeCompare(b)));
  if (JSON.stringify(meaningful(before)) === JSON.stringify(meaningful(after))) return;
  await db.$queryRawUnsafe('INSERT INTO "MasterChangeEvent" (id,"pipelineId","objectType","objectId","userId",action,"beforeValues","afterValues") VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb) RETURNING id', createId("master-change"), pipelineId, entity, id, userId, before ? "Update" : "Create", before ? JSON.stringify(before) : null, JSON.stringify(after));
}
