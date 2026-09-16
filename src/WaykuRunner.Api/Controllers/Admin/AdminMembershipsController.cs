using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WaykuRunner.Api.Data;

namespace WaykuRunner.Api.Controllers.Admin;

[ApiController]
[Authorize(Roles = "superadmin,operations,community")]
[Route("api/admin/memberships")]
public sealed class AdminMembershipsController(WaykuRunnerDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult> List(CancellationToken cancellationToken)
    {
        var memberships = await db.AdminUserDirectory.AsNoTracking()
            .OrderBy(item => item.MembershipState)
            .ThenBy(item => item.DisplayName)
            .Take(200)
            .ToListAsync(cancellationToken);

        return Ok(memberships);
    }
}
