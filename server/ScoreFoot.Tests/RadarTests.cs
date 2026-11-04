using ScoreFoot.Api;
using ScoreFoot.Data;

namespace ScoreFoot.Tests;

public class RadarTests
{
    private static SeasonTotals T(int minutes, int goals = 0, decimal? rating = 7m, int saves = 0, int conceded = 0) =>
        SeasonTotals.From([new PlayerSeasonStat
        {
            Minutes = minutes, Goals = goals, Rating = rating, Saves = saves, GoalsConceded = conceded,
        }]);

    private static int? Percentile(RadarResult r, string key) => r.Axes.Single(a => a.Key == key).Percentile;

    [Fact]
    public void Percentiles_rank_per_90_values_and_ties_share_a_value()
    {
        var a = T(900, goals: 10);           // 1.00 per 90
        var b = T(900, goals: 5);            // 0.50
        var c = T(1800, goals: 10);          // 0.50, tie with b
        var d = T(1800, goals: 0, rating: null);
        List<SeasonTotals> group = [a, b, c, d];

        var top = Radar.Build("Attacker", a, group);
        Assert.Equal((true, 4), (top.Eligible, top.GroupSize));
        Assert.Equal(["goals", "shotsOnTarget", "keyPasses", "dribbles", "duelsWonPct", "rating"], top.Axes.Select(x => x.Key));
        Assert.Equal(100, Percentile(top, "goals"));
        Assert.Equal(1.00m, top.Axes[0].Value);
        Assert.Equal(33, Percentile(Radar.Build("Attacker", b, group), "goals"));
        Assert.Equal(33, Percentile(Radar.Build("Attacker", c, group), "goals"));
        Assert.Equal(0, Percentile(Radar.Build("Attacker", d, group), "goals"));
    }

    [Fact]
    public void Missing_rating_is_left_out_of_its_axis()
    {
        var a = T(900, rating: 7.5m);
        var b = T(900, rating: 6.5m);
        var d = T(900, rating: null);
        List<SeasonTotals> group = [a, b, d];

        Assert.Null(Percentile(Radar.Build("Attacker", d, group), "rating"));
        Assert.Equal(100, Percentile(Radar.Build("Attacker", a, group), "rating")); // ranked among the 2 rated players
        Assert.Equal(0, Percentile(Radar.Build("Attacker", b, group), "rating"));
    }

    [Fact]
    public void Fewer_goals_conceded_is_better_for_goalkeepers()
    {
        var safe = T(900, saves: 30, conceded: 9);
        var busy = T(900, saves: 20, conceded: 18);
        List<SeasonTotals> group = [safe, busy];

        var r = Radar.Build("Goalkeeper", safe, group);
        Assert.Equal(["saves", "savePct", "goalsConceded", "passAccuracy", "rating"], r.Axes.Select(x => x.Key));
        Assert.Equal(100, Percentile(r, "goalsConceded"));
        Assert.Equal(0.90m, r.Axes.Single(x => x.Key == "goalsConceded").Value);
        Assert.Equal(76.9m, r.Axes.Single(x => x.Key == "savePct").Value); // 30 / (30 + 9)
        Assert.Null(Percentile(r, "passAccuracy")); // no pass data at all
    }

    [Fact]
    public void Under_900_minutes_there_is_no_radar()
    {
        var r = Radar.Build("Attacker", T(899), [T(900)]);
        Assert.Equal((false, 900, 1), (r.Eligible, r.MinMinutes, r.GroupSize));
        Assert.Empty(r.Axes);
    }
}
