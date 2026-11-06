import { savedMapEndpoints, savedMapRoute } from "./dashboard-map-data";
import type { PipelineRecord } from "./types";

export const PIPELINE_BLUE = "#0088ff";
export const PROPOSED_ROUTE_ORANGE = "#f97316";
export function pipelineOverlayLabel(pipeline: PipelineRecord | null | undefined) {
  return savedMapRoute(pipeline?.routeGeometry, pipeline?.pipeLengthKm ?? NaN) ? "Saved Pipeline Route" : "Incomplete Route";
}

// An incomplete alignment exposes saved endpoints without inventing a connecting route.
export function drawSavedPipelineOverlay(L: any, map: any, pipeline: PipelineRecord | null | undefined, add = (layer: any) => layer.addTo(map)) {
  const points = savedMapEndpoints(pipeline?.routeGeometry);
  if (!points) return [];
  const text = (value: string) => { const node = document.createElement("span"); node.textContent = value; return node; };
  const status = pipelineOverlayLabel(pipeline);
  const complete = status === "Saved Pipeline Route";
  if (complete) {
    add(L.polyline(points, { color: "#ffffff", weight: 9, opacity: 0.9, interactive: false }));
    const line = add(L.polyline(points, { color: PIPELINE_BLUE, weight: 5, opacity: 1, className: "saved-pipeline-overlay" }));
    line.bindTooltip(text(`${pipeline?.pipelineCode} / ${status}`));
    line.getElement()?.setAttribute("aria-label", `${pipeline?.pipelineCode} ${status}`);
  }
  [points[0], points[points.length - 1]].forEach((point, index) => {
    add(L.circleMarker(point, { radius: 6, color: PIPELINE_BLUE, weight: 3, fillColor: "#ffffff", fillOpacity: 1, className: "saved-pipeline-endpoint" }))
      .bindTooltip(text(`Saved ${index ? "end" : "start"}${complete ? "" : " / Incomplete Route"}`));
  });
  return complete ? points : [points[0], points[points.length - 1]];
}

// Proposed routes are intentionally display-only. They may use two vertices,
// but never inherit survey/chainage status from the verified alignment.
export function drawProposedPipelineOverlay(L: any, map: any, geometry: unknown, add = (layer: any) => layer.addTo(map)) {
  const points = savedMapEndpoints(geometry);
  if (!points) return [];
  const text = (value: string) => { const node = document.createElement("span"); node.textContent = value; return node; };
  const line = add(L.polyline(points, { color: PROPOSED_ROUTE_ORANGE, weight: 5, opacity: 0.95, dashArray: "7 5", className: "proposed-pipeline-overlay" }));
  line.bindTooltip(text("PROPOSED — NOT SURVEYED"));
  line.getElement?.()?.setAttribute("aria-label", "Proposed route — not surveyed");
  return points;
}
