-- Wayku Runner & Hub · migración 002
-- Ecosistema unificado: Centro Físico (Wayku Hub), Merchandising (Wayku Store) y Checkout Unificado.

BEGIN;

CREATE TYPE app.service_type AS ENUM (
  'physiotherapy',
  'nutrition',
  'biomechanics',
  'functional_training',
  'recovery'
);

CREATE TYPE app.appointment_status AS ENUM (
  'scheduled',
  'confirmed',
  'attended',
  'cancelled',
  'no_show'
);

CREATE TYPE app.order_status AS ENUM (
  'pending',
  'paid',
  'ready_for_pickup',
  'fulfilled',
  'cancelled',
  'refunded'
);

CREATE TYPE app.order_item_type AS ENUM (
  'merch',
  'event_registration',
  'hub_service',
  'reward_redemption'
);

CREATE TYPE app.payment_method AS ENUM (
  'credit_card',
  'debit_card',
  'transfer',
  'cash',
  'qr_pay'
);

CREATE TYPE app.payment_status AS ENUM (
  'pending',
  'approved',
  'declined',
  'refunded'
);

-- ============================================================================
-- 1. WAYKU HUB: CENTRO FÍSICO Y SALUD
-- ============================================================================

CREATE TABLE app.hub_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  service_type app.service_type NOT NULL,
  description text,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  member_discount_percent numeric(5,2) NOT NULL DEFAULT 0
    CHECK (member_discount_percent BETWEEN 0 AND 100),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.hub_specialists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  specialty app.service_type NOT NULL,
  license_number text,
  bio text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.hub_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  specialist_id uuid NOT NULL REFERENCES app.hub_specialists(id) ON DELETE RESTRICT,
  service_id uuid NOT NULL REFERENCES app.hub_services(id) ON DELETE RESTRICT,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  status app.appointment_status NOT NULL DEFAULT 'scheduled',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_hub_appointments_user_date
  ON app.hub_appointments (user_id, scheduled_at DESC);

CREATE INDEX ix_hub_appointments_specialist_date
  ON app.hub_appointments (specialist_id, scheduled_at);

-- Ficha clínica y de evaluación: estrictamente privada para el equipo de salud
CREATE TABLE app.clinical_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid UNIQUE REFERENCES app.hub_appointments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  specialist_id uuid NOT NULL REFERENCES app.hub_specialists(id) ON DELETE RESTRICT,
  evaluation_type text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  private_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_clinical_evaluations_user
  ON app.clinical_evaluations (user_id, created_at DESC);

-- ============================================================================
-- 2. WAYKU STORE: MERCHANDISING E INDUMENTARIA
-- ============================================================================

CREATE TABLE app.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  description text,
  base_price numeric(10,2) NOT NULL CHECK (base_price >= 0),
  member_discount_percent numeric(5,2) NOT NULL DEFAULT 0
    CHECK (member_discount_percent BETWEEN 0 AND 100),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES app.products(id) ON DELETE CASCADE,
  sku text NOT NULL UNIQUE,
  size text NOT NULL DEFAULT 'UNICA',
  color text NOT NULL DEFAULT 'Oficial',
  additional_price numeric(10,2) NOT NULL DEFAULT 0 CHECK (additional_price >= 0),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (product_id, size, color)
);

CREATE TABLE app.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES app.product_variants(id) ON DELETE CASCADE,
  location text NOT NULL DEFAULT 'sede_norte_quito',
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  reserved_quantity integer NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (variant_id, location)
);

-- ============================================================================
-- 3. CHECKOUT UNIFICADO Y PAGOS
-- ============================================================================

CREATE TABLE app.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app.users(id) ON DELETE RESTRICT,
  event_id uuid REFERENCES app.events(id) ON DELETE SET NULL,
  status app.order_status NOT NULL DEFAULT 'pending',
  total_amount numeric(10,2) NOT NULL CHECK (total_amount >= 0),
  discount_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  net_amount numeric(10,2) NOT NULL CHECK (net_amount >= 0),
  pickup_method text NOT NULL DEFAULT 'hub_pickup'
    CHECK (pickup_method IN ('hub_pickup', 'home_delivery')),
  qr_claim_code text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES app.orders(id) ON DELETE CASCADE,
  item_type app.order_item_type NOT NULL,
  reference_id uuid,
  variant_id uuid REFERENCES app.product_variants(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  subtotal numeric(10,2) NOT NULL CHECK (subtotal >= 0)
);

