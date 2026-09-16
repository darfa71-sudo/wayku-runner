using System.Data;
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
    private static readonly HashSet<string> PaymentMethods = ["credit_card", "debit_card", "transfer", "cash", "qr_pay"];

    [HttpGet]
    public async Task<ActionResult> List([FromQuery] string? status, CancellationToken cancellationToken)
    {
        var query = db.Orders.AsNoTracking()
            .Include(order => order.User).ThenInclude(user => user!.Profile)
            .Include(order => order.Event)
            .Include(order => order.Items).ThenInclude(item => item.Variant)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(order => order.Status == status);

        var orders = await query.OrderByDescending(order => order.CreatedAt).Take(50)
            .Select(order => new
            {
                order.Id, order.UserId, UserEmail = order.User != null ? order.User.Email : "",
                AthleteName = order.User != null && order.User.Profile != null ? order.User.Profile.DisplayName : order.User!.Email,
                EventName = order.Event != null ? order.Event.Name : null,
                order.Status, order.TotalAmount, order.DiscountAmount, order.NetAmount,
                order.PickupMethod, order.QrClaimCode, order.CreatedAt, ItemsCount = order.Items.Count,
                Items = order.Items.Select(item => new { item.Id, item.ItemType, item.Quantity, item.UnitPrice, item.Subtotal, VariantSku = item.Variant != null ? item.Variant.Sku : null })
            }).ToListAsync(cancellationToken);

        return Ok(orders);
    }

    [HttpPost("checkout")]
    public async Task<ActionResult> Checkout(CheckoutRequest request, CancellationToken cancellationToken)
    {
        if (!request.EventId.HasValue && (request.Items is null || request.Items.Count == 0))
            return BadRequest(new { message = "El checkout necesita una inscripción o al menos un artículo." });

        var paymentMethod = request.PaymentMethod ?? "credit_card";
        if (!PaymentMethods.Contains(paymentMethod))
            return BadRequest(new { message = "Método de pago no válido." });

        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        try
        {
            var user = await db.Users.SingleOrDefaultAsync(item => item.Id == request.UserId, cancellationToken);
            if (user is null) return NotFound(new { message = "Usuario / corredor no encontrado." });

            var membership = await db.AdminUserDirectory.AsNoTracking().SingleOrDefaultAsync(item => item.Id == request.UserId, cancellationToken);
            var isMember = membership?.MembershipState is "active" or "grace";
            var orderId = Guid.NewGuid();
            var now = DateTimeOffset.UtcNow;
            decimal totalAmount = 0, discountAmount = 0;
            var orderItems = new List<OrderItem>();
            EventRegistration? registration = null;
            var reservedInventory = new List<(InventoryItem Inventory, int Quantity)>();

            if (request.EventId.HasValue)
            {
                var runnerEvent = await db.Events.SingleOrDefaultAsync(item => item.Id == request.EventId.Value, cancellationToken);
                if (runnerEvent is null) return NotFound(new { message = "Evento no encontrado." });
                if (runnerEvent.RegistrationOpensAt > now || runnerEvent.RegistrationClosesAt < now)
                    return BadRequest(new { message = "Las inscripciones para este evento no están abiertas." });
                if (await db.EventRegistrations.AnyAsync(item => item.EventId == runnerEvent.Id && item.UserId == request.UserId && (item.Status == "pending_payment" || item.Status == "confirmed"), cancellationToken))
                    return Conflict(new { message = "Este corredor ya tiene una inscripción activa." });
                if (runnerEvent.Capacity.HasValue && await db.EventRegistrations.CountAsync(item => item.EventId == runnerEvent.Id && (item.Status == "pending_payment" || item.Status == "confirmed"), cancellationToken) >= runnerEvent.Capacity.Value)
                    return Conflict(new { message = "El evento ya alcanzó su cupo." });

                var price = runnerEvent.PublicPrice ?? 0;
                var discount = isMember ? price * runnerEvent.MemberDiscountPercent / 100m : 0;
                registration = new EventRegistration { Id = Guid.NewGuid(), EventId = runnerEvent.Id, UserId = request.UserId, OrderId = orderId, Status = "pending_payment", CreatedAt = now, UpdatedAt = now };
                orderItems.Add(new OrderItem { Id = Guid.NewGuid(), OrderId = orderId, ItemType = "event_registration", ReferenceId = registration.Id, Quantity = 1, UnitPrice = price, Subtotal = price - discount });
                totalAmount += price; discountAmount += discount;
            }

            foreach (var requested in (request.Items ?? []).GroupBy(item => item.VariantId).Select(group => new OrderItemDto(group.Key, group.Sum(item => item.Quantity))))
            {
                if (requested.Quantity <= 0) return BadRequest(new { message = "La cantidad debe ser mayor que cero." });
                var variant = await db.ProductVariants.Include(item => item.Product).SingleOrDefaultAsync(item => item.Id == requested.VariantId && item.IsActive && item.Product!.IsActive, cancellationToken);
                var inventory = await db.Inventory.SingleOrDefaultAsync(item => item.VariantId == requested.VariantId && item.Location == "sede_norte_quito", cancellationToken);
                if (variant?.Product is null || inventory is null) return NotFound(new { message = "El producto solicitado no está disponible." });
                if (inventory.StockQuantity - inventory.ReservedQuantity < requested.Quantity) return Conflict(new { message = $"No hay stock suficiente para {variant.Product.Name}." });

                var unitPrice = variant.Product.BasePrice + variant.AdditionalPrice;
                var discount = isMember ? unitPrice * variant.Product.MemberDiscountPercent / 100m : 0;
                inventory.ReservedQuantity += requested.Quantity;
                inventory.UpdatedAt = now;
                reservedInventory.Add((inventory, requested.Quantity));
                orderItems.Add(new OrderItem { Id = Guid.NewGuid(), OrderId = orderId, ItemType = "merch", ReferenceId = variant.ProductId, VariantId = variant.Id, Quantity = requested.Quantity, UnitPrice = unitPrice, Subtotal = (unitPrice - discount) * requested.Quantity });
                totalAmount += unitPrice * requested.Quantity; discountAmount += discount * requested.Quantity;
            }

            var netAmount = totalAmount - discountAmount;
            var isFree = netAmount == 0;
            var order = new Order
            {
                Id = orderId, UserId = request.UserId, EventId = request.EventId,
                Status = isFree ? "paid" : "pending", TotalAmount = totalAmount, DiscountAmount = discountAmount, NetAmount = netAmount,
                PickupMethod = request.PickupMethod is "home_delivery" ? "home_delivery" : "hub_pickup",
                QrClaimCode = Convert.ToHexString(RandomNumberGenerator.GetBytes(6)), CreatedAt = now, UpdatedAt = now, Items = orderItems
            };

            if (registration is not null)
            {
                registration.Status = isFree ? "confirmed" : "pending_payment";
                db.EventRegistrations.Add(registration);
            }

            if (isFree)
            {
                foreach (var (inventory, quantity) in reservedInventory) { inventory.ReservedQuantity -= quantity; inventory.StockQuantity -= quantity; }
            }
            else
            {
                order.Payments.Add(new Payment { Id = Guid.NewGuid(), OrderId = order.Id, PaymentMethod = paymentMethod, Provider = "pending_configuration", Amount = netAmount, Status = "pending", CreatedAt = now });
            }

            db.Orders.Add(order);
            db.AdminAuditLogs.Add(new AdminAuditLog { Id = Guid.NewGuid(), EntityType = "order", EntityId = order.Id, Action = isFree ? "checkout_completed_free" : "checkout_payment_pending", AfterData = JsonSerializer.Serialize(new { order.Id, order.UserId, order.NetAmount, isMember, items = orderItems.Count }) });
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return Ok(new { order.Id, order.Status, order.TotalAmount, order.DiscountAmount, order.NetAmount, order.QrClaimCode, paymentStatus = isFree ? "not_required" : "pending", isMemberDiscountApplied = isMember });
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync(cancellationToken);
            return Conflict(new { message = "No fue posible reservar cupo o inventario. Inténtalo de nuevo." });
        }
    }

    [HttpPost("{id:guid}/confirm-payment")]
    public async Task<ActionResult> ConfirmPayment(Guid id, ConfirmPaymentRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.ProviderTransactionId)) return BadRequest(new { message = "La referencia de pago es obligatoria." });
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);
        var order = await db.Orders.Include(item => item.Items).Include(item => item.Payments).SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (order is null) return NotFound(new { message = "Pedido no encontrado." });
        var payment = order.Payments.SingleOrDefault(item => item.Status == "pending");
        if (payment is null) return Conflict(new { message = "El pedido no tiene un pago pendiente." });

        foreach (var item in order.Items.Where(item => item.ItemType == "merch"))
        {
            var inventory = await db.Inventory.SingleOrDefaultAsync(entry => entry.VariantId == item.VariantId && entry.Location == "sede_norte_quito", cancellationToken);
            if (inventory is null || inventory.ReservedQuantity < item.Quantity || inventory.StockQuantity < item.Quantity) return Conflict(new { message = "La reserva de inventario ya no es válida." });
            inventory.ReservedQuantity -= item.Quantity; inventory.StockQuantity -= item.Quantity; inventory.UpdatedAt = DateTimeOffset.UtcNow;
        }

        payment.Provider = request.Provider.Trim(); payment.ProviderTransactionId = request.ProviderTransactionId.Trim(); payment.Status = "approved"; payment.PaidAt = DateTimeOffset.UtcNow;
        order.Status = "paid"; order.UpdatedAt = DateTimeOffset.UtcNow;
        var registrations = await db.EventRegistrations.Where(item => item.OrderId == order.Id && item.Status == "pending_payment").ToListAsync(cancellationToken);
        foreach (var registration in registrations) registration.Status = "confirmed";
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return Ok(new { order.Id, OrderStatus = order.Status, PaymentStatus = payment.Status });
    }

    [HttpPost("claim")]
    public async Task<ActionResult> ClaimByQr([FromBody] ClaimQrRequest request, CancellationToken cancellationToken)
    {
        var code = request.QrCode.Trim().ToUpperInvariant();
        var order = await db.Orders.Include(item => item.Items).SingleOrDefaultAsync(item => item.QrClaimCode == code, cancellationToken);
        if (order is null) return NotFound(new { message = "Código QR no válido o pedido no encontrado." });
        if (order.Status is not ("paid" or "ready_for_pickup")) return Conflict(new { message = "El pedido aún no está pagado." });
        if (!order.Items.Any(item => item.ItemType == "merch")) return BadRequest(new { message = "Este QR corresponde a una inscripción, no a merchandising." });
        order.Status = "fulfilled"; order.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return Ok(new { message = "Entrega validada con éxito.", order.Id, order.Status, order.PickupMethod, itemsDelivered = order.Items.Count });
    }

    public sealed record OrderItemDto(Guid VariantId, int Quantity);
    public sealed record CheckoutRequest(Guid UserId, Guid? EventId, List<OrderItemDto>? Items, string? PickupMethod, string? PaymentMethod);
    public sealed record ConfirmPaymentRequest(string Provider, string ProviderTransactionId);
    public sealed record ClaimQrRequest(string QrCode);
}
