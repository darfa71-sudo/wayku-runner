-- Wayku Runner · migración 004
-- Compatibilidad del editor territorial: el backend usa estados textuales.

BEGIN;

ALTER TABLE app.territory_zones ALTER COLUMN status DROP DEFAULT;
ALTER TABLE app.territory_zone_versions ALTER COLUMN status DROP DEFAULT;

ALTER TABLE app.territory_zones ALTER COLUMN status TYPE text USING status::text;
ALTER TABLE app.territory_zone_versions ALTER COLUMN status TYPE text USING status::text;

ALTER TABLE app.territory_zones ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE app.territory_zone_versions ALTER COLUMN status SET DEFAULT 'draft';

ALTER TABLE app.territory_zones
  ADD CONSTRAINT ck_territory_zones_status_text
  CHECK (status IN ('draft', 'published', 'archived'));

ALTER TABLE app.territory_zone_versions
  ADD CONSTRAINT ck_territory_zone_versions_status_text
  CHECK (status IN ('draft', 'published', 'archived'));

COMMIT;
