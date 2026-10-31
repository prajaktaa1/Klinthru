/** Read-only audit. Never initializes storage, seeds, migrates or writes records. */
const fs = require('node:fs'), path = require('node:path');
require('dotenv').config({path: path.resolve(__dirname, '../../.env')});
require('tsx/cjs');
const { PrismaClient } = require('@prisma/client');
const { alignmentReadiness, parseKp, projectToAlignment } = require('../coreEngine/chainage/ChainageAgent.ts');
const { routeGeometrySchema } = require('./routeGeometry.ts');
const db = new PrismaClient();
// Broad screening envelope only: includes neighbouring territory and offshore areas.
// It is NOT an approved UAE boundary and cannot certify country membership.
const validGps = (lat, lon) => typeof lat === 'number' && typeof lon === 'number' && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
const uaeScreen = (lat, lon) => validGps(lat, lon) && lat >= 22 && lat <= 27 && lon >= 51 && lon <= 57;
async function main() {
  const {pipelines, documents} = await db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    return {
      pipelines: await tx.pipeline.findMany({orderBy:{pipelineCode:'asc'}, include:{segments:true, assets:true}}),
      documents: await tx.documentVersion.findMany({orderBy:{fileName:'asc'},select:{fileName:true,mimeType:true,approvalStatus:true,fileHash:true,document:{select:{title:true}}}})
    };
  });
  const results = pipelines.map(p => {
    const length = p.pipeLengthKm == null ? undefined : Number(p.pipeLengthKm);
    const readiness = alignmentReadiness(p.routeGeometry, length == null ? undefined : length * 1000);
    const issues = [];
    const requiredFiles = [`${p.pipelineCode}.alignment.geojson (or single-route .kml/.kmz), approved as-built WGS84 alignment with intermediate survey vertices`, `${p.pipelineCode}.chainage.csv: origin metres and GPS, physical datum, direction, KP control points and any chainage equations`, `${p.pipelineCode}.source-approval: operator/custodian, survey revision/date, CRS, source file SHA-256, permitted use and engineering acceptance against the unchanged ${length} km length`];
    // No source document/approval is stored in these records. Never award survey
    // certification merely because a line happens to match the configured length.
    issues.push('Approved survey source file and custodian acceptance not supplied for this audit');
    issues.push('Exact UAE/onshore/offshore coverage requires an approved boundary or route-corridor approval');
    if (!routeGeometrySchema.safeParse(p.routeGeometry).success) issues.push('GIS Route Data Required: missing, invalid or endpoint-only alignment');
    if (!readiness.ready) issues.push(readiness.reason);
    if (!length || !Number.isFinite(length)) issues.push('Positive pipeline distance (km) required');
    if (p.chainageOriginMeters == null) issues.push('Saved chainage origin required for KP positioning');
    if (!p.chainageDirection) issues.push('Approved chainage direction required');
    if (!p.chainageOriginReference) issues.push('Physical chainage datum/reference required');
    if (Array.isArray(p.routeGeometry?.coordinates) && p.routeGeometry.coordinates.some(point => !uaeScreen(point?.[1], point?.[0]))) issues.push('Route contains invalid GPS or vertices outside the broad UAE screening envelope');
    const origin = p.chainageOriginMeters == null ? null : Number(p.chainageOriginMeters);
    const checkKp = value => {
      if (value == null || value === '') return 'missing KP/chainage';
      try {
        const m = parseKp(value).meters;
        if (origin == null || !Number.isFinite(origin)) return 'KP extent validation blocked: saved origin required';
        if (length == null || !Number.isFinite(length) || length <= 0) return 'KP extent validation blocked: positive pipeline length required';
        if (m < origin || m > origin + length * 1000) return 'KP outside pipeline chainage range';
        return null;
      } catch { return 'invalid KP/chainage'; }
    };
    const segments = p.segments.map(s => {
      const segmentIssues = [];
      for (const [label,value] of [['From',s.startKp],['To',s.endKp]]) { const issue = checkKp(value); if (issue) segmentIssues.push(`${label}: ${issue}`); }
      let spanMeters = null, measuredMeters = null;
      try { spanMeters = parseKp(s.endKp).meters - parseKp(s.startKp).meters; if(spanMeters <= 0) segmentIssues.push('reversed/zero KP range'); } catch { segmentIssues.push('missing/invalid KP range'); }
      if (!routeGeometrySchema.safeParse(s.routeGeometry).success) segmentIssues.push('missing, invalid or endpoint-only segment route');
      else {
        const result = alignmentReadiness(s.routeGeometry, spanMeters ?? undefined); measuredMeters = result.length_m;
        if (!result.ready) segmentIssues.push(result.reason);
        if (s.routeGeometry.coordinates.some(point => !uaeScreen(point[1], point[0]))) segmentIssues.push('outside UAE screening envelope');
      }
      if (!s.routeGeometry) requiredFiles.push(`${p.pipelineCode}.${s.segmentId}.geojson (or .kml/.kmz): approved segment alignment and KP limits`);
      issues.push(...segmentIssues.map(issue => `${s.segmentId}: ${issue}`));
      return {segment:s.segmentId,startKp:s.startKp,endKp:s.endKp,spanMeters,measuredMeters,status:segmentIssues.length?'BLOCKED':'PASS',issues:segmentIssues};
    });
    const assets = p.assets.map(a => {
      const assetIssues = []; let projection = null;
      const kpIssue = checkKp(a.kp); if (kpIssue) assetIssues.push(kpIssue);
      if (!validGps(a.latitude,a.longitude)) { assetIssues.push('missing/invalid GPS'); requiredFiles.push(`${p.pipelineCode}.${a.assetId}.survey.csv: asset ID, latitude, longitude, KP and survey reference`); }
      else if (!uaeScreen(a.latitude,a.longitude)) assetIssues.push('outside UAE screening envelope');
      const usable = routeGeometrySchema.safeParse(p.routeGeometry).success && readiness.ready && p.chainageOriginMeters != null && length > 0;
      if (usable && !assetIssues.length) {
        try {
          const projected = projectToAlignment(p.routeGeometry,[a.longitude,a.latitude],origin);
          projection = {approximate:true,offsetMeters:projected.offset_m,kpDeltaMeters:Math.abs(projected.meters-parseKp(a.kp).meters)};
          const tolerance = p.chainageMatchToleranceMeters == null ? null : Number(p.chainageMatchToleranceMeters);
          if (tolerance == null || !Number.isFinite(tolerance) || tolerance < 0) assetIssues.push('approved asset/KP match tolerance required');
          else if (projection.offsetMeters > tolerance || projection.kpDeltaMeters > tolerance) assetIssues.push('saved GPS/KP differs from alignment beyond configured tolerance');
        } catch { assetIssues.push('GPS/KP projection failed'); }
      } else assetIssues.push('GPS/KP projection blocked until alignment and datum are usable');
      issues.push(...assetIssues.map(issue => `${a.assetId}: ${issue}`));
      return {asset:a.assetId,kp:a.kp,gpsSaved:validGps(a.latitude,a.longitude),uaeEnvelopeScreen:uaeScreen(a.latitude,a.longitude)?'PASS':'BLOCKED',projection,status:assetIssues.length?'BLOCKED':'PASS',issues:assetIssues};
    });
    return {pipeline:p.pipelineCode,name:p.pipelineName,status:issues.length?'BLOCKED':'PASS',configuredKm:length,alignmentKm:readiness.length_m == null ? null : readiness.length_m/1000,distanceDifferenceKm:readiness.length_m == null || length == null ? null : readiness.length_m/1000-length,routePoints:p.routeGeometry?.coordinates?.length ?? 0,segments,assets,issues,requiredFiles,sourceVerification:'BLOCKED: survey provenance and UAE coverage approval absent; coordinate and length checks cannot certify an underground route.'};
  });
  const sourceInventory = {documentVersionsChecked:documents.length,candidates:documents.filter(d => /\.(geojson|kml|kmz|json|csv)$|\bgis\b|alignment|survey/i.test(d.fileName+' '+d.document.title)),note:'Document metadata only; candidate filenames or internal approval status do not establish operator survey provenance.'};
  const report={readOnly:true,checkedAt:new Date().toISOString(),sourceInventory,distanceMethod:'Sum of spherical geodesic legs using shared ChainageAgent; not a surveyed 3D pipe length. Existing length tolerance: max(5 m, 1%). No rescaling.',uaeValidation:'Broad envelope 22–27 N, 51–57 E is screening only; exact UAE jurisdiction and permitted offshore/cross-border coverage BLOCKED pending approved boundary/corridor.',results};
  const out=path.resolve(__dirname,'../../../artifacts/uae-gis-integration');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'pipeline-audit.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
