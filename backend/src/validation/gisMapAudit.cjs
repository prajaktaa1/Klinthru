/** Read-only audit. Never initializes storage, seeds, migrates or writes records. */
const fs = require('node:fs'), path = require('node:path');
require('dotenv').config({path: path.resolve(__dirname, '../../.env')});
require('tsx/cjs');
const { PrismaClient } = require('@prisma/client');
const { alignmentReadiness, parseKp } = require('../coreEngine/chainage/ChainageAgent.ts');
const { routeGeometrySchema } = require('./routeGeometry.ts');
const db = new PrismaClient();
async function main() {
  const pipelines = await db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    return tx.pipeline.findMany({orderBy:{pipelineCode:'asc'}, include:{segments:true, assets:true}});
  });
  const results = pipelines.map(p => {
    const length = p.pipeLengthKm == null ? undefined : Number(p.pipeLengthKm);
    const readiness = alignmentReadiness(p.routeGeometry, length == null ? undefined : length * 1000);
    const issues = [];
    if (!routeGeometrySchema.safeParse(p.routeGeometry).success) issues.push('GIS Route Data Required: missing, invalid or endpoint-only alignment');
    if (!readiness.ready) issues.push(readiness.reason);
    if (!length || !Number.isFinite(length)) issues.push('Positive pipeline distance (km) required');
    if (p.chainageOriginMeters == null) issues.push('Saved chainage origin required for KP positioning');
    const origin = p.chainageOriginMeters == null ? 0 : Number(p.chainageOriginMeters);
    const checkKp = (value, label) => { if (!value) return; try { const m = parseKp(value).meters; if (length != null && (m < origin || m > origin + length * 1000)) issues.push(label + ': KP outside pipeline chainage range'); } catch { issues.push(label + ': invalid KP/chainage'); } };
    for (const s of p.segments) {
      checkKp(s.startKp,s.segmentId); checkKp(s.endKp,s.segmentId);
      if (s.startKp && s.endKp) { try { if(parseKp(s.endKp).meters <= parseKp(s.startKp).meters) issues.push(s.segmentId+': reversed/zero KP range'); } catch {} }
      if (s.routeGeometry && !routeGeometrySchema.safeParse(s.routeGeometry).success) issues.push(s.segmentId+': invalid or endpoint-only segment route');
    }
    for (const a of p.assets) { checkKp(a.kp,a.assetId); if(a.latitude != null || a.longitude != null) { if(a.latitude == null || a.longitude == null || !Number.isFinite(a.latitude) || !Number.isFinite(a.longitude) || Math.abs(a.latitude)>90 || Math.abs(a.longitude)>180) issues.push(a.assetId+': invalid GPS'); } }
    return {pipeline:p.pipelineCode,name:p.pipelineName,status:issues.length?'BLOCKED':'PASS',configuredKm:length,alignmentKm:readiness.length_m == null ? null : readiness.length_m/1000,routePoints:p.routeGeometry?.coordinates?.length ?? 0,issues,sourceVerification:'Survey provenance must be established from authoritative GIS records; coordinate validation alone is insufficient.'};
  });
  const report={readOnly:true,checkedAt:new Date().toISOString(),results};
  const out=path.resolve(__dirname,'../../../artifacts/gis-map-fix');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'pipeline-audit.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
