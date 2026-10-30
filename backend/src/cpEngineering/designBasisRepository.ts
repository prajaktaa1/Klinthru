import { getPrismaClient } from "../lib/prisma";
import { AuthUser } from "../types/domain";
import { BasisError, BasisRecord, BasisRevision } from "./designBasisDomain";

export interface BasisDb {
  $queryRawUnsafe<T = any[]>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
  $transaction<T>(fn: (db: BasisDb) => Promise<T>, options?: { isolationLevel?: string; timeout?: number }): Promise<T>;
}
export const contentTables = {
  evidence: "CpDesignBasisEvidence", assumptions: "CpDesignBasisAssumption", scope: "CpDesignBasisScope", standards: "CpDesignBasisStandard", criteriaBindings: "CpDesignBasisCriteriaBinding", checks: "CpDesignBasisCheck"
} as const;
export function database(): BasisDb {
  const db = getPrismaClient(); if (!db) throw new BasisError(503, "Design Basis storage unavailable; no memory or screenshot fallback.");
  return db as unknown as BasisDb;
}
export async function assertStorage(db: BasisDb) {
  const names = ["CpDesignBasis", "CpDesignBasisRevision", ...Object.values(contentTables), "CpDesignBasisEvent"];
  const rows = await db.$queryRawUnsafe<{ ready: boolean }[]>("SELECT bool_and(to_regclass(format('public.%I', name)) IS NOT NULL) AS ready FROM unnest($1::text[]) AS name", names);
  if (!rows[0]?.ready) throw new BasisError(503, "Design Basis schema is not installed. Migration integrity and backup verification remain deployment gates.");
}
export async function assertWriteGuards(db: BasisDb) {
  const tables = ["CpDesignBasis", "CpDesignBasisRevision", ...Object.values(contentTables)];
  const expected = [...tables.flatMap(table => [
    { table, trigger: `${table}_content_guard`, fn: "cp_basis_content_guard", type: 31 },
    { table, trigger: `${table}_content_audit`, fn: "cp_basis_content_audit", type: 29 },
    { table, trigger: `${table}_deny_truncate`, fn: "cp_basis_deny_truncate", type: 34 }
  ]), { table: "CpDesignBasisEvent", trigger: "CpDesignBasisEvent_append_guard", fn: "cp_basis_event_guard", type: 31 }, { table: "CpDesignBasisEvent", trigger: "CpDesignBasisEvent_deny_truncate", fn: "cp_basis_deny_truncate", type: 34 }];
  const rows = await db.$queryRawUnsafe<{ table: string; trigger: string; fn: string; type: number }[]>(`SELECT c.relname AS "table",t.tgname AS "trigger",p.proname AS "fn",t.tgtype::int AS "type" FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace pn ON pn.oid=p.pronamespace WHERE n.nspname='public' AND pn.nspname='public' AND t.tgname=ANY($1::text[]) AND t.tgenabled IN ('O','A') AND NOT t.tgisinternal`, expected.map(x => x.trigger));
  if (!expected.every(e => rows.some(r => r.table === e.table && r.trigger === e.trigger && r.fn === e.fn && r.type === e.type))) throw new BasisError(503, "Design Basis immutability/audit guards are not fully installed. Writes remain blocked.");
}
export async function authorizedBasis(db: BasisDb, user: AuthUser, basisId: string, lock = false) {
  const rows = await db.$queryRawUnsafe<any[]>(`SELECT b.* FROM public."CpDesignBasis" b JOIN public."Pipeline" p ON p.id=b."pipelineId" WHERE b.id=$1 AND ($2::boolean OR p."createdById"=$3) ${lock ? "FOR UPDATE OF b" : ""}`, basisId, user.role === "Admin", user.id);
  if (!rows[0]) throw new BasisError(404, "Design Basis not found or unavailable."); return rows[0];
}
export async function loadRecords(db: BasisDb, user: AuthUser, basisId?: string): Promise<BasisRecord[]> {
  const bases = await db.$queryRawUnsafe<any[]>(`SELECT b.*,p."pipelineCode",p."pipelineName" FROM public."CpDesignBasis" b JOIN public."Pipeline" p ON p.id=b."pipelineId" WHERE ($1::boolean OR p."createdById"=$2) AND ($3::text IS NULL OR b.id=$3)`, user.role === "Admin", user.id, basisId ?? null);
  if (!bases.length) return [];
  const ids = bases.map(b => b.id);
  const revisions = await db.$queryRawUnsafe<any[]>('SELECT r.* FROM public."CpDesignBasisRevision" r WHERE r."basisId"=ANY($1::text[]) ORDER BY r."createdAt",r.id', ids);
  const revisionIds = revisions.map(r => r.id);
  const children: Record<string, any[]> = {};
  for (const [key, table] of Object.entries(contentTables)) {
    children[key] = await db.$queryRawUnsafe<any[]>(`SELECT t.* ${key === "assumptions" ? ',t."numericValue"::text AS "numericValue",t."rangeMin"::text AS "rangeMin",t."rangeMax"::text AS "rangeMax"' : ""} FROM public."${table}" t WHERE t."revisionId"=ANY($1::text[]) ORDER BY t.id`, revisionIds);
  }
  const events = await db.$queryRawUnsafe<any[]>('SELECT e.*,u.name AS "actorName" FROM public."CpDesignBasisEvent" e JOIN public."User" u ON u.id=e."actorId" WHERE e."basisId"=ANY($1::text[]) ORDER BY e."occurredAt",e.id', ids);
  const json = (x: unknown) => JSON.parse(JSON.stringify(x));
  return json(bases.map(b => ({ ...b, revisions: revisions.filter(r => r.basisId === b.id).map(r => {
    const mapped: Record<string, unknown> = { ...r };
    for (const key of Object.keys(contentTables)) mapped[key] = children[key].filter(c => c.revisionId === r.id);
    mapped.sourceDocuments = mapped.evidence;
    return mapped as BasisRevision;
  }), events: events.filter(e => e.basisId === b.id) })));
}
export async function readSnapshot<T>(user: AuthUser, fn: (db: BasisDb, records: BasisRecord[]) => Promise<T>, basisId?: string): Promise<T> {
  return database().$transaction(async db => {
    await db.$executeRawUnsafe("SET TRANSACTION READ ONLY");
    await assertStorage(db);
    return fn(db, await loadRecords(db, user, basisId));
  }, { isolationLevel: "RepeatableRead", timeout: 20000 });
}
