using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Vetigo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly VetigoDbContext _db;

    public UsersController(VetigoDbContext db)
    {
        _db = db;
    }

    private async Task<User?> GetCurrentUserAsync(string? auth0Id)
    {
        if (string.IsNullOrEmpty(auth0Id)) return null;
        return await _db.Users.FirstOrDefaultAsync(u => u.Auth0Id == auth0Id);
    }

    // Called once after login so the app has a User row to attach rides/follows to.
    [HttpPost("me", Name = "SyncCurrentUser")]
    public async Task<ActionResult<User>> SyncMe(
        SyncUserRequest request,
        [FromHeader(Name = "X-Auth0-Id")] string? auth0Id)
    {
        if (string.IsNullOrEmpty(auth0Id)) return Unauthorized();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Auth0Id == auth0Id);
        if (user is null)
        {
            user = new User { Auth0Id = auth0Id, Nickname = request.Nickname };
            _db.Users.Add(user);
        }
        else
        {
            user.Nickname = request.Nickname;
        }

        await _db.SaveChangesAsync();
        return user;
    }

    [HttpPost("{id}/follow", Name = "FollowUser")]
    public async Task<IActionResult> Follow(int id, [FromHeader(Name = "X-Auth0-Id")] string? auth0Id)
    {
        var me = await GetCurrentUserAsync(auth0Id);
        if (me is null) return Unauthorized();
        if (me.Id == id) return BadRequest("Cannot follow yourself.");

        var alreadyFollowing = await _db.Follows
            .AnyAsync(f => f.FollowerId == me.Id && f.FollowingId == id);

        if (!alreadyFollowing)
        {
            _db.Follows.Add(new Follow { FollowerId = me.Id, FollowingId = id });
            await _db.SaveChangesAsync();
        }

        return NoContent();
    }

    [HttpDelete("{id}/follow", Name = "UnfollowUser")]
    public async Task<IActionResult> Unfollow(int id, [FromHeader(Name = "X-Auth0-Id")] string? auth0Id)
    {
        var me = await GetCurrentUserAsync(auth0Id);
        if (me is null) return Unauthorized();

        var follow = await _db.Follows
            .FirstOrDefaultAsync(f => f.FollowerId == me.Id && f.FollowingId == id);

        if (follow is not null)
        {
            _db.Follows.Remove(follow);
            await _db.SaveChangesAsync();
        }

        return NoContent();
    }
}

public class SyncUserRequest
{
    public string Nickname { get; set; } = string.Empty;
}
