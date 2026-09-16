using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WaykuRunner.Api.Data;
using WaykuRunner.Api.Domain.Administration;

namespace WaykuRunner.Api.Controllers.Admin;

[ApiController]
[Authorize(Roles = "superadmin,operations,community")]
[Route("api/admin/users")]
public sealed class AdminUsersController(WaykuRunnerDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult> List([FromQuery] string? search, CancellationToken cancellationToken)
    {
        var query = db.AdminUserDirectory.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = $"%{search.Trim()}%";
            query = query.Where(user =>
                EF.Functions.ILike(user.Email, term) ||
                (user.DisplayName != null && EF.Functions.ILike(user.DisplayName, term)));
        }

        var users = await query
            .OrderByDescending(user => user.CreatedAt)
            .Take(100)
            .ToListAsync(cancellationToken);

        return Ok(users);
    }

    [HttpPut("{id:guid}/status")]
    public async Task<ActionResult> UpdateStatus(Guid id, [FromBody] UpdateUserStatusRequest request, CancellationToken cancellationToken)
    {
        var user = await db.Users.SingleOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (user is null)
        {
            return NotFound(new { message = "Usuario no encontrado." });
        }

        var oldStatus = user.Status;
        user.Status = request.Status;
        user.UpdatedAt = DateTimeOffset.UtcNow;

        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            Id = Guid.NewGuid(),
            EntityType = "user",
            EntityId = user.Id,
            Action = "status_changed",
            BeforeData = oldStatus,
            AfterData = request.Status
        });

        await db.SaveChangesAsync(cancellationToken);
        return Ok(new { user.Id, user.Status });
    }

    [HttpPost("{id:guid}/membership")]
    public async Task<ActionResult> GrantMembership(Guid id, CancellationToken cancellationToken)
    {
        var user = await db.Users.SingleOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (user is null)
        {
            return NotFound(new { message = "Usuario no encontrado." });
        }

        var plan = await db.Subscriptions
            .Select(s => s.PlanId)
            .FirstOrDefaultAsync(cancellationToken);

        if (plan == Guid.Empty)
        {
            plan = Guid.NewGuid();
        }

        var now = DateTimeOffset.UtcNow;
        var subscription = new Subscription
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            PlanId = plan,
            Provider = "admin_grant",
            ProviderReference = $"ADM-{Guid.NewGuid():N}"[..18],
            Status = "active",
            StartsAt = now,
            EndsAt = now.AddMonths(1),
            GraceEndsAt = now.AddMonths(1).AddDays(7)
        };

        db.Subscriptions.Add(subscription);
        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            Id = Guid.NewGuid(),
            EntityType = "subscription",
            EntityId = subscription.Id,
            Action = "membership_granted_by_admin",
            AfterData = System.Text.Json.JsonSerializer.Serialize(new { user.Id, subscription.EndsAt })
        });

        await db.SaveChangesAsync(cancellationToken);
        return Ok(new { message = "Membresía activada con éxito por 30 días.", subscription.Id, status = "active", endsAt = subscription.EndsAt });
    }

    public sealed record UpdateUserStatusRequest(string Status);
}
