ALTER TABLE "Pipeline" ADD COLUMN "routeGeometry" JSONB;
ALTER TABLE "Segment" ADD COLUMN "routeGeometry" JSONB;

ALTER TABLE "Pipeline"
  ADD CONSTRAINT "Pipeline_routeGeometry_linestring_check"
  CHECK ("routeGeometry" IS NULL OR ("routeGeometry"->>'type' = 'LineString' AND jsonb_typeof("routeGeometry"->'coordinates') = 'array' AND jsonb_array_length("routeGeometry"->'coordinates') >= 2));

ALTER TABLE "Segment"
  ADD CONSTRAINT "Segment_routeGeometry_linestring_check"
  CHECK ("routeGeometry" IS NULL OR ("routeGeometry"->>'type' = 'LineString' AND jsonb_typeof("routeGeometry"->'coordinates') = 'array' AND jsonb_array_length("routeGeometry"->'coordinates') >= 2));
