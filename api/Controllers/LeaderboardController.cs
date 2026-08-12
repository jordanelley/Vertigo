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

    // For each track: total attempts, and the top 3 users by best time, scoped to
    // everyone or just people the caller follows (plus themselves).
    [HttpGet(Name = "GetLeaderboard")]
    public async Task<ActionResult<List<TrackLeaderboard>>> Get(
        [FromQuery] string scope = "all",
        [FromHeader(Name = "X-Auth0-Id")] string? auth0Id = null)
    {
        var me = string.IsNullOrEmpty(auth0Id)
            ? null
            : await _db.Users.FirstOrDefaultAsync(u => u.Auth0Id == auth0Id);

        var myFollowingIds = me is null
            ? new HashSet<int>()
            : (await _db.Follows.Where(f => f.FollowerId == me.Id).Select(f => f.FollowingId).ToListAsync()).ToHashSet();

        var ridesQuery = _db.Rides.Include(r => r.User).AsQueryable();

        if (scope == "following")
        {
            if (me is null) return Unauthorized();
            var scopeIds = new HashSet<int>(myFollowingIds) { me.Id };
            ridesQuery = ridesQuery.Where(r => r.UserId != null && scopeIds.Contains(r.UserId.Value));
        }

        var rides = await ridesQuery.ToListAsync();

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
                    .Select(r => new LeaderboardEntry
                    {
                        UserId = r.User!.Id,
                        Name = r.User!.Nickname,
                        Time = r.Time,
                        IsSelf = me is not null && r.User!.Id == me.Id,
                        IsFollowing = myFollowingIds.Contains(r.User!.Id),
                    })
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
    public int UserId { get; set; }

    public string Name { get; set; } = string.Empty;

    public double Time { get; set; }

    public bool IsSelf { get; set; }

    public bool IsFollowing { get; set; }
}
