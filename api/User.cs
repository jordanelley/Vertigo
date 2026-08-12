namespace Vetigo.Api;

public class User
{
    public int Id { get; set; }

    // The Auth0 "sub" claim - stable unique identifier for this account.
    public string Auth0Id { get; set; } = string.Empty;

    public string Nickname { get; set; } = string.Empty;

    public List<Ride> Rides { get; set; } = new();

    public List<Follow> Following { get; set; } = new();

    public List<Follow> Followers { get; set; } = new();
}
