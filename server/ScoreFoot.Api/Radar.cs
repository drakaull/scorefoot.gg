namespace ScoreFoot.Api;

public sealed record RadarAxis(string Key, decimal? Value, int? Percentile);
public sealed record RadarResult(int MinMinutes, bool Eligible, int GroupSize, IReadOnlyList<RadarAxis> Axes);

/// <summary>Percentiles against players of the same position and season with at least <see cref="MinMinutes"/> minutes.</summary>
public static class Radar
{
    public const int MinMinutes = 900;

    private sealed record Axis(string Key, Func<SeasonTotals, decimal?> Value, bool LowerIsBetter = false);

    private static readonly Axis Rating = new("rating", t => t.Rating);
    private static readonly Axis PassAccuracy = new("passAccuracy", t => t.PassAccuracy);
    private static readonly Axis DuelsWonPct = new("duelsWonPct", t => SeasonTotals.Pct(t.DuelsWon, t.DuelsTotal));
    private static readonly Axis KeyPasses = new("keyPasses", t => t.Per90(t.KeyPasses));
    private static readonly Axis Dribbles = new("dribbles", t => t.Per90(t.DribblesSuccess));

    private static readonly Dictionary<string, Axis[]> AxesByPosition = new()
    {
        ["Attacker"] = [new("goals", t => t.Per90(t.Goals)), new("shotsOnTarget", t => t.Per90(t.ShotsOnTarget)), KeyPasses, Dribbles, DuelsWonPct, Rating],
        ["Midfielder"] = [KeyPasses, new("passes", t => t.Per90(t.Passes)), PassAccuracy,
                          new("tacklesInterceptions", t => t.Per90(t.Tackles + t.Interceptions)), Dribbles, Rating],
        ["Defender"] = [new("tackles", t => t.Per90(t.Tackles)), new("interceptions", t => t.Per90(t.Interceptions)),
                        new("blocks", t => t.Per90(t.Blocks)), DuelsWonPct, PassAccuracy, Rating],
        ["Goalkeeper"] = [new("saves", t => t.Per90(t.Saves)), new("savePct", t => SeasonTotals.Pct(t.Saves, t.Saves + t.GoalsConceded)),
                          new("goalsConceded", t => t.Per90(t.GoalsConceded), LowerIsBetter: true), PassAccuracy, Rating],
    };

    /// <param name="group">Every player of the same position and season with at least <see cref="MinMinutes"/> minutes.</param>
    public static RadarResult Build(string? position, SeasonTotals player, IReadOnlyList<SeasonTotals> group)
    {
        if (player.Minutes < MinMinutes || position is null || !AxesByPosition.TryGetValue(position, out var axes))
            return new RadarResult(MinMinutes, false, group.Count, []);

        return new RadarResult(MinMinutes, true, group.Count, axes.Select(axis =>
        {
            var value = axis.Value(player);
            if (value is not { } v) return new RadarAxis(axis.Key, null, null);
            var ranked = group.Select(axis.Value).OfType<decimal>().ToList();
            // percent_rank: share of the ranked players (him included) this one beats; ties share a value.
            var beaten = ranked.Count(o => axis.LowerIsBetter ? o > v : o < v);
            var percentile = ranked.Count <= 1 ? 100 : (int)Math.Round(100m * beaten / (ranked.Count - 1), MidpointRounding.AwayFromZero);
            return new RadarAxis(axis.Key, v, percentile);
        }).ToList());
    }
}
