import { savedMapEndpoints, savedMapRoute } from "./dashboard-map-data";
import type { PipelineRecord } from "./types";

export const PIPELINE_BLUE = "#0088ff";
export function pipelineOverlayLabel(pipeline: PipelineRecord | null | undefined) {
  return savedMapRoute(pipeline?.routeGeometry, pipeline?.pipeLengthKm ?? NaN) ? "Saved Pipeline Route" : "Incomplete Route";
}

// Display the original vertices only. This never enables chainage interpolation.
export function drawSavedPipelineOverlay(L: any, map: any, pipeline: PipelineRecord | null | undefined, add = (layer: any) => layer.addTo(map)) {
  const points = savedMapEndpoints(pipeline?.routeGeometry);
  if (!points) return [];
  const text = (value: string) => { const node = document.createElement("span"); node.textContent = value; return node; };
  const status = pipelineOverlayLabel(pipeline);
  add(L.polyline(points, { color: "#ffffff", weight: 9, opacity: 0.9, interactive: false }));
  const line = add(L.polyline(points, { color: PIPELINE_BLUE, weight: 5, opacity: 1, className: "saved-pipeline-overlay" }));
  line.bindTooltip(text(`${pipeline?.pipelineCode} · ${status}`));
  const element = line.getElement();
  element?.setAttribute("aria-label", `${pipeline?.pipelineCode} ${status}`);
  [points[0], points[points.length - 1]].forEach((point, index) => {
    add(L.circleMarker(point, { radius: 6, color: PIPELINE_BLUE, weight: 3, fillColor: "#ffffff", fillOpacity: 1, className: "saved-pipeline-endpoint" }))
      .bindTooltip(text(`Saved ${index ? "end" : "start"}`), { permanent: true, direction: index ? "left" : "right", offset: [index ? -8 : 8, 0] });
  });
  return points;
}
