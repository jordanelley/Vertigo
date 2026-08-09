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
}
