using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WaykuRunner.Api.Data;
using WaykuRunner.Api.Domain.Administration;

namespace WaykuRunner.Api.Controllers.Admin;

[ApiController]
[Authorize(Roles = "superadmin,operations,events")]
[Route("api/admin/events")]
public sealed class AdminEventsController(WaykuRunnerDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult> List(CancellationToken cancellationToken)
    {
        var events = await db.Events.AsNoTracking()
            .OrderBy(runnerEvent => runnerEvent.StartsAt)
            .ToListAsync(cancellationToken);

        return Ok(events);
    }

    [HttpPost]
    public async Task<ActionResult> Create(CreateEventRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || request.EndsAt <= request.StartsAt)
        {
            return ValidationProblem("El nombre es obligatorio y el evento debe terminar después de iniciar.");
        }

        if (request.MemberDiscountPercent is < 0 or > 100)
        {
            return ValidationProblem("El descuento para miembros debe estar entre 0 y 100.");
        }

        var runnerEvent = new RunnerEvent
        {
            Id = Guid.NewGuid(),
            SeasonId = request.SeasonId,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            EventType = request.EventType,
            StartsAt = request.StartsAt,
            EndsAt = request.EndsAt,
            RegistrationOpensAt = request.RegistrationOpensAt,
            RegistrationClosesAt = request.RegistrationClosesAt,
            Capacity = request.Capacity,
            PublicPrice = request.PublicPrice,
            MemberDiscountPercent = request.MemberDiscountPercent,
            Status = "draft"
        };

        db.Events.Add(runnerEvent);
        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            Id = Guid.NewGuid(),
            EntityType = "event",
            EntityId = runnerEvent.Id,
            Action = "created_draft",
            AfterData = JsonSerializer.Serialize(new { runnerEvent.Name, runnerEvent.EventType, runnerEvent.StartsAt })
        });

        await db.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(List), new { runnerEvent.Id }, runnerEvent);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult> Update(Guid id, UpdateEventRequest request, CancellationToken cancellationToken)
    {
        var runnerEvent = await db.Events.SingleOrDefaultAsync(e => e.Id == id, cancellationToken);
        if (runnerEvent is null)
        {
            return NotFound(new { message = "Evento no encontrado." });
        }

        if (string.IsNullOrWhiteSpace(request.Name) || request.EndsAt <= request.StartsAt)
        {
            return ValidationProblem("El nombre es obligatorio y el evento debe terminar después de iniciar.");
        }

        runnerEvent.Name = request.Name.Trim();
        runnerEvent.Description = request.Description?.Trim();
        runnerEvent.EventType = request.EventType;
        runnerEvent.StartsAt = request.StartsAt;
        runnerEvent.EndsAt = request.EndsAt;
        runnerEvent.Capacity = request.Capacity;
        runnerEvent.PublicPrice = request.PublicPrice;
        runnerEvent.MemberDiscountPercent = request.MemberDiscountPercent;
        runnerEvent.Status = request.Status;
        runnerEvent.UpdatedAt = DateTimeOffset.UtcNow;

        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            Id = Guid.NewGuid(),
            EntityType = "event",
            EntityId = runnerEvent.Id,
            Action = "updated_event",
            AfterData = JsonSerializer.Serialize(new { runnerEvent.Name, runnerEvent.StartsAt, runnerEvent.Status })
        });

        await db.SaveChangesAsync(cancellationToken);
        return Ok(runnerEvent);
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Archive(Guid id, CancellationToken cancellationToken)
    {
        var runnerEvent = await db.Events.SingleOrDefaultAsync(e => e.Id == id, cancellationToken);
        if (runnerEvent is null)
        {
            return NotFound(new { message = "Evento no encontrado." });
        }

        runnerEvent.Status = "archived";
        runnerEvent.UpdatedAt = DateTimeOffset.UtcNow;

        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            Id = Guid.NewGuid(),
            EntityType = "event",
            EntityId = runnerEvent.Id,
            Action = "archived_event",
            AfterData = JsonSerializer.Serialize(new { runnerEvent.Name, runnerEvent.Status })
        });

        await db.SaveChangesAsync(cancellationToken);
        return Ok(new { runnerEvent.Id, runnerEvent.Status });
    }

    public sealed record CreateEventRequest(
        Guid? SeasonId,
        string Name,
        string? Description,
        string EventType,
        DateTimeOffset StartsAt,
        DateTimeOffset EndsAt,
        DateTimeOffset? RegistrationOpensAt,
        DateTimeOffset? RegistrationClosesAt,
        int? Capacity,
        decimal? PublicPrice,
        decimal MemberDiscountPercent);

    public sealed record UpdateEventRequest(
        string Name,
        string? Description,
        string EventType,
        DateTimeOffset StartsAt,
        DateTimeOffset EndsAt,
        int? Capacity,
        decimal? PublicPrice,
        decimal MemberDiscountPercent,
        string Status);
}
