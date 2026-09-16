# Modelo entidad–relación inicial · Wayku Runner

## Principios

- PostgreSQL + PostGIS será la fuente de verdad.
- La app móvil nunca escribe directamente la base; el backend ASP.NET Core valida toda actividad.
- Una actividad GPS puede producir varios intentos de ruta, pero solo los intentos validados afectan XP, rankings y territorio.
- El control individual y el control de equipo son capas separadas.
- Consentimientos, datos de juego y datos sensibles se guardan separados.
- El panel administrativo es el único que puede publicar cambios en el mapa, eventos y reglas comerciales.

## Administración primero

Antes del juego se construye un Backoffice Wayku con seis módulos:

1. Mapa: crear una zona, dibujar o editar su polígono, crear rutas oficiales, definir distancia, nivel mínimo y estado publicado.
2. Temporadas: abrir temporadas, semanas competitivas, reglas de puntuación y calendario.
3. Eventos: crear carreras, categorías, cupos, precios, descuento para miembros e inscripciones.
4. Sellos y premios: registrar un QR físico, abrir o cerrar drops, limitar el cupo y controlar inventario.
5. Comunidad: revisar corredores, equipos, actividades sospechosas y consentimientos.
6. Suscripciones: planes, pagos, periodos de gracia, cambios de estado y elegibilidad competitiva.

Toda acción administrativa queda en un registro de auditoría: quién cambió qué, cuándo y cuál era el valor anterior.

## Diagrama

