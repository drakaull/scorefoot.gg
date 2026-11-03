using ScoreFoot.Api;
using ScoreFoot.Data;

namespace ScoreFoot.Tests;

[Collection("db")]
public class PlayerPageTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    // Player 1: two clubs in 2025 (plus an empty squad line in another league), two clubs in 2024 (one without rating).
    // Player 2: only an empty squad line.
    private static ScoreFootDbContext Seed()
    {
        var db = TestDb.CreateEmpty();
        db.Leagues.AddRange(new League { Id = 61, Name = "Ligue 1" }, new League { Id = 140, Name = "La Liga" });
        db.Teams.AddRange(
            new Team { Id = 85, Name = "Paris Saint Germain", NameSearch = "paris saint germain", LogoPath = "teams/85.png" },
            new Team { Id = 79, Name = "Lille", NameSearch = "lille" },
            new Team { Id = 541, Name = "Real Madrid", NameSearch = "real madrid" });
        db.Players.AddRange(
            new Player { Id = 1, Name = "Kylian Mbappé", NameSearch = "kylian mbappe", PhotoPath = "players/1.png",
                         BirthDate = new DateOnly(1998, 12, 20), Nationality = "France", HeightCm = 178 },
            new Player { Id = 2, Name = "Reserve Keeper", NameSearch = "reserve keeper" });
        PlayerSeasonStat S(int player, int team, int league, int season, int? minutes, decimal? rating, int? goals) => new()
        {
            PlayerId = player, TeamId = team, LeagueId = league, Season = season, Position = "Attacker",
            Minutes = minutes, Rating = rating, Goals = goals, Appearances = minutes > 0 ? 10 : 0, Assists = 1,
        };
        db.PlayerSeasonStats.AddRange(
            S(1, 85, 61, 2025, 900, 7.0m, null),   // null goals on a played line count as 0
            S(1, 79, 61, 2025, 300, 8.0m, 2),
            S(1, 541, 140, 2025, 0, null, null),   // empty squad line: ignored everywhere
            S(1, 85, 61, 2024, 1000, 7.0m, 5),
            S(1, 79, 61, 2024, 500, null, 1),      // no rating: left out of the weighted rating
            S(2, 85, 61, 2025, 0, null, null));
        // PSG played in the 5 leagues; Lille has no standing here, so no club page.
        db.Standings.Add(new Standing { LeagueId = 61, Season = 2025, TeamId = 85, Rank = 1 });
        db.SaveChanges();
        return db;
    }

    [Fact]
    public async Task Latest_played_season_by_default_with_lines_added_up()
    {
        using var db = Seed();
        var page = await PlayerPage.LoadAsync(db, 1, null, Ct);

        Assert.NotNull(page);
        Assert.Equal(("Kylian Mbappé", "/media/players/1.png", 178), (page.Name, page.Photo, page.HeightCm));
        Assert.Equal([2025, 2024], page.Seasons);
        Assert.Equal((2025, "Attacker"), (page.Season, page.Position));
        Assert.Equal(new Summary(20, 1200, 2, 2, 7.25m), page.Summary);
        Assert.Equal(["Paris Saint Germain", "Lille"], page.Clubs.Select(c => c.Name));
        Assert.Equal(new SeasonClub(85, "Paris Saint Germain", "/media/teams/85.png", "Ligue 1", true), page.Clubs[0]);
        Assert.False(page.Clubs[1].HasPage);
        // 1,200 minutes over two clubs: in the radar group, alone (player 2 never played).
        Assert.Equal((true, 1), (page.Radar.Eligible, page.Radar.GroupSize));
    }

    [Fact]
    public async Task Previous_season_and_rating_without_missing_values()
    {
        using var db = Seed();
        var page = await PlayerPage.LoadAsync(db, 1, null, Ct);

        Assert.Equal(new Summary(20, 1500, 6, 2, 7.0m), page!.Previous);
        Assert.Null((await PlayerPage.LoadAsync(db, 1, 2024, Ct))!.Previous);
    }

    [Fact]
    public async Task History_has_one_row_per_played_line_newest_first()
    {
        using var db = Seed();
        var page = await PlayerPage.LoadAsync(db, 1, 2024, Ct);

        Assert.Equal(2024, page!.Season);
        Assert.Equal(
            [(2025, "Paris Saint Germain", 900), (2025, "Lille", 300), (2024, "Paris Saint Germain", 1000), (2024, "Lille", 500)],
            page.History.Select(h => (h.Season, h.Club.Name, h.Minutes)));
        Assert.Equal(new HistoryRow(2025, new ClubRef(85, "Paris Saint Germain", "/media/teams/85.png", true), "Ligue 1", 10, 900, 0, 1, 7.0m),
            page.History[0]);
    }

    [Fact]
    public async Task Form_is_the_last_5_matches_played_in_the_season()
    {
        using var db = Seed();
        var start = new DateTimeOffset(2026, 3, 1, 20, 0, 0, TimeSpan.Zero);
        // Fixtures 1..6 in 2025, one per week; fixture 7 is the latest but he stayed on the bench; fixture 8 is in 2024.
        for (var i = 1; i <= 8; i++)
        {
            var home = i % 2 == 1; // odd fixtures at home for PSG
            db.Fixtures.Add(new Fixture
            {
                Id = i, LeagueId = 61, Season = i == 8 ? 2024 : 2025, Round = "R", Status = "FT",
                KickoffUtc = i == 8 ? start.AddYears(-1) : start.AddDays(7 * i),
                HomeTeamId = home ? 85 : 79, AwayTeamId = home ? 79 : 85, HomeGoals = 2, AwayGoals = 1,
            });
            db.FixturePlayerStats.Add(new FixturePlayerStat
            {
                FixtureId = i, PlayerId = 1, TeamId = 85, Minutes = i == 7 ? 0 : 60 + i,
                Rating = i == 6 ? null : 7.1m, Goals = i == 6 ? 1 : null, Assists = null,
            });
        }
        db.Teams.Find(79)!.Code = "LIL";
        await db.SaveChangesAsync(Ct);

        var form = (await PlayerPage.LoadAsync(db, 1, null, Ct))!.Form;

        Assert.Equal([6, 5, 4, 3, 2], form.Select(m => m.FixtureId));
        Assert.Equal(new FormMatch(6, start.AddDays(42), new Opponent(79, "Lille", "LIL", null, false), false, 1, 2, 66, null, 1, 0), form[0]);
        Assert.Equal((true, 2, 1, 0), (form[1].Home, form[1].GoalsFor, form[1].GoalsAgainst, form[1].Goals));
    }

    [Fact]
    public async Task Clubs_of_a_season_are_sorted_by_last_match_latest_first()
    {
        using var db = Seed();
        // He played for PSG (900 min) then moved to Lille (300 min): Lille is his latest club.
        var kickoff = new DateTimeOffset(2026, 1, 10, 20, 0, 0, TimeSpan.Zero);
        db.Fixtures.AddRange(
            new Fixture { Id = 1, LeagueId = 61, Season = 2025, Round = "R", Status = "FT", KickoffUtc = kickoff, HomeTeamId = 85, AwayTeamId = 79 },
            new Fixture { Id = 2, LeagueId = 61, Season = 2025, Round = "R", Status = "FT", KickoffUtc = kickoff.AddDays(30), HomeTeamId = 79, AwayTeamId = 85 });
        db.FixturePlayerStats.AddRange(
            new FixturePlayerStat { FixtureId = 1, PlayerId = 1, TeamId = 85, Minutes = 90 },
            new FixturePlayerStat { FixtureId = 2, PlayerId = 1, TeamId = 79, Minutes = 90 });
        await db.SaveChangesAsync(Ct);

        var page = (await PlayerPage.LoadAsync(db, 1, null, Ct))!;

        Assert.Equal(["Lille", "Paris Saint Germain"], page.Clubs.Select(c => c.Name));
        Assert.Equal(["Lille", "Paris Saint Germain"], page.History.Where(h => h.Season == 2025).Select(h => h.Club.Name));
        Assert.Equal("Attacker", page.Position); // still from the line with the most minutes
    }

    [Theory]
    [InlineData(999, null)]  // unknown player
    [InlineData(2, null)]    // never played
    [InlineData(1, 2023)]    // season not played
    public async Task Missing_pages(int id, int? season)
    {
        using var db = Seed();
        Assert.Null(await PlayerPage.LoadAsync(db, id, season, Ct));
    }
}
