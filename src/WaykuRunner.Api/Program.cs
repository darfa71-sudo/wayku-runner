using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using WaykuRunner.Api.Data;
using WaykuRunner.Api.Security;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddAuthentication(AdminApiKeyAuthenticationHandler.SchemeName)
    .AddScheme<AuthenticationSchemeOptions, AdminApiKeyAuthenticationHandler>(
        AdminApiKeyAuthenticationHandler.SchemeName,
        _ => { });
builder.Services.AddAuthorization();

var connectionString = builder.Configuration.GetConnectionString("WaykuRunner")
    ?? throw new InvalidOperationException(
        "Falta ConnectionStrings:WaykuRunner. Configúrala como variable de entorno antes de iniciar la API.");

builder.Services.AddDbContext<WaykuRunnerDbContext>(options =>
    options
        .UseNpgsql(connectionString, npgsql => npgsql.UseNetTopologySuite())
        .UseSnakeCaseNamingConvention());

var app = builder.Build();

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
