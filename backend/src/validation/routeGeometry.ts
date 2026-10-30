import { z } from "zod";

const routeCoordinate = z.tuple([
  z.number().finite().min(-180).max(180),
  z.number().finite().min(-90).max(90)
]);

export const routeGeometrySchema = z.object({
  type: z.literal("LineString"),
  coordinates: z.array(routeCoordinate).min(3, "GIS Route Data Required: supply the surveyed alignment, including intermediate points; endpoints alone are insufficient")
}).strict().refine(route => route.coordinates.some(point => point[0] !== route.coordinates[0][0] || point[1] !== route.coordinates[0][1]), "Route must contain distinct GPS positions");

export type RouteGeometry = z.infer<typeof routeGeometrySchema>;
