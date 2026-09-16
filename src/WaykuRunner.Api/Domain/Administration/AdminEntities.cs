using NetTopologySuite.Geometries;

namespace WaykuRunner.Api.Domain.Administration;

public sealed class AppUser
{
    public Guid Id { get; set; }
    public Guid? AuthSubject { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Status { get; set; } = "active";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public RunnerProfile? Profile { get; set; }
}

public sealed class RunnerProfile
{
    public Guid UserId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string City { get; set; } = "Quito";
    public string ProfileVisibility { get; set; } = "community";
    public AppUser? User { get; set; }
}

public sealed class TerritoryZone
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = "draft";
    public Guid? CurrentPublishedVersionId { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class TerritoryZoneVersion
{
    public Guid Id { get; set; }
    public Guid ZoneId { get; set; }
    public int VersionNumber { get; set; }
    public MultiPolygon Boundary { get; set; } = default!;
    public string Status { get; set; } = "draft";
    public DateTimeOffset? PublishedAt { get; set; }
    public Guid? CreatedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class OfficialRoute
{
    public Guid Id { get; set; }
    public Guid ZoneId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public LineString Path { get; set; } = default!;
    public int DistanceMeters { get; set; }
    public string MinLevelCode { get; set; } = "inicio";
    public int CorridorToleranceMeters { get; set; } = 25;
    public string Status { get; set; } = "draft";
    public Guid? CreatedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class Season
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTimeOffset StartsAt { get; set; }
    public DateTimeOffset EndsAt { get; set; }
    public string Status { get; set; } = "draft";
}

public sealed class RunnerEvent
{
    public Guid Id { get; set; }
    public Guid? SeasonId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string EventType { get; set; } = "race";
    public DateTimeOffset StartsAt { get; set; }
    public DateTimeOffset EndsAt { get; set; }
    public DateTimeOffset? RegistrationOpensAt { get; set; }
    public DateTimeOffset? RegistrationClosesAt { get; set; }
    public int? Capacity { get; set; }
    public decimal? PublicPrice { get; set; }
    public decimal MemberDiscountPercent { get; set; }
    public string Status { get; set; } = "draft";
    public Guid? CreatedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class Subscription
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid PlanId { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string? ProviderReference { get; set; }
    public string Status { get; set; } = "active";
    public DateTimeOffset StartsAt { get; set; }
    public DateTimeOffset EndsAt { get; set; }
    public DateTimeOffset GraceEndsAt { get; set; }
    public DateTimeOffset? CancelledAt { get; set; }
}

public sealed class AdminUserDirectoryItem
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string AccountStatus { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? City { get; set; }
    public string? ProfileVisibility { get; set; }
    public string MembershipState { get; set; } = "community";
    public bool EligibleForGroupCompetition { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class AdminAuditLog
{
    public Guid Id { get; set; }
    public Guid? ActorUserId { get; set; }
    public string EntityType { get; set; } = string.Empty;
    public Guid EntityId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? BeforeData { get; set; }
    public string? AfterData { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class HubService
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string ServiceType { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int DurationMinutes { get; set; }
    public decimal Price { get; set; }
    public decimal MemberDiscountPercent { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class HubSpecialist
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Specialty { get; set; } = string.Empty;
    public string? LicenseNumber { get; set; }
    public string? Bio { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public AppUser? User { get; set; }
}

public sealed class HubAppointment
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid SpecialistId { get; set; }
    public Guid ServiceId { get; set; }
    public DateTimeOffset ScheduledAt { get; set; }
    public int DurationMinutes { get; set; }
    public string Status { get; set; } = "scheduled";
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public AppUser? User { get; set; }
    public HubSpecialist? Specialist { get; set; }
    public HubService? Service { get; set; }
}

public sealed class HubAgendaItem
{
    public Guid AppointmentId { get; set; }
    public DateTimeOffset ScheduledAt { get; set; }
    public int DurationMinutes { get; set; }
    public string Status { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public string ServiceType { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? AthleteName { get; set; }
    public string SpecialistSpecialty { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class Product
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal BasePrice { get; set; }
    public decimal MemberDiscountPercent { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public List<ProductVariant> Variants { get; set; } = [];
}

public sealed class ProductVariant
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Size { get; set; } = "UNICA";
    public string Color { get; set; } = "Oficial";
    public decimal AdditionalPrice { get; set; }
    public bool IsActive { get; set; } = true;
    public Product? Product { get; set; }
    public InventoryItem? Inventory { get; set; }
}

public sealed class InventoryItem
{
    public Guid Id { get; set; }
    public Guid VariantId { get; set; }
    public string Location { get; set; } = "sede_norte_quito";
    public int StockQuantity { get; set; }
    public int ReservedQuantity { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public ProductVariant? Variant { get; set; }
}

public sealed class StoreCatalogItem
{
    public Guid ProductId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal BasePrice { get; set; }
    public decimal MemberDiscountPercent { get; set; }
    public Guid VariantId { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string Size { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public decimal FinalPrice { get; set; }
    public int StockAvailable { get; set; }
}

public sealed class Order
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid? EventId { get; set; }
    public string Status { get; set; } = "pending";
    public decimal TotalAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal NetAmount { get; set; }
    public string PickupMethod { get; set; } = "hub_pickup";
    public string QrClaimCode { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public AppUser? User { get; set; }
    public RunnerEvent? Event { get; set; }
    public List<OrderItem> Items { get; set; } = [];
    public List<Payment> Payments { get; set; } = [];
}

public sealed class OrderItem
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public string ItemType { get; set; } = string.Empty;
    public Guid? ReferenceId { get; set; }
    public Guid? VariantId { get; set; }
    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal Subtotal { get; set; }
    public Order? Order { get; set; }
    public ProductVariant? Variant { get; set; }
}

public sealed class Payment
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string Provider { get; set; } = "local";
    public string? ProviderTransactionId { get; set; }
    public decimal Amount { get; set; }
    public string Status { get; set; } = "approved";
    public DateTimeOffset? PaidAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public Order? Order { get; set; }
}

