using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NetTopologySuite;
using NetTopologySuite.Geometries;
using WaykuRunner.Api.Data;
using WaykuRunner.Api.Domain.Administration;

namespace WaykuRunner.Api.Controllers.Admin;

[ApiController]
[Authorize(Roles = "superadmin,operations")]
[Route("api/admin/zones")]
public sealed class AdminZonesController(WaykuRunnerDbContext db) : ControllerBase
{
    private static readonly GeometryFactory GeometryFactory = NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);

    [HttpGet]
    public async Task<ActionResult> List(CancellationToken cancellationToken)
    {
        var zones = await db.TerritoryZones
            .AsNoTracking()
            .OrderBy(zone => zone.Name)
            .ToListAsync(cancellationToken);

        return Ok(zones);
    }

    [HttpPost]
    public async Task<ActionResult> Create(CreateZoneRequest request, CancellationToken cancellationToken)
    {
        var code = request.Code.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(request.Name))
        {
            return ValidationProblem("Código y nombre son obligatorios.");
        }

        var alreadyExists = await db.TerritoryZones.AnyAsync(zone => zone.Code == code, cancellationToken);
        if (alreadyExists)
        {
            return Conflict(new { message = "Ya existe una zona con ese código." });
        }

        var zone = new TerritoryZone
        {
            Id = Guid.NewGuid(),
            Code = code,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            Status = "draft"
        };

        db.TerritoryZones.Add(zone);
        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            Id = Guid.NewGuid(),
            EntityType = "territory_zone",
            EntityId = zone.Id,
            Action = "created_draft",
            AfterData = JsonSerializer.Serialize(new { zone.Code, zone.Name, zone.Status })
        });

        await db.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetById), new { zone.Id }, zone);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var zone = await db.TerritoryZones.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        return zone is null ? NotFound() : Ok(zone);
    }

    [HttpGet("map")]
    public async Task<ActionResult> Map(CancellationToken cancellationToken)
    {
        var zones = await db.TerritoryZones.AsNoTracking().ToListAsync(cancellationToken);
        var versions = await db.TerritoryZoneVersions.AsNoTracking()
            .Where(version => zones.Select(zone => zone.Id).Contains(version.ZoneId))
            .ToListAsync(cancellationToken);

        var mappedZones = zones
            .Select(zone => new
            {
                Zone = zone,
                Version = versions
                    .Where(version => version.ZoneId == zone.Id)
                    .OrderByDescending(version => version.VersionNumber)
                    .FirstOrDefault()
            })
            .Where(item => item.Version is not null)
            .ToList();

        var features = mappedZones.Select(item => new
        {
            type = "Feature",
            properties = new
            {
                id = item.Zone.Id,
                item.Zone.Code,
                item.Zone.Name,
                item.Zone.Status,
                version = item.Version!.VersionNumber,
                versionStatus = item.Version!.Status
            },
            geometry = ToGeoJson(item.Version.Boundary)
        });

        return Ok(new { type = "FeatureCollection", features });
    }

    [HttpPut("{id:guid}/boundary")]
    public async Task<ActionResult> SaveBoundary(
        Guid id,
        SaveBoundaryRequest request,
        CancellationToken cancellationToken)
    {
        var zone = await db.TerritoryZones.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (zone is null)
        {
            return NotFound();
        }

        if (request.Coordinates is null || request.Coordinates.Count < 3)
        {
            return ValidationProblem("El polígono necesita al menos tres puntos.");
        }

        if (request.Coordinates.Any(point =>
                point.Longitude is < -180 or > 180 || point.Latitude is < -90 or > 90))
        {
            return ValidationProblem("Las coordenadas geográficas no son válidas.");
        }

        var coordinates = request.Coordinates
            .Select(point => new Coordinate(point.Longitude, point.Latitude))
            .ToList();

        if (!coordinates[0].Equals2D(coordinates[^1]))
        {
            coordinates.Add(coordinates[0].Copy());
        }

        var polygon = GeometryFactory.CreatePolygon(coordinates.ToArray());
        if (!polygon.IsValid || polygon.Area <= 0)
        {
            return ValidationProblem("El límite debe ser un polígono cerrado y sin cruces.");
        }

        var nextVersion = (await db.TerritoryZoneVersions
            .Where(version => version.ZoneId == id)
            .MaxAsync(version => (int?)version.VersionNumber, cancellationToken) ?? 0) + 1;

        var version = new TerritoryZoneVersion
        {
            Id = Guid.NewGuid(),
            ZoneId = id,
            VersionNumber = nextVersion,
            Boundary = GeometryFactory.CreateMultiPolygon([polygon]),
            Status = "draft"
        };

        db.TerritoryZoneVersions.Add(version);
        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            Id = Guid.NewGuid(),
            EntityType = "territory_zone",
            EntityId = zone.Id,
            Action = "boundary_saved",
            AfterData = JsonSerializer.Serialize(new { zone.Code, version = nextVersion, points = request.Coordinates.Count })
        });

        await db.SaveChangesAsync(cancellationToken);
        return Ok(new { zone.Id, version = nextVersion, status = "draft" });
    }

    [HttpPost("{id:guid}/publish")]
    public async Task<ActionResult> Publish(Guid id, CancellationToken cancellationToken)
    {
        var zone = await db.TerritoryZones.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (zone is null)
        {
            return NotFound(new { message = "Territorio no encontrado." });
        }

        var latestVersion = await db.TerritoryZoneVersions
            .Where(version => version.ZoneId == id)
            .OrderByDescending(version => version.VersionNumber)
            .FirstOrDefaultAsync(cancellationToken);

        if (latestVersion is null)
        {
            return BadRequest(new { message = "El territorio no tiene ningún límite geográfico trazado. Guarda un polígono antes de publicar." });
        }

        var now = DateTimeOffset.UtcNow;
        latestVersion.Status = "published";
        latestVersion.PublishedAt = now;

        zone.Status = "published";
        zone.CurrentPublishedVersionId = latestVersion.Id;
        zone.UpdatedAt = now;

        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            Id = Guid.NewGuid(),
            EntityType = "territory_zone",
            EntityId = zone.Id,
            Action = "zone_published",
            AfterData = JsonSerializer.Serialize(new { zone.Code, version = latestVersion.VersionNumber, publishedAt = now })
        });

        await db.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            zone.Id,
            zone.Code,
            zone.Name,
            zone.Status,
            currentPublishedVersionId = zone.CurrentPublishedVersionId,
            publishedVersionNumber = latestVersion.VersionNumber
        });
    }

    private static object ToGeoJson(MultiPolygon boundary) => new
    {
        type = "MultiPolygon",
        coordinates = boundary.Geometries
            .Cast<Polygon>()
            .Select(polygon => new[] { polygon.ExteriorRing }
                .Concat(polygon.InteriorRings.Cast<LineString>())
                .Select(ring => ring.Coordinates
                    .Select(coordinate => new[] { coordinate.X, coordinate.Y })
                    .ToArray())
                .ToArray())
            .ToArray()
    };

    public sealed record CreateZoneRequest(string Code, string Name, string? Description);
    public sealed record GeoPoint(double Longitude, double Latitude);
    public sealed record SaveBoundaryRequest(IReadOnlyList<GeoPoint> Coordinates);
}
