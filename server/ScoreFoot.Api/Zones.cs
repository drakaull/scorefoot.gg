namespace ScoreFoot.Api;

/// <summary>Groups the API's standing descriptions (about 25 labels) into the zones the table colours.</summary>
public static class Zones
{
    public static string? FromDescription(string? d)
    {
        if (string.IsNullOrEmpty(d)) return null;
        if (d.Contains("Champions League")) return "ucl";
        // Before Europa League: "Europa Conference League" is the Conference League.
        if (d.Contains("Conference League")) return "uecl";
        if (d.Contains("Europa League")) return "uel";
        if (d.Contains("Relegation Playoffs") || d.Contains("(Relegation)") || d.Contains("Play Offs")) return "playoff";
        if (d.StartsWith("Relegation")) return "relegation";
        return null;
    }
}
