namespace Vetigo.Api;

public class Ride
{
    public int Id { get; set; }

    public string RideName { get; set; } = string.Empty;

    public double Distance { get; set; }

    public double Time { get; set; }
}
