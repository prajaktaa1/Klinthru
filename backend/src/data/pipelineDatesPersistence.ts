/** Keep optional date storage compatible with the existing generated Prisma client. */
type DateClient = {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
};
export async function readCommissioningDate(db: DateClient, id: string): Promise<{ commissioningDate?: string }> {
  // to_jsonb also supports databases where the additive column is not installed.
  const rows = await db.$queryRawUnsafe<Array<{ value: string | null }>>(
    `SELECT to_jsonb(p)->>'commissioningDate' AS value FROM public."Pipeline" p WHERE id=$1`, id);
  return rows[0]?.value ? { commissioningDate: rows[0].value.slice(0, 10) } : {};
}
export async function saveCommissioningDate(db: DateClient, id: string, value: string | null | undefined) {
  if (value === undefined) return; // Older clients must preserve the saved date.
  await db.$queryRawUnsafe(
    'UPDATE public."Pipeline" SET "commissioningDate"=$2::timestamp WHERE id=$1 RETURNING id', id, value);
}
