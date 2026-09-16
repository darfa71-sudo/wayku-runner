using Microsoft.EntityFrameworkCore;

namespace WaykuRunner.Api.Data;

public static class DatabaseMigrator
{
    private static readonly MigrationDefinition[] Migrations =
    [
        new("001_admin_map_subscription.sql", "SELECT to_regclass('app.territory_zones') IS NOT NULL;"),
        new("002_hub_store_payments.sql", "SELECT to_regclass('app.hub_services') IS NOT NULL;"),
        new("003_checkout_hardening.sql", "SELECT to_regclass('app.event_registrations') IS NOT NULL;"),
        new("004_territory_status_text.sql", null),
    ];

    public static async Task ApplyAsync(IServiceProvider services, ILogger logger, CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<WaykuRunnerDbContext>();
        await using var connection = db.Database.GetDbConnection();
        await connection.OpenAsync(cancellationToken);

        await using (var bootstrap = connection.CreateCommand())
        {
            bootstrap.CommandText = """
                CREATE SCHEMA IF NOT EXISTS app;
                CREATE TABLE IF NOT EXISTS app.schema_migrations (
                    name text PRIMARY KEY,
                    applied_at timestamptz NOT NULL DEFAULT now()
                );
                """;
            await bootstrap.ExecuteNonQueryAsync(cancellationToken);
        }

        await using var lockCommand = connection.CreateCommand();
        lockCommand.CommandText = "SELECT pg_advisory_lock(882201511);";
        await lockCommand.ExecuteNonQueryAsync(cancellationToken);

        try
        {
            foreach (var migration in Migrations)
            {
                if (await IsAppliedAsync(connection, migration.FileName, cancellationToken)) continue;

                if (migration.ExistingSchemaProbe is not null &&
                    await SchemaAlreadyExistsAsync(connection, migration.ExistingSchemaProbe, cancellationToken))
                {
                    await MarkAppliedAsync(connection, migration.FileName, cancellationToken);
                    logger.LogInformation("Migración {Migration} registrada como base existente.", migration.FileName);
                    continue;
                }

                var path = Path.Combine(AppContext.BaseDirectory, "Migrations", migration.FileName);
                if (!File.Exists(path))
                {
                    throw new FileNotFoundException($"No se encontró la migración {migration.FileName} en la publicación.", path);
                }

                await using (var command = connection.CreateCommand())
                {
                    command.CommandText = await File.ReadAllTextAsync(path, cancellationToken);
                    await command.ExecuteNonQueryAsync(cancellationToken);
                }

                await MarkAppliedAsync(connection, migration.FileName, cancellationToken);
                logger.LogInformation("Migración {Migration} aplicada.", migration.FileName);
            }
        }
        finally
        {
            await using var unlockCommand = connection.CreateCommand();
            unlockCommand.CommandText = "SELECT pg_advisory_unlock(882201511);";
            await unlockCommand.ExecuteNonQueryAsync(cancellationToken);
        }
    }

    private static async Task<bool> IsAppliedAsync(System.Data.Common.DbConnection connection, string filename, CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT EXISTS (SELECT 1 FROM app.schema_migrations WHERE name = @filename);";
        var parameter = command.CreateParameter();
        parameter.ParameterName = "filename";
        parameter.Value = filename;
        command.Parameters.Add(parameter);
        return (bool)(await command.ExecuteScalarAsync(cancellationToken) ?? false);
    }

    private static async Task<bool> SchemaAlreadyExistsAsync(System.Data.Common.DbConnection connection, string query, CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = query;
        return (bool)(await command.ExecuteScalarAsync(cancellationToken) ?? false);
    }

    private static async Task MarkAppliedAsync(System.Data.Common.DbConnection connection, string filename, CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = "INSERT INTO app.schema_migrations (name) VALUES (@filename) ON CONFLICT (name) DO NOTHING;";
        var parameter = command.CreateParameter();
        parameter.ParameterName = "filename";
        parameter.Value = filename;
        command.Parameters.Add(parameter);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private sealed record MigrationDefinition(string FileName, string? ExistingSchemaProbe);
}
