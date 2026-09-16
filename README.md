# Wayku Runner · entorno local

Este entorno levanta PostgreSQL 17 con PostGIS y pgAdmin para administrar la base de datos.

## Requisito

Instalar Docker Desktop y dejarlo iniciado.

## Primer arranque

1. Copiar .env.example a .env.
2. Reemplazar las dos contraseñas de ejemplo por claves locales.
3. Desde esta carpeta ejecutar:

~~~powershell
docker compose up -d
~~~

4. Abrir pgAdmin en http://localhost:5050.
5. Iniciar sesión con PGADMIN_EMAIL y PGADMIN_PASSWORD configurados en .env.
6. Registrar un servidor:

   - Host: db
   - Puerto: 5432
   - Base: valor de POSTGRES_DB
   - Usuario: valor de POSTGRES_USER
   - Contraseña: valor de POSTGRES_PASSWORD

La migración 001_admin_map_subscription.sql se ejecuta automáticamente solo al crear una base local nueva.

## Conexión del backend ASP.NET Core

En desarrollo, la API se conectará con:

~~~text
Host=localhost;Port=5432;Database=wayku_runner;Username=wayku_app;Password=<tu_clave>;Include Error Detail=true
~~~

Nunca se sube el archivo .env al repositorio.

## Operación diaria

~~~powershell
docker compose up -d
docker compose down
docker compose logs -f db
~~~

Para reiniciar la base desde cero se elimina el volumen de Docker. Es una acción destructiva y solo se hará cuando no existan datos que conservar.

## Iniciar la API administrativa

Con la base levantada, ejecutar:

~~~powershell
.\scripts\start-api.ps1
~~~

La API quedará en http://localhost:5180.

- Salud: GET /health
- Usuarios: GET /api/admin/users
- Zonas: GET y POST /api/admin/zones
- Mapa de zonas: GET /api/admin/zones/map
- Límite geográfico: PUT /api/admin/zones/{id}/boundary
- Publicar territorio: POST /api/admin/zones/{id}/publish
- Eventos: GET y POST /api/admin/events
- Membresías: GET /api/admin/memberships

Las rutas administrativas requieren el encabezado X-Wayku-Admin-Key con el valor WAYKU_ADMIN_BOOTSTRAP_KEY de .env.

## Iniciar el Backoffice React

En otra terminal, ejecutar:

~~~powershell
cd C:\WaykuRunner\src\WaykuRunner.Backoffice
npm run dev
~~~

Abrir http://127.0.0.1:5173. El panel solicita la clave administrativa local y la conserva solo en el almacenamiento de ese navegador. Incluye el editor de territorios: clic en el mapa para trazar el polígono, completar nombre y código, y guardar como borrador en PostGIS.

La capa base actual usa OpenStreetMap sin clave para desarrollo local. Antes de producción se debe contratar o seleccionar un proveedor de mapas con límites, estilo y atribución apropiados para el volumen esperado.
