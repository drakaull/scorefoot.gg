namespace ScoreFoot.Sync;

/// <summary>Bound from the "Sync" section of appsettings.json; any value can be overridden with env vars like Sync__DailyBudget.</summary>
public sealed class SyncOptions
{
    public string BaseUrl { get; set; } = "https://v3.football.api-sports.io/";
    public int[] Leagues { get; set; } = [];
    public int[] Seasons { get; set; } = [];
    public int DailyBudget { get; set; }
    public int MinDelayMs { get; set; }
    public int FixtureBatchSize { get; set; } = 20;
    public int[] RetryDelaysSeconds { get; set; } = [];
    public string ImagesPath { get; set; } = "images";
}
