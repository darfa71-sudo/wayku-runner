# -------------------------------------------------
# 1️⃣ Build stage – compila la aplicación con el SDK
# -------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build

# -------------------------------------------------
# Copiamos la carpeta del proyecto al contenedor
# -------------------------------------------------
# El contexto de build es la raíz del repo, así que usamos una ruta
# absoluta dentro del contenedor: /src/WaykuRunner.Api
COPY src/WaykuRunner.Api/ /src/

# Establecemos el directorio donde está el .csproj
WORKDIR /src

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
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Copiamos los artefactos publicados desde la fase anterior
COPY --from=build /app/publish ./

# Render asigna el puerto mediante la variable $PORT.
# ASP.NET Core debe escuchar en 0.0.0.0:$PORT.
ENV ASPNETCORE_URLS=http://0.0.0.0:${PORT}
ENV ASPNETCORE_ENVIRONMENT=Production   # (opcional)

ENTRYPOINT ["dotnet", "WaykuRunner.Api.dll"]