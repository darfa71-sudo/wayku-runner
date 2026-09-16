using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WaykuRunner.Api.Data;
using WaykuRunner.Api.Domain.Administration;

namespace WaykuRunner.Api.Controllers.Admin;

[ApiController]
[Authorize(Roles = "superadmin,operations,events")]
[Route("api/admin/orders")]
public sealed class AdminOrdersController(WaykuRunnerDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult> List([FromQuery] string? status, CancellationToken cancellationToken)
    {
        var query = db.Orders
            .AsNoTracking()
            .Include(o => o.User)
            .ThenInclude(u => u!.Profile)
            .Include(o => o.Event)
            .Include(o => o.Items)
            .ThenInclude(i => i.Variant)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(o => o.Status == status);
        }

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Take(50)
            .Select(o => new
            {
                o.Id,
                o.UserId,
                UserEmail = o.User != null ? o.User.Email : "",
                AthleteName = o.User != null && o.User.Profile != null ? o.User.Profile.DisplayName : o.User!.Email,
                EventName = o.Event != null ? o.Event.Name : null,
                o.Status,
                o.TotalAmount,
                o.DiscountAmount,
                o.NetAmount,
                o.PickupMethod,
                o.QrClaimCode,
                o.CreatedAt,
                ItemsCount = o.Items.Count,
                Items = o.Items.Select(item => new
                {
                    item.Id,
                    item.ItemType,
                    item.Quantity,
                    item.UnitPrice,
                    item.Subtotal,
                    VariantSku = item.Variant != null ? item.Variant.Sku : null,
                    VariantSize = item.Variant != null ? item.Variant.Size : null
                })
            })
            .ToListAsync(cancellationToken);

        return Ok(orders);
    }

    [HttpPost("checkout")]
    public async Task<ActionResult> Checkout(CheckoutRequest request, CancellationToken cancellationToken)
    {
        var user = await db.Users
            .Include(u => u.Profile)
            .SingleOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

        if (user is null)
        {
            return NotFound(new { message = "Usuario / corredor no encontrado." });
        }

        // Consultar elegibilidad de membresía para descuentos
        var userDirectory = await db.AdminUserDirectory
            .AsNoTracking()
            .SingleOrDefaultAsync(d => d.Id == request.UserId, cancellationToken);

        var isMember = userDirectory?.MembershipState is "active" or "grace";

        decimal totalGross = 0;
        decimal totalDiscount = 0;
        var orderItems = new List<OrderItem>();
        var orderId = Guid.NewGuid();

        // 1. Inscripción a Evento (si aplica)
        if (request.EventId.HasValue)
        {
            var runnerEvent = await db.Events.FindAsync([request.EventId.Value], cancellationToken);
            if (runnerEvent != null)
            {
                var eventPrice = runnerEvent.PublicPrice ?? 0;
                var discount = isMember ? (eventPrice * (runnerEvent.MemberDiscountPercent / 100m)) : 0;
                var subtotal = eventPrice - discount;

                totalGross += eventPrice;
                totalDiscount += discount;

                orderItems.Add(new OrderItem
                {
                    Id = Guid.NewGuid(),
                    OrderId = orderId,
                    ItemType = "event_registration",
                    ReferenceId = runnerEvent.Id,
                    Quantity = 1,
                    UnitPrice = eventPrice,
                    Subtotal = subtotal
                });
            }
        }

        // 2. Artículos de Tienda / Merchandising
        if (request.Items != null)
        {
            foreach (var reqItem in request.Items)
            {
                var variant = await db.ProductVariants
                    .Include(v => v.Product)
                    .SingleOrDefaultAsync(v => v.Id == reqItem.VariantId, cancellationToken);

                if (variant != null && variant.Product != null)
                {
                    var unitPrice = variant.Product.BasePrice + variant.AdditionalPrice;
                    var discountPercent = isMember ? variant.Product.MemberDiscountPercent : 0;
                    var discountPerUnit = unitPrice * (discountPercent / 100m);
                    var itemSubtotal = (unitPrice - discountPerUnit) * reqItem.Quantity;

                    totalGross += unitPrice * reqItem.Quantity;
                    totalDiscount += discountPerUnit * reqItem.Quantity;

                    orderItems.Add(new OrderItem
                    {
                        Id = Guid.NewGuid(),
                        OrderId = orderId,
                        ItemType = "merch",
                        ReferenceId = variant.Product.Id,
                        VariantId = variant.Id,
                        Quantity = reqItem.Quantity,
                        UnitPrice = unitPrice,
                        Subtotal = itemSubtotal
                    });

                    // Descontar inventario disponible
                    var inv = await db.Inventory.SingleOrDefaultAsync(i => i.VariantId == variant.Id, cancellationToken);
                    if (inv != null && inv.StockQuantity >= reqItem.Quantity)
                    {
                        inv.StockQuantity -= reqItem.Quantity;
                        inv.UpdatedAt = DateTimeOffset.UtcNow;
                    }
                }
            }
        }

        var netAmount = totalGross - totalDiscount;
        var qrCode = Convert.ToHexString(RandomNumberGenerator.GetBytes(6));

        var order = new Order
        {
            Id = orderId,
            UserId = request.UserId,
            EventId = request.EventId,
            Status = "paid",
            TotalAmount = totalGross,
            DiscountAmount = totalDiscount,
            NetAmount = netAmount,
            PickupMethod = request.PickupMethod ?? "hub_pickup",
            QrClaimCode = qrCode,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
            Items = orderItems
        };

        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            OrderId = order.Id,
            PaymentMethod = request.PaymentMethod ?? "card",
            Provider = "local_pos",
            Amount = netAmount,
            Status = "approved",
            PaidAt = DateTimeOffset.UtcNow,
            CreatedAt = DateTimeOffset.UtcNow
        };

        order.Payments.Add(payment);
        db.Orders.Add(order);

        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            Id = Guid.NewGuid(),
            EntityType = "order",
            EntityId = order.Id,
            Action = "unified_checkout_completed",
            AfterData = JsonSerializer.Serialize(new { order.Id, order.UserId, order.NetAmount, order.QrClaimCode, items = orderItems.Count })
        });

        await db.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            order.Id,
            order.UserId,
            order.Status,
            order.TotalAmount,
            order.DiscountAmount,
            order.NetAmount,
            order.QrClaimCode,
            isMemberDiscountApplied = isMember,
            itemsCount = orderItems.Count
        });
    }

    [HttpPost("claim")]
    public async Task<ActionResult> ClaimByQr([FromBody] ClaimQrRequest request, CancellationToken cancellationToken)
    {
        var code = request.QrCode.Trim().ToUpperInvariant();
        var order = await db.Orders
            .Include(o => o.Items)
            .SingleOrDefaultAsync(o => o.QrClaimCode == code, cancellationToken);

        if (order is null)
        {
            return NotFound(new { message = "Código QR no válido o pedido no encontrado." });
        }

        if (order.Status == "fulfilled")
        {
            return BadRequest(new { message = "Este pedido ya fue entregado previamente." });
        }

        order.Status = "fulfilled";
        order.UpdatedAt = DateTimeOffset.UtcNow;

        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            Id = Guid.NewGuid(),
            EntityType = "order",
            EntityId = order.Id,
            Action = "order_fulfilled_at_hub",
            AfterData = JsonSerializer.Serialize(new { order.Id, code, fulfilledAt = DateTimeOffset.UtcNow })
        });

        await db.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            message = "Entrega validada con éxito.",
            order.Id,
            order.Status,
            order.PickupMethod,
            itemsDelivered = order.Items.Count
        });
    }

    public sealed record OrderItemDto(Guid VariantId, int Quantity);
    public sealed record CheckoutRequest(Guid UserId, Guid? EventId, List<OrderItemDto>? Items, string? PickupMethod, string? PaymentMethod);
    public sealed record ClaimQrRequest(string QrCode);
}
