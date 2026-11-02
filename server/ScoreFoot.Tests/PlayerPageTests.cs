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
        Assert.Equal(new SeasonClub(85, "Paris Saint Germain", "/media/teams/85.png", "Ligue 1"), page.Clubs[0]);
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
        Assert.Equal(new HistoryRow(2025, new ClubRef(85, "Paris Saint Germain", "/media/teams/85.png"), "Ligue 1", 10, 900, 0, 1, 7.0m),
            page.History[0]);
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
