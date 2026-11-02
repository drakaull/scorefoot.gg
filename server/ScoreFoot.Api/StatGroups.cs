namespace ScoreFoot.Api;

/// <summary>One stat: season total and per-90 value. Percentage rows (key ending in "Pct" or "Accuracy") have no per-90.</summary>
public sealed record StatRow(string Key, decimal? Total, decimal? Per90, int? OutOf = null, decimal? Pct = null);
public sealed record StatGroup(string Group, IReadOnlyList<StatRow> Rows);

public static class StatGroups
{
    public static IReadOnlyList<StatGroup> Build(string? position, SeasonTotals t)
    {
        StatRow Count(string key, int total) => new(key, total, t.Per90(total));

        List<StatGroup> groups =
        [
            new("attack", [Count("goals", t.Goals), Count("assists", t.Assists), Count("shots", t.Shots),
                Count("shotsOnTarget", t.ShotsOnTarget), Count("dribbles", t.DribblesSuccess) with { OutOf = t.DribblesAttempts },
                Count("penaltiesScored", t.PenaltiesScored)]),
            new("passing", [Count("passes", t.Passes), Count("keyPasses", t.KeyPasses), new("passAccuracy", t.PassAccuracy, null)]),
            new("defence", [Count("tackles", t.Tackles), Count("interceptions", t.Interceptions), Count("blocks", t.Blocks),
                Count("duelsWon", t.DuelsWon) with { Pct = SeasonTotals.Pct(t.DuelsWon, t.DuelsTotal) }]),
            new("discipline", [Count("foulsCommitted", t.FoulsCommitted), Count("foulsDrawn", t.FoulsDrawn),
                Count("yellowCards", t.YellowCards), Count("redCards", t.RedCards)]),
        ];
        if (position == "Goalkeeper")
            groups.Insert(0, new("goalkeeping", [Count("saves", t.Saves), Count("goalsConceded", t.GoalsConceded),
                new("savePct", SeasonTotals.Pct(t.Saves, t.Saves + t.GoalsConceded), null)]));
        return groups;
    }
}
