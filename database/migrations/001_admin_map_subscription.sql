-- Wayku Runner · migración 001
-- Núcleo administrativo, mapa y membresía.
-- Requiere PostgreSQL 16+ con PostGIS.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE SCHEMA IF NOT EXISTS app;

CREATE TYPE app.publish_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE app.team_role AS ENUM ('leader', 'co_leader', 'member');
CREATE TYPE app.subscription_status AS ENUM ('active', 'payment_failed', 'cancelled', 'paused');
CREATE TYPE app.event_type AS ENUM ('race', 'training', 'expedition', 'community');

CREATE OR REPLACE FUNCTION app.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Identidad y permisos del Backoffice.
-- auth_subject puede mapear al UUID del proveedor de autenticación elegido.
CREATE TABLE app.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_subject uuid UNIQUE,
  email text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'blocked', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.runner_profiles (
  user_id uuid PRIMARY KEY REFERENCES app.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_url text,
  city text NOT NULL DEFAULT 'Quito',
  profile_visibility text NOT NULL DEFAULT 'community'
    CHECK (profile_visibility IN ('private', 'community', 'public')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Consentimientos visibles desde el perfil administrativo.
-- Un consentimiento se revoca creando una fecha de revocación; no se sobrescribe evidencia.
CREATE TABLE app.consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN (
    'location_tracking',
    'health_import',
    'marketing',
    'community_discoverability'
  )),
  policy_version text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  source text NOT NULL DEFAULT 'mobile_app',
  CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
);

CREATE INDEX ix_consent_records_user_purpose
  ON app.consent_records (user_id, purpose, granted_at DESC);

-- Soporte y moderación cambian el estado, pero nunca eliminan una cuenta físicamente.
CREATE TABLE app.user_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app.users(id) ON DELETE RESTRICT,
  from_status text,
  to_status text NOT NULL CHECK (to_status IN ('active', 'blocked', 'deleted')),
  reason text NOT NULL,
  changed_by uuid REFERENCES app.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.user_admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  note_type text NOT NULL CHECK (note_type IN ('support', 'moderation', 'billing')),
  note text NOT NULL,
  created_by uuid REFERENCES app.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_user_admin_notes_user
  ON app.user_admin_notes (user_id, created_at DESC);

CREATE TABLE app.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text
);

CREATE TABLE app.user_roles (
  user_id uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES app.roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES app.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE app.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES app.users(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_admin_audit_logs_entity
  ON app.admin_audit_logs (entity_type, entity_id, created_at DESC);

-- Temporadas y semanas: los administradores abren y cierran el juego.
CREATE TABLE app.seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status app.publish_status NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES app.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE app.competition_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES app.seasons(id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status app.publish_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  UNIQUE (season_id, starts_at)
);

-- Zona es la arena reconocible para el usuario.
-- Versionar el polígono evita cambiar resultados históricos cuando operaciones ajusta el mapa.
CREATE TABLE app.territory_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  status app.publish_status NOT NULL DEFAULT 'draft',
  current_published_version_id uuid,
  created_by uuid REFERENCES app.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.territory_zone_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES app.territory_zones(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  boundary geometry(MultiPolygon, 4326) NOT NULL,
  status app.publish_status NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_by uuid REFERENCES app.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ST_IsValid(boundary)),
  UNIQUE (zone_id, version_number)
);

ALTER TABLE app.territory_zones
  ADD CONSTRAINT fk_territory_zones_published_version
  FOREIGN KEY (current_published_version_id)
  REFERENCES app.territory_zone_versions(id)
  ON DELETE SET NULL;

CREATE INDEX ix_zone_versions_boundary
  ON app.territory_zone_versions
  USING gist (boundary);

-- Ruta oficial: una zona puede tener rutas por nivel y distancia.
CREATE TABLE app.official_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES app.territory_zones(id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text,
  path geography(LineString, 4326) NOT NULL,
  distance_meters integer NOT NULL CHECK (distance_meters >= 200),
  min_level_code text NOT NULL DEFAULT 'inicio',
  corridor_tolerance_meters integer NOT NULL DEFAULT 25
    CHECK (corridor_tolerance_meters BETWEEN 5 AND 100),
  status app.publish_status NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES app.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_official_routes_path
  ON app.official_routes
  USING gist (path);

CREATE TABLE app.territory_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_zone_id uuid NOT NULL REFERENCES app.territory_zones(id) ON DELETE RESTRICT,
  to_zone_id uuid NOT NULL REFERENCES app.territory_zones(id) ON DELETE RESTRICT,
  route_id uuid NOT NULL REFERENCES app.official_routes(id) ON DELETE RESTRICT,
  xp_reward integer NOT NULL CHECK (xp_reward >= 0),
  circuit_points integer NOT NULL DEFAULT 0 CHECK (circuit_points >= 0),
  status app.publish_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (from_zone_id <> to_zone_id),
  UNIQUE (from_zone_id, to_zone_id, route_id)
);

-- Gestión de eventos y sus inscripciones.
CREATE TABLE app.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid REFERENCES app.seasons(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  event_type app.event_type NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  capacity integer CHECK (capacity IS NULL OR capacity > 0),
  public_price numeric(10,2) CHECK (public_price IS NULL OR public_price >= 0),
  member_discount_percent numeric(5,2) NOT NULL DEFAULT 0
    CHECK (member_discount_percent BETWEEN 0 AND 100),
  status app.publish_status NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES app.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  CHECK (
    registration_opens_at IS NULL
    OR registration_closes_at IS NULL
    OR registration_closes_at > registration_opens_at
  )
);

CREATE TABLE app.event_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES app.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  distance_meters integer CHECK (distance_meters IS NULL OR distance_meters > 0),
  capacity integer CHECK (capacity IS NULL OR capacity > 0),
  price numeric(10,2) CHECK (price IS NULL OR price >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, name)
);

