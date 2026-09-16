$projectRoot = Split-Path -Parent $PSScriptRoot
$settingsPath = Join-Path $projectRoot ".env"

if (-not (Test-Path -LiteralPath $settingsPath)) {
    throw "No existe .env. Configura el archivo antes de aplicar migraciones."
}

$settings = @{}
Get-Content -LiteralPath $settingsPath | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        $parts = $line -split "=", 2
        if ($parts.Count -eq 2) { $settings[$parts[0]] = $parts[1] }
    }
}

$dbUser = $settings["POSTGRES_USER"]
$database = $settings["POSTGRES_DB"]
if (-not $dbUser -or -not $database) {
    throw "POSTGRES_USER o POSTGRES_DB no están definidos en .env."
}

if ((docker inspect -f '{{.State.Running}}' wayku-runner-db 2>$null) -ne "true") {
    docker compose up -d db
}

function Invoke-WaykuSql([string] $sql) {
    & docker exec wayku-runner-db psql -v ON_ERROR_STOP=1 -U $dbUser -d $database -tAc $sql
    if ($LASTEXITCODE -ne 0) { throw "No se pudo ejecutar SQL de migración." }
}

Invoke-WaykuSql "CREATE TABLE IF NOT EXISTS app.schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());" | Out-Null

$migrations = @(
    @{ Name = "001_admin_map_subscription.sql"; Probe = "app.territory_zones" },
    @{ Name = "002_hub_store_payments.sql"; Probe = "app.hub_services" },
    @{ Name = "003_checkout_hardening.sql"; Probe = "app.event_registrations" },
    @{ Name = "004_territory_status_text.sql"; Probe = $null }
)

foreach ($migration in $migrations) {
    $alreadyApplied = (Invoke-WaykuSql "SELECT EXISTS(SELECT 1 FROM app.schema_migrations WHERE name = '$($migration.Name)');").Trim()
    if ($alreadyApplied -eq "t") {
        Write-Host "Omitiendo $($migration.Name): ya registrada." -ForegroundColor DarkGray
        continue
    }

    if ($migration.Probe) {
        $existingSchema = (Invoke-WaykuSql "SELECT to_regclass('$($migration.Probe)') IS NOT NULL;").Trim()
        if ($existingSchema -eq "t") {
            Invoke-WaykuSql "INSERT INTO app.schema_migrations (name) VALUES ('$($migration.Name)') ON CONFLICT DO NOTHING;" | Out-Null
            Write-Host "Registrada $($migration.Name) como base existente." -ForegroundColor Yellow
            continue
        }
    }

    $filePath = Join-Path $projectRoot "database\migrations\$($migration.Name)"
    if (-not (Test-Path -LiteralPath $filePath)) { throw "No existe $filePath" }

    Write-Host "Aplicando $($migration.Name)..." -ForegroundColor Cyan
    Get-Content -LiteralPath $filePath -Raw | docker exec -i wayku-runner-db psql -v ON_ERROR_STOP=1 -U $dbUser -d $database
    if ($LASTEXITCODE -ne 0) { throw "Falló $($migration.Name)." }

    Invoke-WaykuSql "INSERT INTO app.schema_migrations (name) VALUES ('$($migration.Name)');" | Out-Null
    Write-Host "$($migration.Name) aplicada." -ForegroundColor Green
}
