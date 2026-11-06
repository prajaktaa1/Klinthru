import type { AssetInput } from "../types/domain";
type Client = { $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T> };
const fields = ["serialNumber", "condition", "description", "pressureRatingBar"] as const;
type Metadata = Pick<AssetInput, typeof fields[number]>;
export async function readAssetMetadata(db: Client, id: string): Promise<Metadata> {
  const rows = await db.$queryRawUnsafe<Array<{ data: Record<string, unknown> }>>('SELECT to_jsonb(a) AS data FROM public."Asset" a WHERE id=$1', id);
  return Object.fromEntries(fields.filter(key => rows[0]?.data[key] != null && rows[0].data[key] !== "").map(key => [key, rows[0].data[key]])) as Metadata;
}
export async function saveAssetMetadata(db: Client, id: string, input: Metadata) {
  const keys = fields.filter(key => input[key] !== undefined);
  if (!keys.length) return;
  // Identifiers come exclusively from the fixed whitelist; values are bound.
  await db.$queryRawUnsafe(`UPDATE public."Asset" SET ${keys.map((key, i) => `"${key}"=$${i+2}${key === "pressureRatingBar" ? "::double precision" : "::text"}`).join(",")} WHERE id=$1 RETURNING id`, id, ...keys.map(key => input[key] === "" ? null : input[key]));
}
