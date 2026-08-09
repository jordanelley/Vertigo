using Microsoft.EntityFrameworkCore;

namespace Vetigo.Api;

public class VetigoDbContext : DbContext
{
    public VetigoDbContext(DbContextOptions<VetigoDbContext> options) : base(options)
    {
    }

    public DbSet<Ride> Rides => Set<Ride>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Ride>().HasData(
            new Ride { Id = 1, RideName = "Sunday Loop", Distance = 18.4, Time = 62 },
            new Ride { Id = 2, RideName = "Downhill Run", Distance = 6.2, Time = 18 }
        );
    }
}