-- Suscripciones y regla de degradación competitiva.
CREATE TABLE app.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  currency char(3) NOT NULL DEFAULT 'USD',
  billing_period text NOT NULL CHECK (billing_period IN ('monthly', 'quarterly', 'annual')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app.users(id) ON DELETE RESTRICT,
  plan_id uuid NOT NULL REFERENCES app.subscription_plans(id) ON DELETE RESTRICT,
  provider text NOT NULL,
  provider_reference text,
  status app.subscription_status NOT NULL DEFAULT 'active',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  grace_ends_at timestamptz NOT NULL,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  CHECK (grace_ends_at >= ends_at),
  UNIQUE (provider, provider_reference)
);

CREATE INDEX ix_subscriptions_user_period
  ON app.subscriptions (user_id, ends_at DESC);

CREATE TABLE app.subscription_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES app.subscriptions(id) ON DELETE CASCADE,
  from_status app.subscription_status,
  to_status app.subscription_status NOT NULL,
  reason text NOT NULL,
  effective_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid REFERENCES app.users(id) ON DELETE SET NULL
);

-- Vista consumida por el backend. Define la elegibilidad, no borra XP ni historial.
CREATE OR REPLACE VIEW app.current_competitive_membership AS
SELECT
  u.id AS user_id,
  s.id AS subscription_id,
  CASE
    WHEN s.id IS NULL THEN 'community'
    WHEN s.status = 'active' AND now() < s.ends_at THEN 'active'
    WHEN now() < s.grace_ends_at THEN 'grace'
    WHEN now() < s.ends_at + interval '30 days' THEN 'suspended'
    ELSE 'community'
  END AS membership_state,
  CASE
    WHEN s.status = 'active' AND now() < s.ends_at THEN true
    WHEN now() < s.grace_ends_at THEN true
    ELSE false
  END AS eligible_for_group_competition,
  CASE
    WHEN s.status = 'active' AND now() < s.ends_at THEN true
    WHEN now() < s.grace_ends_at THEN true
    ELSE false
  END AS eligible_for_member_benefits
FROM app.users u
LEFT JOIN LATERAL (
  SELECT *
  FROM app.subscriptions candidate
  WHERE candidate.user_id = u.id
  ORDER BY candidate.ends_at DESC
  LIMIT 1
) s ON true;

-- Fuente única para la pantalla “Usuarios” del Backoffice.
CREATE OR REPLACE VIEW app.admin_user_directory AS
SELECT
  u.id,
  u.email,
  u.status AS account_status,
  p.display_name,
  p.city,
  p.profile_visibility,
  membership.membership_state,
  membership.eligible_for_group_competition,
  u.created_at,
  u.updated_at
FROM app.users u
LEFT JOIN app.runner_profiles p ON p.user_id = u.id
LEFT JOIN app.current_competitive_membership membership ON membership.user_id = u.id;

-- Semillas de roles; los permisos finos se agregan en la siguiente migración.
INSERT INTO app.roles (code, name, description)
VALUES
  ('superadmin', 'Superadministrador', 'Acceso completo al Backoffice.'),
  ('operations', 'Operaciones', 'Gestiona zonas, rutas y temporadas.'),
  ('events', 'Eventos', 'Gestiona carreras, cupos e inscripciones.'),
  ('community', 'Comunidad', 'Modera equipos y actividades.'),
  ('marketing', 'Marketing', 'Gestiona campañas con consentimiento.')
ON CONFLICT (code) DO NOTHING;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON app.users
FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE TRIGGER trg_runner_profiles_updated_at
BEFORE UPDATE ON app.runner_profiles
FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE TRIGGER trg_seasons_updated_at
BEFORE UPDATE ON app.seasons
FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE TRIGGER trg_competition_weeks_updated_at
BEFORE UPDATE ON app.competition_weeks
FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE TRIGGER trg_territory_zones_updated_at
BEFORE UPDATE ON app.territory_zones
FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE TRIGGER trg_official_routes_updated_at
BEFORE UPDATE ON app.official_routes
FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE TRIGGER trg_events_updated_at
BEFORE UPDATE ON app.events
FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE TRIGGER trg_subscription_plans_updated_at
BEFORE UPDATE ON app.subscription_plans
FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE TRIGGER trg_subscriptions_updated_at
BEFORE UPDATE ON app.subscriptions
FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

COMMIT;
