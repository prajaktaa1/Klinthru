import type { AssetMasterAssetRecord, AssetMasterSegmentRecord, GeoJsonLineString, PipelineRecord } from "@/lib/types";

export const CLIENT_DEMO_PIPELINE_CODE = "PL-001";
export const CLIENT_DEMO_ROUTE_LABEL = "ILLUSTRATIVE — NOT SURVEYED";

// Cartographic-only CLIENT DEMO fixture. These vertices are deliberately not
// persisted, exported, used for chainage calculations, or treated as survey data.
const routeCoordinates: [number, number][] = [
  [52.7382345, 24.1457581], [52.95, 24.13], [53.18, 24.09], [53.40, 24.00],
  [53.62, 23.93], [53.86, 23.88], [53.971292593, 23.861451234],
  [54.10, 23.84], [54.34, 23.80], [54.543324373, 23.774584453],
  [54.58, 23.77], [54.82, 23.74], [55.12, 23.72]
];

const geometry = (coordinates: [number, number][]): GeoJsonLineString => ({ type: "LineString", coordinates });
const demoRoute = geometry(routeCoordinates);

export type ClientDemoSegmentRoute = {
  segmentId: string;
  startKp: string;
  endKp: string;
  routeGeometry: GeoJsonLineString;
};

export const CLIENT_DEMO_ROUTE: GeoJsonLineString = demoRoute;
export const CLIENT_DEMO_SEGMENT_ROUTES: ClientDemoSegmentRoute[] = [
  { segmentId: "SEG-01", startKp: "0", endKp: "130", routeGeometry: geometry(routeCoordinates.slice(0, 7)) },
  { segmentId: "TEST-SEG-102", startKp: "130", endKp: "189", routeGeometry: geometry(routeCoordinates.slice(6, 10)) },
  { segmentId: "TEST-SEG-103", startKp: "189", endKp: "248", routeGeometry: geometry(routeCoordinates.slice(9)) }
];

export const CLIENT_DEMO_KP_MARKERS = [
  { kp: "0", coordinate: routeCoordinates[0] },
  { kp: "130", coordinate: routeCoordinates[6] },
  { kp: "189", coordinate: routeCoordinates[9] },
  { kp: "248", coordinate: routeCoordinates[routeCoordinates.length - 1] }
] as const;

export function isClientDemoPipeline(pipeline?: Pick<PipelineRecord, "pipelineCode"> | null) {
  return pipeline?.pipelineCode === CLIENT_DEMO_PIPELINE_CODE;
}

export function clientDemoRouteFor(pipeline?: Pick<PipelineRecord, "pipelineCode"> | null) {
  return isClientDemoPipeline(pipeline) ? CLIENT_DEMO_ROUTE : null;
}

export function clientDemoSegmentsFor(pipeline?: Pick<PipelineRecord, "pipelineCode"> | null, segments: AssetMasterSegmentRecord[] = []) {
  if (!isClientDemoPipeline(pipeline)) return [];
  return CLIENT_DEMO_SEGMENT_ROUTES.map((demo) => ({
    ...(segments.find((segment) => segment.segmentId === demo.segmentId) ?? { id: `demo-${demo.segmentId}`, pipelineId: "demo", segmentId: demo.segmentId }),
    startKp: demo.startKp,
    endKp: demo.endKp,
    routeGeometry: demo.routeGeometry
  }));
}

export function clientDemoAssetsFor(pipeline: PipelineRecord | null, assets: AssetMasterAssetRecord[]) {
  return isClientDemoPipeline(pipeline) ? assets.filter((asset) => asset.pipelineId === pipeline?.id) : [];
}
