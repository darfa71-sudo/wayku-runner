$projectRoot = Split-Path -Parent $PSScriptRoot
$settingsPath = Join-Path $projectRoot ".env"

if (-not (Test-Path -LiteralPath $settingsPath)) {
    throw "No existe .env. Asegúrate de tener configurado el archivo .env."
}

$settings = @{}
Get-Content -LiteralPath $settingsPath | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        $parts = $line -split "=", 2
        if ($parts.Count -eq 2) {
            $settings[$parts[0]] = $parts[1]
        }
    }
}

$user = $settings["POSTGRES_USER"]
$db = $settings["POSTGRES_DB"]

if (-not $user -or -not $db) {
    throw "POSTGRES_USER o POSTGRES_DB no definidos en .env."
}

Write-Host "Comprobando contenedor wayku-runner-db..." -ForegroundColor Cyan

$containerStatus = docker inspect -f '{{.State.Running}}' wayku-runner-db 2>$null
if ($containerStatus -ne "true") {
    Write-Host "El contenedor de PostgreSQL no está corriendo. Iniciando con docker compose up -d..." -ForegroundColor Yellow
    docker compose up -d db
    Start-Sleep -Seconds 3
}

$migrations = @(
    "001_admin_map_subscription.sql",
    "002_hub_store_payments.sql"
)

foreach ($migration in $migrations) {
    $filePath = Join-Path $projectRoot "database\migrations\$migration"
    if (Test-Path -LiteralPath $filePath) {
        Write-Host "Aplicando migración: $migration..." -ForegroundColor Green
        Get-Content -LiteralPath $filePath -Raw | docker exec -i wayku-runner-db psql -U $user -d $db
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Migración $migration aplicada con éxito." -ForegroundColor Green
        } else {
            Write-Host "Advertencia o error al aplicar $migration. Revisa la salida anterior." -ForegroundColor Yellow
        }
    }
}

Write-Host "`nTodas las migraciones han sido procesadas." -ForegroundColor Cyan