~~~mermaid
erDiagram
    USERS ||--|| RUNNER_PROFILES : tiene
    USERS ||--o{ CONSENT_RECORDS : autoriza
    USERS ||--o{ TEAM_MEMBERS : participa
    TEAMS ||--o{ TEAM_MEMBERS : integra
    USERS ||--o{ USER_ROLES : administra
    ROLES ||--o{ USER_ROLES : asigna
    USERS ||--o{ ADMIN_AUDIT_LOGS : modifica
    USERS ||--o{ ACTIVITIES : registra
    ACTIVITIES ||--o{ ACTIVITY_ROUTE_ATTEMPTS : genera
    OFFICIAL_ROUTES ||--o{ ACTIVITY_ROUTE_ATTEMPTS : se_intenta
    TERRITORY_ZONES ||--o{ OFFICIAL_ROUTES : contiene
    TERRITORY_ZONES ||--o{ TERRITORY_ZONE_VERSIONS : versiona
    TERRITORY_ZONES ||--o{ TERRITORY_CONNECTIONS : origen
    TERRITORY_ZONES ||--o{ TERRITORY_CONNECTIONS : destino
    SEASONS ||--o{ COMPETITION_WEEKS : agrupa
    COMPETITION_WEEKS ||--o{ TERRITORY_CONTROLS : determina
    TERRITORY_ZONES ||--o{ TERRITORY_CONTROLS : se_controla
    USERS ||--o{ TERRITORY_CONTROLS : domina_individual
    TEAMS ||--o{ TERRITORY_CONTROLS : domina_equipo
    USERS ||--o{ EXPERIENCE_LEDGER : gana
    ACTIVITY_ROUTE_ATTEMPTS ||--o{ EXPERIENCE_LEDGER : origina
    QR_STAMP_POINTS ||--o{ QR_DROPS : habilita
    QR_DROPS ||--o{ QR_CLAIMS : limita
    USERS ||--o{ QR_CLAIMS : escanea
    USERS ||--o{ REWARD_REDEMPTIONS : canjea
    REWARDS ||--o{ REWARD_REDEMPTIONS : entrega
    EVENTS ||--o{ EVENT_REGISTRATIONS : recibe
    USERS ||--o{ EVENT_REGISTRATIONS : se_inscribe
    EVENTS ||--o{ CIRCUIT_POINTS_LEDGER : otorga
    USERS ||--o{ CIRCUIT_POINTS_LEDGER : recibe
    SUBSCRIPTION_PLANS ||--o{ SUBSCRIPTIONS : define
    USERS ||--o{ SUBSCRIPTIONS : contrata
    SUBSCRIPTIONS ||--o{ SUBSCRIPTION_STATUS_HISTORY : registra
~~~

## Entidades de administración y publicación

| Entidad | Responsabilidad | Campos clave |
|---|---|---|
| roles | Roles operativos: superadmin, operaciones, eventos, comunidad, marketing. | id, code, name |
| user_roles | Asigna roles del panel a un usuario autenticado. | user_id, role_id, assigned_by, assigned_at |
| admin_audit_logs | Evidencia de cada cambio administrativo. | id, actor_user_id, entity_type, entity_id, action, before_data, after_data, created_at |
| territory_zone_versions | Conserva versiones históricas de una zona sin alterar resultados previos. | id, zone_id, boundary, version_number, status, published_at |
| subscription_status_history | Guarda cada transición comercial y su causa. | id, subscription_id, from_status, to_status, reason, effective_at |

## Entidades núcleo

### Identidad y comunidad

| Entidad | Responsabilidad | Campos clave |
|---|---|---|
| users | Cuenta autenticada. | id, email, auth_subject, status, created_at |
| runner_profiles | Perfil público del corredor, separado de credenciales. | user_id, display_name, avatar_url, city, visibility |
| consent_records | Consentimiento versionado, específico y revocable. | user_id, purpose, policy_version, granted_at, revoked_at |
| teams | Club o grupo competitivo. | id, name, slug, crest_url, status |
| team_members | Membresía y rol dentro del equipo. | team_id, user_id, role, joined_at, left_at |

### Mapa, rutas y validación GPS

| Entidad | Responsabilidad | Campos clave |
|---|---|---|
| territory_zones | Arena territorial real: La Carolina, Bicentenario, Metropolitano, etc. | id, code, name, boundary geography(MultiPolygon,4326), is_active |
| official_routes | Ruta oficial por la que se compite. | id, zone_id, name, path geography(LineString,4326), distance_meters, min_level, is_active |
| territory_connections | Expediciones que enlazan dos zonas mediante una ruta larga. | id, from_zone_id, to_zone_id, route_id, xp_reward, circuit_points |
| activities | Registro bruto de una carrera. No afecta el juego hasta validarse. | id, user_id, started_at, ended_at, distance_meters, duration_seconds, track geography(LineString,4326), validation_status |
| activity_route_attempts | Resultado de comparar una actividad con una ruta oficial. | id, activity_id, route_id, elapsed_seconds, route_match_percent, validation_status, valid_at |

### Juego, tiempo y territorio

| Entidad | Responsabilidad | Campos clave |
|---|---|---|
| seasons | Temporada competitiva. | id, name, starts_at, ends_at, status |
| competition_weeks | Ventana semanal que limita las marcas válidas. | id, season_id, starts_at, ends_at, status |
| experience_ledger | Libro inmutable de XP; nunca se recalcula desde una sola columna. | id, user_id, source_type, source_id, points, created_at |
| runner_progress | Estado actual derivado: XP acumulada y nivel. | user_id, total_xp, level_code, updated_at |
| territory_controls | Dueño vigente o histórico de una zona por semana y modalidad. | id, zone_id, competition_week_id, scope, holder_user_id, holder_team_id, score, effective_from, effective_to |

La tabla territory_controls tiene una restricción XOR: en control individual existe holder_user_id; en control grupal existe holder_team_id; nunca ambos.

### Sellos QR, recompensas y circuito

| Entidad | Responsabilidad | Campos clave |
|---|---|---|
| qr_stamp_points | Sello físico durable colocado en una zona. | id, zone_id, label, location geography(Point,4326), qr_secret_hash, is_active |
| qr_drops | Campaña digital reutilizable sobre un sello físico. | id, stamp_point_id, season_id, starts_at, ends_at, claim_limit, xp_reward, status |
| qr_claims | Escaneo validado por persona; protege cupo, GPS y duplicados. | id, drop_id, user_id, activity_id, claimed_at, status |
| rewards | Premio, cupón o mercancía. | id, name, reward_type, stock, required_stamps, season_id |
| reward_redemptions | Canje único y trazable. | id, reward_id, user_id, redeemed_at, fulfillment_status |
| events | Carrera oficial o actividad presencial. | id, name, starts_at, event_type, member_discount_rule |
| event_registrations | Inscripción a un evento. | id, event_id, user_id, team_id, price_paid, status |
| circuit_points_ledger | Puntos anuales, separados del dominio territorial. | id, user_id, event_id, source_type, points, created_at |

### Ecosistema Wayku: Centro Físico (Wayku Hub) y Merchandising (Wayku Store)

La plataforma unifica la experiencia deportiva (Runner), la atención profesional presencial (Hub) y la indumentaria de marca (Store) bajo una única identidad de usuario (`Wayku ID`), manteniendo estricta separación de privacidad.

#### Centro Físico (Wayku Hub)
Datos de salud y citas clínicas. El personal de salud accede con roles específicos; los datos de salud nunca son visibles en los rankings ni perfiles públicos de Runner.

| Entidad | Responsabilidad | Campos clave |
|---|---|---|
| hub_services | Catálogo de servicios presenciales: fisioterapia, nutrición, valoración de pisada, entrenamiento funcional. | id, code, name, service_type, duration_minutes, price, member_discount_percent, is_active |
| hub_specialists | Profesionales de la salud y coaches del centro. | id, user_id, specialty, license_number, is_active |
| hub_appointments | Reservas de turnos y citas en el centro físico. | id, user_id, specialist_id, service_id, scheduled_at, duration_minutes, status, notes |
| clinical_evaluations | Ficha clínica confidencial, diagnósticos, historial de lesiones y planes de recuperación. | id, appointment_id, user_id, specialist_id, evaluation_type, data (jsonb), private_notes |

#### Merchandising y Tienda (Wayku Store)
Indumentaria oficial, kits de carrera, hidratación y accesorios. Permite compra directa, compra conjunta al inscribirse a una carrera y retiro en sede física.

| Entidad | Responsabilidad | Campos clave |
|---|---|---|
| products | Catálogo de productos y ropa de marca Wayku. | id, code, name, category, description, base_price, is_active |
| product_variants | Variantes de producto por talla (S, M, L, XL), color y SKU. | id, product_id, sku, size, color, additional_price, is_active |
| inventory | Control de stock físico disponible en el centro o almacén. | id, variant_id, location, stock_quantity, reserved_quantity |
| orders | Pedidos unificados (inscripciones a carreras + merch + servicios). | id, user_id, event_id, status, total_amount, discount_amount, net_amount, pickup_method, qr_claim_code |
| order_items | Líneas de detalle del pedido con cantidades y precios aplicados. | id, order_id, item_type, reference_id, variant_id, quantity, unit_price, subtotal |
| payments | Transacciones financieras (tarjeta, transferencia, pasarela o cobro presencial). | id, order_id, payment_method, provider, provider_transaction_id, amount, status, paid_at |

### Suscripción y beneficios comerciales

| Entidad | Responsabilidad | Campos clave |
|---|---|---|
| subscription_plans | Planes de membresía con acceso al centro, app y descuentos en carreras. | id, code, name, price, billing_period, is_active |
| subscriptions | Estado comercial de un corredor y su elegibilidad competitiva. | id, user_id, plan_id, provider, provider_reference, status, starts_at, ends_at, grace_ends_at |
| subscription_status_history | Historial inmutable de alta, pago, mora, suspensión, cancelación y reactivación. | id, subscription_id, from_status, to_status, reason, effective_at |
| service_interests | Señal temprana de interés por servicios del centro físico. | id, user_id, service_type, requested_at, status |

### Regla de rango por suscripción

Separamos progreso y membresía para no castigar injustamente el hábito del corredor:

- El nivel de corredor (Inicio, Explorador, etc.) se conserva: se gana con XP, días válidos y distancia.
- El rango competitivo de membresía sí puede bajar: determina si una persona puede sumar para un equipo, defender una bandera grupal, aparecer en el circuito anual y recibir beneficios de miembro.

Flujo propuesto:

1. Activa: todos los beneficios competitivos y comerciales habilitados.
2. Pago vencido: periodo de gracia de 7 días, con recordatorios y sin degradar el equipo de inmediato.
3. Suspendida: ya no aporta marcas nuevas a control grupal ni al circuito; conserva perfil, XP e historial.
4. Inactiva por 30 días: pasa a modo individual/comunidad. El equipo conserva solo sus integrantes activos.
5. Reactivada: recupera elegibilidad desde el siguiente cierre semanal; no reescribe resultados históricos.

## Reglas de integridad que se implementarán en base de datos

1. Un mismo usuario solo puede reclamar una vez cada qr_drop.
2. Un QR solo cuenta si el usuario tiene consentimiento de ubicación, está dentro del radio configurado y existe una actividad válida asociada.
3. Solo un control vigente por zone + competition_week + scope.
4. Un corredor tiene una única mejor marca válida por día, ruta y semana.
5. Para control grupal, las cinco marcas contadas deben provenir de mínimo tres integrantes; ningún integrante aporta más de dos.
6. Las actividades inválidas, alteradas o fuera de ruta jamás escriben XP, puntos ni control.
7. Datos de salud y preferencias de marketing requieren consentimientos independientes y revocables.
8. Una zona, ruta, drop QR o evento solo está visible en la app cuando su estado es published.
9. Ningún cambio de polígono, ruta, regla o precio borra el valor histórico; se audita y, cuando aplica, se versiona.
10. Solo un usuario con permiso administrativo puede publicar, archivar o modificar contenido operativo.
11. Una suscripción suspendida no borra XP ni marcas históricas; solo limita elegibilidad futura.

## Decisiones que dejamos abiertas para revisar juntos

- El radio válido de cada sello QR.
- La fórmula definitiva de control semanal individual y grupal.
- Si las zonas se dibujan como parques completos, circuitos cerrados o sectores internos.
- Proveedor de pagos y de autenticación.
- Retención de trazas GPS completas y política de anonimización.
