using Microsoft.EntityFrameworkCore;

namespace Vetigo.Api;

public class VetigoDbContext : DbContext
{
    public VetigoDbContext(DbContextOptions<VetigoDbContext> options) : base(options)
    {
    }

    public DbSet<Ride> Rides => Set<Ride>();
    public DbSet<User> Users => Set<User>();
}
