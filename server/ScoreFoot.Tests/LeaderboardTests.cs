using ScoreFoot.Api;
using ScoreFoot.Data;

namespace ScoreFoot.Tests;

[Collection("db")]
public class LeaderboardTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;
    private static readonly DateTimeOffset Day = new(2026, 3, 1, 20, 0, 0, TimeSpan.Zero);

    private sealed class Data(ScoreFootDbContext db)
    {
        private int fixtureId;

        public Data Player(int id, string name, DateOnly? birth = null)
        {
            db.Players.Add(new Player { Id = id, Name = name, NameSearch = name.ToLowerInvariant(), BirthDate = birth, PhotoPath = $"players/{id}.png" });
            return this;
        }

        public Data Line(int player, int team, int minutes, int goals = 0, decimal? rating = 7m, string position = "Attacker",
            int league = 61, int season = 2025, int? lastMatchDay = null)
        {
            db.PlayerSeasonStats.Add(new PlayerSeasonStat
            {
                PlayerId = player, TeamId = team, LeagueId = league, Season = season, Position = position,
                Minutes = minutes, Appearances = minutes / 90, Goals = goals, Rating = rating,
            });
            if (lastMatchDay is { } d)
            {
                // One played match on that day, to tell which club he played for last.
                var id = ++fixtureId;
                db.Fixtures.Add(new Fixture { Id = id, LeagueId = league, Season = season, Round = "Regular Season - 1", Status = "FT",
                    KickoffUtc = Day.AddDays(d), HomeTeamId = team, AwayTeamId = team == 85 ? 79 : 85, HomeGoals = 1, AwayGoals = 0 });
                db.FixturePlayerStats.Add(new FixturePlayerStat { FixtureId = id, PlayerId = player, TeamId = team, Minutes = 90 });
            }
            return this;
        }
    }

    // Leagues 61 (Ligue 1) and 39 (Premier League), seasons 2025 and 2024. Teams 85, 79 in 61; 33 in 39.
    private static (ScoreFootDbContext Db, Data Data) Seed()
    {
        var db = TestDb.CreateEmpty();
        db.Leagues.AddRange(new League { Id = 61, Name = "Ligue 1" }, new League { Id = 39, Name = "Premier League" });
        db.Teams.AddRange(
            new Team { Id = 85, Name = "Paris Saint Germain", NameSearch = "psg", LogoPath = "teams/85.png" },
            new Team { Id = 79, Name = "Lille", NameSearch = "lille" },
            new Team { Id = 33, Name = "Manchester United", NameSearch = "manchester united" });
        foreach (var season in new[] { 2025, 2024 })
            db.Standings.AddRange(
                new Standing { LeagueId = 61, Season = season, TeamId = 85, Rank = 1 },
                new Standing { LeagueId = 61, Season = season, TeamId = 79, Rank = 2 },
                new Standing { LeagueId = 39, Season = season, TeamId = 33, Rank = 1 });
        return (db, new Data(db));
    }

    private static Task<LeaderboardResult> Run(ScoreFootDbContext db, string stat, int? season = null, int? league = null,
        string? position = null, string? age = null, string? mode = null) =>
        Leaderboard.RunAsync(db, new LeaderboardQuery(stat, season, league, position, age, mode), Ct)
            .ContinueWith(t => t.Result.Result ?? throw new InvalidOperationException(t.Result.Error));

    [Fact]
    public async Task Lines_add_up_and_the_last_club_is_shown()
    {
        var (db, d) = Seed();
        using var _ = db;
        // January move: 3 goals for PSG, then 4 for Lille (his last match is for Lille).
        d.Player(1, "Mover").Line(1, 85, 600, goals: 3, lastMatchDay: 1).Line(1, 79, 700, goals: 4, lastMatchDay: 60, position: "Midfielder")
         .Player(2, "Stayer").Line(2, 85, 2000, goals: 5);
        await db.SaveChangesAsync(Ct);

        var r = await Run(db, "goals");
        Assert.Equal(("goals", "total", 2025, (int?)null), (r.Stat, r.Mode, r.Season, r.MinMinutes));
        Assert.Equal([2025, 2024], r.Seasons);
        Assert.Equal([39, 61], r.Leagues.Select(l => l.Id).Order());
        var top = r.Rows[0];
        Assert.Equal((1, "Mover", "Lille", 1300, 7m), (top.Rank, top.Player.Name, top.Club.Name, top.Minutes, top.Value));
        Assert.Equal("Midfielder", top.Position);     // the line with the most minutes
        Assert.Equal(0.48m, top.Per90);                // 7 × 90 / 1300
        Assert.Equal("Paris Saint Germain", r.Rows[1].Club.Name); // no match data: line with the most minutes
    }

    [Fact]
    public async Task League_filter_keeps_only_that_league()
    {
        var (db, d) = Seed();
        using var _ = db;
        d.Player(1, "Two Leagues").Line(1, 85, 900, goals: 2).Line(1, 33, 900, goals: 9, league: 39);
        await db.SaveChangesAsync(Ct);

        Assert.Equal(11m, (await Run(db, "goals")).Rows[0].Value);
        var pl = await Run(db, "goals", league: 39);
        Assert.Equal((9m, "Manchester United"), (pl.Rows[0].Value, pl.Rows[0].Club.Name));
    }

    [Fact]
    public async Task Age_is_taken_on_1_July_of_the_season()
    {
        var (db, d) = Seed();
        using var _ = db;
        d.Player(1, "Turns 21 on 1 July", new DateOnly(2004, 7, 1)).Line(1, 85, 900, goals: 1)
         .Player(2, "Turns 21 on 2 July", new DateOnly(2004, 7, 2)).Line(2, 85, 900, goals: 1)
         .Player(3, "Turned 21 on 30 June", new DateOnly(2004, 6, 30)).Line(3, 85, 900, goals: 1)
         .Player(4, "No birth date").Line(4, 85, 900, goals: 1)
         .Player(5, "Is 22", new DateOnly(2003, 1, 1)).Line(5, 85, 900, goals: 1);
        await db.SaveChangesAsync(Ct);

        Assert.Equal(["Turns 21 on 2 July"], (await Run(db, "goals", age: "u21")).Rows.Select(r => r.Player.Name));
        Assert.Equal(4, (await Run(db, "goals", age: "u23")).Rows.Count); // all but the one without a birth date
        Assert.Equal(5, (await Run(db, "goals")).Rows.Count);
    }

    [Fact]
    public async Task Rating_and_per_90_need_900_minutes()
    {
        var (db, d) = Seed();
        using var _ = db;
        d.Player(1, "Regular").Line(1, 85, 900, goals: 3, rating: 7.2m)
         .Player(2, "Super Sub").Line(2, 85, 899, goals: 5, rating: 9.5m);
        await db.SaveChangesAsync(Ct);

        var rating = await Run(db, "rating");
        Assert.Equal(900, rating.MinMinutes);
        Assert.Equal(["Regular"], rating.Rows.Select(r => r.Player.Name));
        Assert.Null(rating.Rows[0].Per90);
        Assert.Equal(["Regular"], (await Run(db, "goals", mode: "per90")).Rows.Select(r => r.Player.Name));
        Assert.Equal(["Super Sub", "Regular"], (await Run(db, "goals")).Rows.Select(r => r.Player.Name));
    }

    [Fact]
    public async Task Position_filter_ties_zero_values_and_limit()
    {
        var (db, d) = Seed();
        using var _ = db;
        d.Player(1, "Bravo").Line(1, 85, 1000, goals: 5)
         .Player(2, "Alpha").Line(2, 85, 1000, goals: 5)
         .Player(3, "Efficient").Line(3, 85, 500, goals: 5)
         .Player(4, "Keeper").Line(4, 85, 3000, goals: 0, position: "Goalkeeper");
        for (var i = 0; i < 60; i++) d.Player(100 + i, $"Defender {i:00}").Line(100 + i, 79, 900, goals: 1, position: "Defender");
        await db.SaveChangesAsync(Ct);

        var goals = await Run(db, "goals");
        Assert.Equal(["Efficient", "Alpha", "Bravo"], goals.Rows.Take(3).Select(r => r.Player.Name)); // fewer minutes, then name
        Assert.Equal(50, goals.Rows.Count);
        Assert.Equal(Enumerable.Range(1, 50), goals.Rows.Select(r => r.Rank));
        Assert.DoesNotContain(goals.Rows, r => r.Player.Name == "Keeper");                          // 0 goals: left out
        Assert.All((await Run(db, "goals", position: "Defender")).Rows, r => Assert.Equal("Defender", r.Position));
        Assert.Empty((await Run(db, "goals", position: "Goalkeeper")).Rows);
    }

    [Theory]
    [InlineData("goals", 1990, null, null, null, null)]
    [InlineData("goals", null, 999, null, null, null)]
    [InlineData("goals", null, null, "Winger", null, null)]
    [InlineData("goals", null, null, null, "u19", null)]
    [InlineData("goals", null, null, null, null, "average")]
    [InlineData("rating", null, null, null, null, "per90")]
    [InlineData("minutes", null, null, null, null, "per90")]
    public async Task Invalid_parameters_are_refused(string stat, int? season, int? league, string? position, string? age, string? mode)
    {
        var (db, _) = Seed();
        using var __ = db;
        await db.SaveChangesAsync(Ct);
        var (result, error) = await Leaderboard.RunAsync(db, new LeaderboardQuery(stat, season, league, position, age, mode), Ct);
        Assert.Null(result);
        Assert.NotNull(error);
    }

    [Fact]
    public void Only_the_12_stats_exist() =>
        Assert.Equal(["goals", "assists", "goalsAssists", "rating", "minutes", "shotsOnTarget", "keyPasses", "dribbles",
                      "tackles", "interceptions", "duelsWon", "saves"], Leaderboard.Stats);
}
