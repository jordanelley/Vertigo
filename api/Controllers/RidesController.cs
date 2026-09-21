using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Vetigo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RidesController : ControllerBase
{
    private readonly VetigoDbContext _db;

    public RidesController(VetigoDbContext db)
    {
        _db = db;
    }

    [HttpGet(Name = "GetRides")]
    public async Task<IEnumerable<Ride>> Get()
    {
        return await _db.Rides.ToListAsync();
    }

    [HttpPost(Name = "CreateRide")]
    public async Task<ActionResult<Ride>> Post(
        CreateRideRequest request,
        [FromHeader(Name = "X-Auth0-Id")] string? auth0Id)
    {
        if (string.IsNullOrEmpty(auth0Id)) return Unauthorized();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Auth0Id == auth0Id);
        if (user is null) return Unauthorized();

        var ride = new Ride
        {
            RideName = request.RideName,
            Distance = request.Distance,
            Time = request.Time,
            UserId = user.Id,
        };
        _db.Rides.Add(ride);
        await _db.SaveChangesAsync();

        // EF's relationship fixup wires ride.User <-> user.Rides once both are tracked in the
        // same context, which sends the JSON serializer into an infinite ride->user->rides->... cycle.
        ride.User = null;
        return ride;
    }

    [HttpDelete("{id}", Name = "DeleteRide")]
    public async Task<IActionResult> Delete(int id)
    {
        var ride = await _db.Rides.FindAsync(id);
        if (ride is null)
        {
            return NotFound();
        }

        _db.Rides.Remove(ride);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

public class CreateRideRequest
{
    public string RideName { get; set; } = string.Empty;

    public double Distance { get; set; }

    public double Time { get; set; }
}
