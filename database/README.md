# Base de datos · Wayku Runner

Migraciones iniciales de PostgreSQL/PostGIS para el Backoffice Wayku.

Orden de ejecución:

1. 001_admin_map_subscription.sql (Núcleo administrativo, zonas, mapa, temporadas y usuarios)
2. 002_hub_store_payments.sql (Centro físico Wayku Hub, Wayku Store y pagos unificados)
3. 003_gameplay_and_activity.sql (Siguiente: actividades GPS y conquistas territoriales)

Para aplicar migraciones de forma automática a la base de Docker:

~~~powershell
.\scripts\apply-migrations.ps1
~~~

Regla comercial implementada:

- Activa: elegible para equipo y beneficios.
- Gracia: hasta grace_ends_at; conserva elegibilidad.
- Suspendida: hasta 30 días posteriores a ends_at; no suma para equipo.
- Comunidad: después de ese periodo; conserva XP e historial.
