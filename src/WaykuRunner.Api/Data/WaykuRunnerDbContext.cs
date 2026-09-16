using Microsoft.EntityFrameworkCore;
using WaykuRunner.Api.Domain.Administration;

namespace WaykuRunner.Api.Data;

public sealed class WaykuRunnerDbContext(DbContextOptions<WaykuRunnerDbContext> options) : DbContext(options)
{
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<RunnerProfile> RunnerProfiles => Set<RunnerProfile>();
    public DbSet<TerritoryZone> TerritoryZones => Set<TerritoryZone>();
    public DbSet<TerritoryZoneVersion> TerritoryZoneVersions => Set<TerritoryZoneVersion>();
    public DbSet<OfficialRoute> OfficialRoutes => Set<OfficialRoute>();
    public DbSet<Season> Seasons => Set<Season>();
    public DbSet<RunnerEvent> Events => Set<RunnerEvent>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<AdminUserDirectoryItem> AdminUserDirectory => Set<AdminUserDirectoryItem>();
    public DbSet<AdminAuditLog> AdminAuditLogs => Set<AdminAuditLog>();

    public DbSet<HubService> HubServices => Set<HubService>();
    public DbSet<HubSpecialist> HubSpecialists => Set<HubSpecialist>();
    public DbSet<HubAppointment> HubAppointments => Set<HubAppointment>();
    public DbSet<HubAgendaItem> HubAgenda => Set<HubAgendaItem>();

    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();
    public DbSet<InventoryItem> Inventory => Set<InventoryItem>();
    public DbSet<StoreCatalogItem> StoreCatalog => Set<StoreCatalogItem>();

    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Payment> Payments => Set<Payment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("app");

        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(user => user.Id);
            entity.Property(user => user.Email).HasColumnName("email");
            entity.Property(user => user.Status).HasColumnName("status");
            entity.HasOne(user => user.Profile)
                .WithOne(profile => profile.User)
                .HasForeignKey<RunnerProfile>(profile => profile.UserId);
        });

        modelBuilder.Entity<RunnerProfile>(entity =>
        {
            entity.ToTable("runner_profiles");
            entity.HasKey(profile => profile.UserId);
            entity.Property(profile => profile.DisplayName).HasColumnName("display_name");
            entity.Property(profile => profile.AvatarUrl).HasColumnName("avatar_url");
            entity.Property(profile => profile.ProfileVisibility).HasColumnName("profile_visibility");
        });

        modelBuilder.Entity<TerritoryZone>(entity =>
        {
            entity.ToTable("territory_zones");
            entity.HasKey(zone => zone.Id);
            entity.Property(zone => zone.CurrentPublishedVersionId).HasColumnName("current_published_version_id");
            entity.Property(zone => zone.CreatedBy).HasColumnName("created_by");
            entity.Property(zone => zone.CreatedAt).HasColumnName("created_at");
            entity.Property(zone => zone.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<TerritoryZoneVersion>(entity =>
        {
            entity.ToTable("territory_zone_versions");
            entity.HasKey(version => version.Id);
            entity.Property(version => version.ZoneId).HasColumnName("zone_id");
            entity.Property(version => version.VersionNumber).HasColumnName("version_number");
            entity.Property(version => version.Boundary).HasColumnName("boundary").HasColumnType("geometry(MultiPolygon,4326)");
            entity.Property(version => version.PublishedAt).HasColumnName("published_at");
            entity.Property(version => version.CreatedBy).HasColumnName("created_by");
            entity.Property(version => version.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<OfficialRoute>(entity =>
        {
            entity.ToTable("official_routes");
            entity.HasKey(route => route.Id);
            entity.Property(route => route.ZoneId).HasColumnName("zone_id");
            entity.Property(route => route.Path).HasColumnName("path").HasColumnType("geography(LineString,4326)");
            entity.Property(route => route.DistanceMeters).HasColumnName("distance_meters");
            entity.Property(route => route.MinLevelCode).HasColumnName("min_level_code");
            entity.Property(route => route.CorridorToleranceMeters).HasColumnName("corridor_tolerance_meters");
            entity.Property(route => route.CreatedBy).HasColumnName("created_by");
            entity.Property(route => route.CreatedAt).HasColumnName("created_at");
            entity.Property(route => route.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<Season>(entity =>
        {
            entity.ToTable("seasons");
            entity.HasKey(season => season.Id);
            entity.Property(season => season.StartsAt).HasColumnName("starts_at");
            entity.Property(season => season.EndsAt).HasColumnName("ends_at");
        });

        modelBuilder.Entity<RunnerEvent>(entity =>
        {
            entity.ToTable("events");
            entity.HasKey(runnerEvent => runnerEvent.Id);
            entity.Property(runnerEvent => runnerEvent.SeasonId).HasColumnName("season_id");
            entity.Property(runnerEvent => runnerEvent.EventType).HasColumnName("event_type");
            entity.Property(runnerEvent => runnerEvent.StartsAt).HasColumnName("starts_at");
            entity.Property(runnerEvent => runnerEvent.EndsAt).HasColumnName("ends_at");
            entity.Property(runnerEvent => runnerEvent.RegistrationOpensAt).HasColumnName("registration_opens_at");
            entity.Property(runnerEvent => runnerEvent.RegistrationClosesAt).HasColumnName("registration_closes_at");
            entity.Property(runnerEvent => runnerEvent.PublicPrice).HasColumnName("public_price");
            entity.Property(runnerEvent => runnerEvent.MemberDiscountPercent).HasColumnName("member_discount_percent");
            entity.Property(runnerEvent => runnerEvent.CreatedBy).HasColumnName("created_by");
            entity.Property(runnerEvent => runnerEvent.CreatedAt).HasColumnName("created_at");
            entity.Property(runnerEvent => runnerEvent.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<Subscription>(entity =>
        {
            entity.ToTable("subscriptions");
            entity.HasKey(subscription => subscription.Id);
            entity.Property(subscription => subscription.UserId).HasColumnName("user_id");
            entity.Property(subscription => subscription.PlanId).HasColumnName("plan_id");
            entity.Property(subscription => subscription.ProviderReference).HasColumnName("provider_reference");
            entity.Property(subscription => subscription.StartsAt).HasColumnName("starts_at");
            entity.Property(subscription => subscription.EndsAt).HasColumnName("ends_at");
            entity.Property(subscription => subscription.GraceEndsAt).HasColumnName("grace_ends_at");
            entity.Property(subscription => subscription.CancelledAt).HasColumnName("cancelled_at");
        });

        modelBuilder.Entity<AdminUserDirectoryItem>(entity =>
        {
            entity.ToView("admin_user_directory");
            entity.HasNoKey();
            entity.Property(item => item.Id).HasColumnName("id");
            entity.Property(item => item.AccountStatus).HasColumnName("account_status");
            entity.Property(item => item.DisplayName).HasColumnName("display_name");
            entity.Property(item => item.ProfileVisibility).HasColumnName("profile_visibility");
            entity.Property(item => item.MembershipState).HasColumnName("membership_state");
            entity.Property(item => item.EligibleForGroupCompetition).HasColumnName("eligible_for_group_competition");
            entity.Property(item => item.CreatedAt).HasColumnName("created_at");
            entity.Property(item => item.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<AdminAuditLog>(entity =>
        {
            entity.ToTable("admin_audit_logs");
            entity.HasKey(log => log.Id);
            entity.Property(log => log.ActorUserId).HasColumnName("actor_user_id");
            entity.Property(log => log.EntityType).HasColumnName("entity_type");
            entity.Property(log => log.EntityId).HasColumnName("entity_id");
            entity.Property(log => log.BeforeData).HasColumnName("before_data").HasColumnType("jsonb");
            entity.Property(log => log.AfterData).HasColumnName("after_data").HasColumnType("jsonb");
            entity.Property(log => log.CreatedAt).HasColumnName("created_at");
        });

        // Hub (Centro Físico)
        modelBuilder.Entity<HubService>(entity =>
        {
            entity.ToTable("hub_services");
            entity.HasKey(s => s.Id);
        });

        modelBuilder.Entity<HubSpecialist>(entity =>
        {
            entity.ToTable("hub_specialists");
            entity.HasKey(s => s.Id);
            entity.HasOne(s => s.User).WithMany().HasForeignKey(s => s.UserId);
        });

        modelBuilder.Entity<HubAppointment>(entity =>
        {
            entity.ToTable("hub_appointments");
            entity.HasKey(a => a.Id);
            entity.HasOne(a => a.User).WithMany().HasForeignKey(a => a.UserId);
            entity.HasOne(a => a.Specialist).WithMany().HasForeignKey(a => a.SpecialistId);
            entity.HasOne(a => a.Service).WithMany().HasForeignKey(a => a.ServiceId);
        });

        modelBuilder.Entity<HubAgendaItem>(entity =>
        {
            entity.ToView("hub_agenda");
            entity.HasNoKey();
        });

        // Store & Merchandising
        modelBuilder.Entity<Product>(entity =>
        {
            entity.ToTable("products");
            entity.HasKey(p => p.Id);
            entity.HasMany(p => p.Variants).WithOne(v => v.Product).HasForeignKey(v => v.ProductId);
        });

        modelBuilder.Entity<ProductVariant>(entity =>
        {
            entity.ToTable("product_variants");
            entity.HasKey(v => v.Id);
            entity.HasOne(v => v.Inventory).WithOne(i => i.Variant).HasForeignKey<InventoryItem>(i => i.VariantId);
        });

        modelBuilder.Entity<InventoryItem>(entity =>
        {
            entity.ToTable("inventory");
            entity.HasKey(i => i.Id);
        });

        modelBuilder.Entity<StoreCatalogItem>(entity =>
        {
            entity.ToView("store_catalog");
            entity.HasNoKey();
        });

        // Órdenes y Checkout
        modelBuilder.Entity<Order>(entity =>
        {
            entity.ToTable("orders");
            entity.HasKey(o => o.Id);
            entity.HasOne(o => o.User).WithMany().HasForeignKey(o => o.UserId);
            entity.HasOne(o => o.Event).WithMany().HasForeignKey(o => o.EventId);
            entity.HasMany(o => o.Items).WithOne(i => i.Order).HasForeignKey(i => i.OrderId);
            entity.HasMany(o => o.Payments).WithOne(p => p.Order).HasForeignKey(p => p.OrderId);
        });

        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.ToTable("order_items");
            entity.HasKey(i => i.Id);
            entity.HasOne(i => i.Variant).WithMany().HasForeignKey(i => i.VariantId);
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.ToTable("payments");
            entity.HasKey(p => p.Id);
        });
    }
}
