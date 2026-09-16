using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WaykuRunner.Api.Data;
using WaykuRunner.Api.Domain.Administration;

namespace WaykuRunner.Api.Controllers.Admin;

[ApiController]
[Authorize(Roles = "superadmin,operations,events")]
[Route("api/admin/store")]
public sealed class AdminStoreController(WaykuRunnerDbContext db) : ControllerBase
{
    [HttpGet("catalog")]
    public async Task<ActionResult> GetCatalog(CancellationToken cancellationToken)
    {
        var catalog = await db.StoreCatalog
            .AsNoTracking()
            .OrderBy(item => item.Category)
            .ThenBy(item => item.Name)
            .ToListAsync(cancellationToken);

        return Ok(catalog);
    }

    [HttpPost("products")]
    public async Task<ActionResult> CreateProduct(CreateProductRequest request, CancellationToken cancellationToken)
    {
        var code = request.Code.Trim().ToLowerInvariant();
        var exists = await db.Products.AnyAsync(p => p.Code == code, cancellationToken);
        if (exists)
        {
            return Conflict(new { message = "Ya existe un producto con ese código." });
        }

        var product = new Product
        {
            Id = Guid.NewGuid(),
            Code = code,
            Name = request.Name.Trim(),
            Category = request.Category.Trim(),
            Description = request.Description?.Trim(),
            BasePrice = request.BasePrice,
            MemberDiscountPercent = request.MemberDiscountPercent,
            IsActive = true,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        foreach (var variantReq in request.Variants)
        {
            var variant = new ProductVariant
            {
                Id = Guid.NewGuid(),
                ProductId = product.Id,
                Sku = variantReq.Sku.Trim().ToUpperInvariant(),
                Size = variantReq.Size.Trim().ToUpperInvariant(),
                Color = variantReq.Color.Trim(),
                AdditionalPrice = variantReq.AdditionalPrice,
                IsActive = true
            };

            var inventory = new InventoryItem
            {
                Id = Guid.NewGuid(),
                VariantId = variant.Id,
                Location = "sede_norte_quito",
                StockQuantity = variantReq.InitialStock,
                ReservedQuantity = 0,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            variant.Inventory = inventory;
            product.Variants.Add(variant);
        }

        db.Products.Add(product);
        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            Id = Guid.NewGuid(),
            EntityType = "product",
            EntityId = product.Id,
            Action = "created_product",
            AfterData = JsonSerializer.Serialize(new { product.Code, product.Name, variants = product.Variants.Count })
        });

        await db.SaveChangesAsync(cancellationToken);

        return Ok(product);
    }

    [HttpPut("inventory")]
    public async Task<ActionResult> UpdateStock(UpdateStockRequest request, CancellationToken cancellationToken)
    {
        var inventory = await db.Inventory
            .SingleOrDefaultAsync(i => i.VariantId == request.VariantId && i.Location == request.Location, cancellationToken);

        if (inventory is null)
        {
            inventory = new InventoryItem
            {
                Id = Guid.NewGuid(),
                VariantId = request.VariantId,
                Location = request.Location,
                StockQuantity = request.NewStock,
                ReservedQuantity = 0,
                UpdatedAt = DateTimeOffset.UtcNow
            };
            db.Inventory.Add(inventory);
        }
        else
        {
            inventory.StockQuantity = request.NewStock;
            inventory.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync(cancellationToken);

        return Ok(new { inventory.VariantId, inventory.Location, inventory.StockQuantity });
    }

    [HttpPut("products/{id:guid}")]
    public async Task<ActionResult> UpdateProduct(Guid id, UpdateProductRequest request, CancellationToken cancellationToken)
    {
        var product = await db.Products.SingleOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (product is null)
        {
            return NotFound(new { message = "Producto no encontrado." });
        }

        product.Name = request.Name.Trim();
        product.Category = request.Category.Trim();
        product.Description = request.Description?.Trim();
        product.BasePrice = request.BasePrice;
        product.MemberDiscountPercent = request.MemberDiscountPercent;
        product.UpdatedAt = DateTimeOffset.UtcNow;

        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            Id = Guid.NewGuid(),
            EntityType = "product",
            EntityId = product.Id,
            Action = "updated_product",
            AfterData = JsonSerializer.Serialize(new { product.Name, product.BasePrice, product.MemberDiscountPercent })
        });

        await db.SaveChangesAsync(cancellationToken);
        return Ok(product);
    }

    [HttpDelete("products/{id:guid}")]
    public async Task<ActionResult> DeactivateProduct(Guid id, CancellationToken cancellationToken)
    {
        var product = await db.Products.SingleOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (product is null)
        {
            return NotFound(new { message = "Producto no encontrado." });
        }

        product.IsActive = !product.IsActive;
        product.UpdatedAt = DateTimeOffset.UtcNow;

        db.AdminAuditLogs.Add(new AdminAuditLog
        {
            Id = Guid.NewGuid(),
            EntityType = "product",
            EntityId = product.Id,
            Action = product.IsActive ? "activated_product" : "deactivated_product",
            AfterData = JsonSerializer.Serialize(new { product.Code, product.IsActive })
        });

        await db.SaveChangesAsync(cancellationToken);
        return Ok(new { product.Id, product.Code, product.IsActive });
    }

    public sealed record CreateVariantRequest(string Sku, string Size, string Color, decimal AdditionalPrice, int InitialStock);
    public sealed record CreateProductRequest(string Code, string Name, string Category, string? Description, decimal BasePrice, decimal MemberDiscountPercent, List<CreateVariantRequest> Variants);
    public sealed record UpdateProductRequest(string Name, string Category, string? Description, decimal BasePrice, decimal MemberDiscountPercent);
    public sealed record UpdateStockRequest(Guid VariantId, string Location, int NewStock);
}
