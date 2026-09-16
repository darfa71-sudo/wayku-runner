using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WaykuRunner.Api.Data;
using WaykuRunner.Api.Domain.Administration;

namespace WaykuRunner.Api.Controllers.Admin;

[ApiController]
[Authorize(Roles = "superadmin,operations,community")]
[Route("api/admin/hub")]
public sealed class AdminHubController(WaykuRunnerDbContext db) : ControllerBase
{
    [HttpGet("services")]
    public async Task<ActionResult> ListServices(CancellationToken cancellationToken)
    {
        var services = await db.HubServices
            .AsNoTracking()
            .Where(s => s.IsActive)
            .OrderBy(s => s.Name)
            .ToListAsync(cancellationToken);

        return Ok(services);
    }

    [HttpGet("agenda")]
    public async Task<ActionResult> GetAgenda([FromQuery] string? status, CancellationToken cancellationToken)
    {
        var query = db.HubAgenda.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(item => item.Status == status);
        }

        var agenda = await query
            .OrderByDescending(item => item.ScheduledAt)
            .Take(100)
            .ToListAsync(cancellationToken);

        return Ok(agenda);
    }

    [HttpPost("appointments")]
    public async Task<ActionResult> CreateAppointment(CreateAppointmentRequest request, CancellationToken cancellationToken)
    {
        var service = await db.HubServices.FindAsync([request.ServiceId], cancellationToken);
        if (service is null)
        {
            return NotFound(new { message = "Servicio no encontrado." });
        }

        var specialist = await db.HubSpecialists.FindAsync([request.SpecialistId], cancellationToken);
        if (specialist is null)
        {
            return NotFound(new { message = "Especialista no encontrado." });
        }

        var appointment = new HubAppointment
        {
            Id = Guid.NewGuid(),
            UserId = request.UserId,
            SpecialistId = request.SpecialistId,
            ServiceId = request.ServiceId,
            ScheduledAt = request.ScheduledAt,
            DurationMinutes = service.DurationMinutes,
            Status = "scheduled",
            Notes = request.Notes,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        db.HubAppointments.Add(appointment);
        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            Id = Guid.NewGuid(),
            EntityType = "hub_appointment",
            EntityId = appointment.Id,
            Action = "created_appointment",
            AfterData = JsonSerializer.Serialize(new { appointment.UserId, appointment.ServiceId, appointment.ScheduledAt })
        });

        await db.SaveChangesAsync(cancellationToken);

        return Ok(appointment);
    }

    [HttpGet("specialists")]
    public async Task<ActionResult> ListSpecialists(CancellationToken cancellationToken)
    {
        var specialists = await db.HubSpecialists
            .AsNoTracking()
            .Include(s => s.User)
            .ThenInclude(u => u!.Profile)
            .Where(s => s.IsActive)
            .Select(s => new
            {
                s.Id,
                s.UserId,
                s.Specialty,
                s.LicenseNumber,
                Name = s.User != null && s.User.Profile != null ? s.User.Profile.DisplayName : "Especialista Wayku"
            })
            .ToListAsync(cancellationToken);

        return Ok(specialists);
    }

    [HttpPut("appointments/{id:guid}/status")]
    public async Task<ActionResult> UpdateAppointmentStatus(Guid id, [FromBody] UpdateAppointmentStatusRequest request, CancellationToken cancellationToken)
    {
        var appointment = await db.HubAppointments.SingleOrDefaultAsync(a => a.Id == id, cancellationToken);
        if (appointment is null)
        {
            return NotFound(new { message = "Cita no encontrada." });
        }

        appointment.Status = request.Status;
        appointment.UpdatedAt = DateTimeOffset.UtcNow;

        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            Id = Guid.NewGuid(),
            EntityType = "hub_appointment",
            EntityId = appointment.Id,
            Action = "updated_appointment_status",
            AfterData = JsonSerializer.Serialize(new { appointment.Id, request.Status })
        });

        await db.SaveChangesAsync(cancellationToken);
        return Ok(appointment);
    }

    public sealed record CreateAppointmentRequest(
        Guid UserId,
        Guid SpecialistId,
        Guid ServiceId,
        DateTimeOffset ScheduledAt,
        string? Notes
    );

    public sealed record UpdateAppointmentStatusRequest(string Status);
}
