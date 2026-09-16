$projectRoot = Split-Path -Parent $PSScriptRoot
$settingsPath = Join-Path $projectRoot ".env"

if (-not (Test-Path -LiteralPath $settingsPath)) {
    throw "No existe .env. Copia .env.example a .env antes de iniciar la API."
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

$required = "POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_PORT", "WAYKU_ADMIN_BOOTSTRAP_KEY"
foreach ($key in $required) {
    if ([string]::IsNullOrWhiteSpace($settings[$key])) {
        throw "Falta $key en .env."
    }
}

$env:ConnectionStrings__WaykuRunner = "Host=localhost;Port=$($settings["POSTGRES_PORT"]);Database=$($settings["POSTGRES_DB"]);Username=$($settings["POSTGRES_USER"]);Password=$($settings["POSTGRES_PASSWORD"])"
$env:Admin__BootstrapKey = $settings["WAYKU_ADMIN_BOOTSTRAP_KEY"]

Set-Location (Join-Path $projectRoot "src\WaykuRunner.Api")
dotnet run --urls http://localhost:5180
