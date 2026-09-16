using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using WaykuRunner.Api.Data;
using WaykuRunner.Api.Security;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? ["http://localhost:5173", "http://127.0.0.1:5173"];

        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddAuthentication(AdminApiKeyAuthenticationHandler.SchemeName)
    .AddScheme<AuthenticationSchemeOptions, AdminApiKeyAuthenticationHandler>(
        AdminApiKeyAuthenticationHandler.SchemeName,
        _ => { });
builder.Services.AddAuthorization();

var rawConnectionString = builder.Configuration.GetConnectionString("WaykuRunner")
    ?? throw new InvalidOperationException(
        "Falta ConnectionStrings:WaykuRunner. Configúrala como variable de entorno antes de iniciar la API.");

var connectionString = NormalizePostgresConnectionString(rawConnectionString);

builder.Services.AddDbContext<WaykuRunnerDbContext>(options =>
    options
        .UseNpgsql(connectionString, npgsql => npgsql.UseNetTopologySuite())
        .UseSnakeCaseNamingConvention());

var app = builder.Build();

await DatabaseMigrator.ApplyAsync(app.Services, app.Logger);

app.UseCors();

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", async (WaykuRunnerDbContext db, CancellationToken cancellationToken) =>
{
    var canConnect = await db.Database.CanConnectAsync(cancellationToken);
    return canConnect
        ? Results.Ok(new { status = "healthy", database = "connected" })
        : Results.Problem("No se pudo conectar a la base de datos.", statusCode: StatusCodes.Status503ServiceUnavailable);
});

app.MapControllers();

app.Run();

static string NormalizePostgresConnectionString(string value)
{
    if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) ||
        (uri.Scheme is not "postgres" and not "postgresql"))
    {
        return value;
    }

    var credentials = uri.UserInfo.Split(':', 2, StringSplitOptions.None);
    var builder = new NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.IsDefaultPort ? 5432 : uri.Port,
        Database = Uri.UnescapeDataString(uri.AbsolutePath.Trim('/')),
        Username = credentials.Length > 0 ? Uri.UnescapeDataString(credentials[0]) : string.Empty,
        Password = credentials.Length > 1 ? Uri.UnescapeDataString(credentials[1]) : string.Empty,
        Pooling = true,
        MaxPoolSize = 10,
        Timeout = 15,
        CommandTimeout = 30,
    };

    foreach (var pair in uri.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
    {
        var item = pair.Split('=', 2, StringSplitOptions.None);
        if (item.Length == 2 && item[0].Equals("sslmode", StringComparison.OrdinalIgnoreCase))
        {
            builder["Ssl Mode"] = Uri.UnescapeDataString(item[1]);
        }
    }

    return builder.ConnectionString;
}
