using ScoreFoot.Data;

namespace ScoreFoot.Api;

/// <summary>
/// One player's played lines of a season added up. Missing counts are 0; rating and pass accuracy are
/// weighted averages of the lines that have them (null when none has).
/// </summary>
public sealed record SeasonTotals(
    int Appearances, int Minutes, int Goals, int Assists, int Shots, int ShotsOnTarget,
    int DribblesAttempts, int DribblesSuccess, int PenaltiesScored, int Passes, int KeyPasses, decimal? PassAccuracy,
    int Tackles, int Interceptions, int Blocks, int DuelsTotal, int DuelsWon,
    int FoulsCommitted, int FoulsDrawn, int YellowCards, int RedCards, int Saves, int GoalsConceded, decimal? Rating)
{
    public static SeasonTotals From(IReadOnlyCollection<PlayerSeasonStat> lines)
    {
        int Sum(Func<PlayerSeasonStat, int?> f) => lines.Sum(l => f(l) ?? 0);
        // Season pass accuracy is a percentage per line: weight it by the line's passes.
        var withAccuracy = lines.Where(l => l.PassAccuracy is not null && l.PassesTotal > 0).ToList();
        decimal? passAccuracy = withAccuracy.Count == 0 ? null
            : Math.Round((decimal)withAccuracy.Sum(l => l.PassAccuracy!.Value * l.PassesTotal!.Value) / withAccuracy.Sum(l => l.PassesTotal!.Value), 1);

        return new SeasonTotals(
            Sum(l => l.Appearances), Sum(l => l.Minutes), Sum(l => l.Goals), Sum(l => l.Assists),
            Sum(l => l.ShotsTotal), Sum(l => l.ShotsOnTarget), Sum(l => l.DribblesAttempts), Sum(l => l.DribblesSuccess),
            Sum(l => l.PenaltiesScored), Sum(l => l.PassesTotal), Sum(l => l.PassesKey), passAccuracy,
            Sum(l => l.Tackles), Sum(l => l.Interceptions), Sum(l => l.Blocks), Sum(l => l.DuelsTotal), Sum(l => l.DuelsWon),
            Sum(l => l.FoulsCommitted), Sum(l => l.FoulsDrawn), Sum(l => l.YellowCards), Sum(l => l.RedCards),
            Sum(l => l.Saves), Sum(l => l.GoalsConceded), PlayerPage.WeightedRating(lines));
    }

    /// <summary>Count per 90 minutes, 2 decimals.</summary>
    public decimal Per90(int count) => Minutes == 0 ? 0 : Math.Round(count * 90m / Minutes, 2);

    /// <summary>part / total as a percentage with 1 decimal, null when total is 0.</summary>
    public static decimal? Pct(int part, int total) => total == 0 ? null : Math.Round(part * 100m / total, 1);
}