CREATE TABLE app.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES app.orders(id) ON DELETE CASCADE,
  payment_method app.payment_method NOT NULL,
  provider text NOT NULL DEFAULT 'local',
  provider_transaction_id text,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  status app.payment_status NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 4. VISTAS OPERATIVAS
-- ============================================================================

-- Catálogo de la tienda con variantes y stock consolidado
CREATE OR REPLACE VIEW app.store_catalog AS
SELECT
  p.id AS product_id,
  p.code,
  p.name,
  p.category,
  p.base_price,
  p.member_discount_percent,
  pv.id AS variant_id,
  pv.sku,
  pv.size,
  pv.color,
  (p.base_price + pv.additional_price) AS final_price,
  COALESCE(inv.stock_quantity, 0) AS stock_available
FROM app.products p
JOIN app.product_variants pv ON pv.product_id = p.id AND pv.is_active = true
LEFT JOIN app.inventory inv ON inv.variant_id = pv.id
WHERE p.is_active = true;

-- Agenda del centro físico con estado y datos del atleta
CREATE OR REPLACE VIEW app.hub_agenda AS
SELECT
  a.id AS appointment_id,
  a.scheduled_at,
  a.duration_minutes,
  a.status,
  s.name AS service_name,
  s.service_type,
  u.id AS user_id,
  u.email,
  p.display_name AS athlete_name,
  sp.specialty AS specialist_specialty,
  a.created_at
FROM app.hub_appointments a
JOIN app.hub_services s ON s.id = a.service_id
JOIN app.users u ON u.id = a.user_id
LEFT JOIN app.runner_profiles p ON p.user_id = u.id
JOIN app.hub_specialists sp ON sp.id = a.specialist_id;

-- ============================================================================
-- 5. SEMILLAS (DATOS INICIALES)
-- ============================================================================

INSERT INTO app.hub_services (code, name, service_type, description, duration_minutes, price, member_discount_percent)
VALUES
  ('bio-pisada', 'Valoración Biomecánica y de Pisada', 'biomechanics', 'Análisis de marcha computarizado en banda y corrección técnica.', 45, 35.00, 20.00),
  ('fisio-descarga', 'Fisioterapia y Descarga Muscular', 'physiotherapy', 'Terapia manual, botas de compresión y liberación miofascial.', 60, 40.00, 25.00),
  ('nutri-runner', 'Asesoría Nutricional para Runners', 'nutrition', 'Plan de hidratación, carga de carbohidratos y nutrición deportiva.', 45, 30.00, 15.00)
ON CONFLICT (code) DO NOTHING;

INSERT INTO app.products (code, name, category, description, base_price, member_discount_percent)
VALUES
  ('cam-wayku-pro', 'Camiseta Oficial Wayku Runner Pro', 'indumentaria', 'Tela técnica microperforada de secado rápido, reflectivos 360°.', 28.00, 15.00),
  ('gorra-wayku-race', 'Gorra Técnica Transpirable', 'accesorios', 'Protección solar UV50+ con ventilación lateral y ajuste elástico.', 18.00, 10.00),
  ('termo-wayku-soft', 'Soft Flask Ergonómico 500ml', 'hidratacion', 'Botella flexible anti-rebote libre de BPA para cinturón o chaleco.', 14.00, 10.00)
ON CONFLICT (code) DO NOTHING;

-- Variantes para la camiseta
DO $$
DECLARE
  prod_id uuid;
BEGIN
  SELECT id INTO prod_id FROM app.products WHERE code = 'cam-wayku-pro';
  IF prod_id IS NOT NULL THEN
    INSERT INTO app.product_variants (product_id, sku, size, color)
    VALUES
      (prod_id, 'CAM-PRO-S', 'S', 'Negro/Neón'),
      (prod_id, 'CAM-PRO-M', 'M', 'Negro/Neón'),
      (prod_id, 'CAM-PRO-L', 'L', 'Negro/Neón')
    ON CONFLICT (sku) DO NOTHING;
  END IF;
END $$;

-- Triggers de actualización
CREATE TRIGGER trg_hub_services_updated_at
BEFORE UPDATE ON app.hub_services
FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE TRIGGER trg_hub_specialists_updated_at
BEFORE UPDATE ON app.hub_specialists
FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE TRIGGER trg_hub_appointments_updated_at
BEFORE UPDATE ON app.hub_appointments
FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON app.products
FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON app.orders
FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

COMMIT;
