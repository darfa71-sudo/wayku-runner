-- Wayku · migración 003
-- Integridad para inscripción, checkout, inventario y agenda.

BEGIN;

CREATE TYPE app.event_registration_status AS ENUM (
  'pending_payment',
  'confirmed',
  'cancelled',
  'waitlisted'
);

CREATE TABLE app.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES app.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app.users(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES app.orders(id) ON DELETE SET NULL,
  status app.event_registration_status NOT NULL DEFAULT 'pending_payment',
  bib_number text,
  category text,
  check_in_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_event_registration_active_runner
  ON app.event_registrations (event_id, user_id)
  WHERE status IN ('pending_payment', 'confirmed');

CREATE INDEX ix_event_registrations_event_status
  ON app.event_registrations (event_id, status);

ALTER TABLE app.orders
  ADD CONSTRAINT ck_orders_net_amount
  CHECK (net_amount = total_amount - discount_amount);

ALTER TABLE app.inventory
  ADD CONSTRAINT ck_inventory_reserved_not_above_stock
  CHECK (reserved_quantity <= stock_quantity);

CREATE UNIQUE INDEX ux_payments_provider_transaction
  ON app.payments (provider, provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;

DROP VIEW app.store_catalog;
CREATE VIEW app.store_catalog AS
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
  GREATEST(COALESCE(inv.stock_quantity, 0) - COALESCE(inv.reserved_quantity, 0), 0) AS stock_available
FROM app.products p
JOIN app.product_variants pv ON pv.product_id = p.id AND pv.is_active = true
LEFT JOIN app.inventory inv ON inv.variant_id = pv.id
WHERE p.is_active = true;

CREATE TRIGGER trg_event_registrations_updated_at
BEFORE UPDATE ON app.event_registrations
FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- Cada producto activo debe ser comprable: se crea la variante estándar donde falte.
INSERT INTO app.product_variants (product_id, sku, size, color)
SELECT p.id, upper(p.code) || '-STD', 'UNICA', 'Oficial'
FROM app.products p
WHERE NOT EXISTS (
  SELECT 1 FROM app.product_variants pv WHERE pv.product_id = p.id
)
ON CONFLICT (sku) DO NOTHING;

INSERT INTO app.inventory (variant_id, location, stock_quantity, reserved_quantity)
SELECT pv.id, 'sede_norte_quito', 0, 0
FROM app.product_variants pv
WHERE NOT EXISTS (
  SELECT 1 FROM app.inventory inv WHERE inv.variant_id = pv.id AND inv.location = 'sede_norte_quito'
)
ON CONFLICT (variant_id, location) DO NOTHING;

COMMIT;
