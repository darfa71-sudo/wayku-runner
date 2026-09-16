# -------------------------------------------------
# 1️⃣ Build stage – compila la aplicación con el SDK
# -------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:11.0 AS build

# -------------------------------------------------
# Copiamos la carpeta del proyecto al contenedor
# -------------------------------------------------
# El contexto de build es la raíz del repositorio: incluye la API y las migraciones.
COPY src/WaykuRunner.Api /src/src/WaykuRunner.Api
COPY database/migrations /src/database/migrations

# Establecemos el directorio donde está el .csproj
WORKDIR /src/src/WaykuRunner.Api

# Restauramos paquetes
RUN dotnet restore "WaykuRunner.Api.csproj"

# Publicamos la aplicación (generamos los artefactos)
RUN dotnet publish "WaykuRunner.Api.csproj" \
    -c Release \
    -o /app/publish \
    --no-restore

# -------------------------------------------------
# 2️⃣ Runtime stage – solo lo necesario para ejecutar
# -------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:11.0 AS runtime
WORKDIR /app

# Copiamos los artefactos publicados desde la fase anterior
COPY --from=build /app/publish ./

# Render asigna el puerto mediante la variable $PORT.
# ASP.NET Core debe escuchar en 0.0.0.0:$PORT.
ENV ASPNETCORE_ENVIRONMENT=Production   
ENTRYPOINT ["sh", "-c", "dotnet WaykuRunner.Api.dll --urls http://0.0.0.0:${PORT:-5180}"]
