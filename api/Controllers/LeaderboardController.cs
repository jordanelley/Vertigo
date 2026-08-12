using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Vetigo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LeaderboardController : ControllerBase
{
    private static readonly Regex AttemptSuffix = new(@"\s#\d+$", RegexOptions.Compiled);

    private readonly VetigoDbContext _db;

    public LeaderboardController(VetigoDbContext db)
    {
        _db = db;
    }

    // For each track: total attempts across everyone, and the top 3 users by best time.
    // Tracks are ordered most-attempted first.
    [HttpGet(Name = "GetLeaderboard")]
    public async Task<ActionResult<List<TrackLeaderboard>>> Get()
    {
        var rides = await _db.Rides.Include(r => r.User).ToListAsync();

        var result = rides
            .Select(r => new
            {
                TrailName = AttemptSuffix.Replace(r.RideName, string.Empty),
                r.Time,
                r.User,
            })
            .GroupBy(r => r.TrailName)
            .Select(trailGroup => new TrackLeaderboard
            {
                TrailName = trailGroup.Key,
                TotalAttempts = trailGroup.Count(),
                TopUsers = trailGroup
                    .Where(r => r.User is not null)
                    .GroupBy(r => r.User!.Id)
                    .Select(userGroup => userGroup.OrderBy(r => r.Time).First())
                    .OrderBy(r => r.Time)
                    .Take(3)
                    .Select(r => new LeaderboardEntry { Name = r.User!.Nickname, Time = r.Time })
                    .ToList(),
            })
            .OrderByDescending(t => t.TotalAttempts)
            .ToList();

        return Ok(result);
    }
}

public class TrackLeaderboard
{
    public string TrailName { get; set; } = string.Empty;

    public int TotalAttempts { get; set; }

    public List<LeaderboardEntry> TopUsers { get; set; } = new();
}

public class LeaderboardEntry
{
    public string Name { get; set; } = string.Empty;

    public double Time { get; set; }
}
