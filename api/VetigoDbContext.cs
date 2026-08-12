using Microsoft.EntityFrameworkCore;

namespace Vetigo.Api;

public class VetigoDbContext : DbContext
{
    public VetigoDbContext(DbContextOptions<VetigoDbContext> options) : base(options)
    {
    }

    public DbSet<Ride> Rides => Set<Ride>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Follow> Follows => Set<Follow>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Follow>()
            .HasOne(f => f.Follower)
            .WithMany(u => u.Following)
            .HasForeignKey(f => f.FollowerId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Follow>()
            .HasOne(f => f.FollowingUser)
            .WithMany(u => u.Followers)
            .HasForeignKey(f => f.FollowingId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Follow>()
            .HasIndex(f => new { f.FollowerId, f.FollowingId })
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Auth0Id)
            .IsUnique();
    }
}
