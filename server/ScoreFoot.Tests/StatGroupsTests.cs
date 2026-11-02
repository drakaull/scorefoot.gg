using ScoreFoot.Api;
using ScoreFoot.Data;

namespace ScoreFoot.Tests;

public class StatGroupsTests
{
    private static SeasonTotals Totals(params PlayerSeasonStat[] lines) => SeasonTotals.From(lines);

    [Fact]
    public void Outfield_groups_with_totals_per_90_and_percentages()
    {
        var t = Totals(
            new PlayerSeasonStat { Minutes = 1800, Goals = 10, DribblesAttempts = 40, DribblesSuccess = 20, DuelsTotal = 100, DuelsWon = 45, PassesTotal = 1000, PassAccuracy = 80 },
            new PlayerSeasonStat { Minutes = 900, Goals = null, PassesTotal = 1000, PassAccuracy = 90 });

        var groups = StatGroups.Build("Attacker", t);

        Assert.Equal(["attack", "passing", "defence", "discipline"], groups.Select(g => g.Group));
        var attack = groups[0].Rows;
        Assert.Equal(new StatRow("goals", 10, 0.33m), attack[0]);
        Assert.Equal(new StatRow("dribbles", 20, 0.67m, OutOf: 40), attack.Single(r => r.Key == "dribbles"));
        Assert.Equal(new StatRow("passAccuracy", 85.0m, null), groups[1].Rows.Single(r => r.Key == "passAccuracy"));
        Assert.Equal(new StatRow("duelsWon", 45, 1.50m, Pct: 45.0m), groups[2].Rows.Single(r => r.Key == "duelsWon"));
    }

    [Fact]
    public void Goalkeepers_get_goalkeeping_first()
    {
        var groups = StatGroups.Build("Goalkeeper", Totals(new PlayerSeasonStat { Minutes = 900, Saves = 3, GoalsConceded = 1 }));

        Assert.Equal(["goalkeeping", "attack", "passing", "defence", "discipline"], groups.Select(g => g.Group));
        Assert.Equal(["saves", "goalsConceded", "savePct"], groups[0].Rows.Select(r => r.Key));
        Assert.Equal(75.0m, groups[0].Rows[2].Total);
    }
}
