using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace WaykuRunner.Api.Security;

public sealed class AdminApiKeyAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IConfiguration configuration)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "WaykuAdminKey";
    private const string HeaderName = "X-Wayku-Admin-Key";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var configuredKey = configuration["Admin:BootstrapKey"];

        if (string.IsNullOrWhiteSpace(configuredKey) || !Request.Headers.TryGetValue(HeaderName, out var suppliedKey))
        {
            return Task.FromResult(AuthenticateResult.Fail("Falta la llave administrativa."));
        }

        if (!string.Equals(configuredKey, suppliedKey, StringComparison.Ordinal))
        {
            return Task.FromResult(AuthenticateResult.Fail("Llave administrativa inválida."));
        }

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "local-admin"),
            new Claim(ClaimTypes.Name, "Wayku Local Admin"),
            new Claim(ClaimTypes.Role, "superadmin")
        };

        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
