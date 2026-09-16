# -------------------------------------------------
# 1️⃣ Build stage – compila la aplicación con el SDK
# -------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copiamos el proyecto y restauramos paquetes
COPY WaykuRunner.Api/*.csproj ./WaykuRunner.Api/
RUN dotnet restore ./WaykuRunner.Api/WaykuRunner.Api.csproj

# Copiamos el resto del código y publicamos
COPY . .
WORKDIR /src/WaykuRunner.Api
RUN dotnet publish WaykuRunner.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# -------------------------------------------------
# 2️⃣ Runtime stage – solo lo necesario para ejecutar
# -------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish ./

# Render asigna el puerto mediante la variable $PORT.
# ASP.NET Core debe escuchar en 0.0.0.0:$PORT.
ENV ASPNETCORE_URLS=http://0.0.0.0:${PORT}
ENV ASPNETCORE_ENVIRONMENT=Production   # (opcional)

ENTRYPOINT ["dotnet", "WaykuRunner.Api.dll"]