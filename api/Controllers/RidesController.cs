using Microsoft.AspNetCore.Mvc;

namespace Vetigo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RidesController : ControllerBase
{
    private static readonly List<Ride> Rides = new()
    {
        new Ride { Id = 1, RideName = "Sunday Loop", Distance = 18.4 },
        new Ride { Id = 2, RideName = "Downhill Run", Distance = 6.2 },
    };

    [HttpGet(Name = "GetRides")]
    public IEnumerable<Ride> Get()
    {
        return Rides;
    }

    [HttpPost(Name = "CreateRide")]
    public ActionResult<Ride> Post(CreateRideRequest request)
    {
        var ride = new Ride
        {
            Id = Rides.Count == 0 ? 1 : Rides.Max(r => r.Id) + 1,
            RideName = request.RideName,
            Distance = request.Distance,
        };
        Rides.Add(ride);
        return ride;
    }
}

public class CreateRideRequest
{
    public string RideName { get; set; } = string.Empty;

    public double Distance { get; set; }
}
