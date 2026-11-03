using ScoreFoot.Api;
using ScoreFoot.Data;

namespace ScoreFoot.Tests;

[Collection("db")]
public class ClubPageTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;
    private static readonly DateTimeOffset Day = new(2026, 3, 1, 20, 0, 0, TimeSpan.Zero);

    // League 61, 2025: PSG 1st (Champions League), Lille 2nd (Relegation), Lyon 3rd (promoted: no 2024 standing).
    // 2024: PSG 2nd. Crystal Palace U21 has no standing at all.
    private static ScoreFootDbContext Seed()
    {
        var db = TestDb.CreateEmpty();
        db.Leagues.Add(new League { Id = 61, Name = "Ligue 1", LogoPath = "leagues/61.png" });
        db.Teams.AddRange(
            new Team { Id = 85, Name = "Paris Saint Germain", NameSearch = "paris saint germain", Code = "PSG", Country = "France", LogoPath = "teams/85.png" },
            new Team { Id = 79, Name = "Lille", NameSearch = "lille", Code = "LIL" },
            new Team { Id = 80, Name = "Lyon", NameSearch = "lyon", Code = "LYO" },
            new Team { Id = 17000, Name = "Crystal Palace U21", NameSearch = "crystal palace u21" });
        Standing St(int team, int season, int rank, string? description) => new()
        {
            LeagueId = 61, Season = season, TeamId = team, Rank = rank, Points = 90 - 10 * rank, Played = 34,
            Won = 20 - rank, Drawn = 5, Lost = 9 + rank, GoalsFor = 60, GoalsAgainst = 30 + rank, Description = description,
        };
        db.Standings.AddRange(
            St(85, 2025, 1, "Promotion - Champions League (League phase)"), St(79, 2025, 2, "Relegation - Ligue 2"), St(80, 2025, 3, null),
            St(85, 2024, 2, "Champions League"));
        db.Fixtures.AddRange(
            new Fixture { Id = 1, LeagueId = 61, Season = 2025, Round = "Regular Season - 1", Status = "FT", KickoffUtc = Day, HomeTeamId = 85, AwayTeamId = 79, HomeGoals = 2, AwayGoals = 1 },
            new Fixture { Id = 2, LeagueId = 61, Season = 2025, Round = "Regular Season - 2", Status = "FT", KickoffUtc = Day.AddDays(7), HomeTeamId = 79, AwayTeamId = 85, HomeGoals = 3, AwayGoals = 0 },
            new Fixture { Id = 3, LeagueId = 61, Season = 2025, Round = "Regular Season - 3", Status = "NS", KickoffUtc = Day.AddDays(14), HomeTeamId = 85, AwayTeamId = 80 },
            // Relegation play-off against a club outside the 5 leagues: no page, so no link.
            new Fixture { Id = 4, LeagueId = 61, Season = 2025, Round = "Relegation Round", Status = "FT", KickoffUtc = Day.AddDays(-7), HomeTeamId = 17000, AwayTeamId = 85, HomeGoals = 1, AwayGoals = 1 });
        Player P(int id, string name) => new() { Id = id, Name = name, NameSearch = name.ToLowerInvariant(), PhotoPath = $"players/{id}.png" };
        db.Players.AddRange(P(1, "Striker"), P(2, "Keeper"), P(3, "Defender"), P(4, "Unused"), P(5, "Super Sub"));
        PlayerSeasonStat L(int player, string position, int minutes, int? goals, decimal? rating) => new()
        {
            PlayerId = player, TeamId = 85, LeagueId = 61, Season = 2025, Position = position,
            Minutes = minutes, Appearances = minutes / 90, Goals = goals, Assists = null, Rating = rating,
        };
        db.PlayerSeasonStats.AddRange(
            L(1, "Attacker", 1000, 5, 7.0m),
            L(2, "Goalkeeper", 2000, null, 6.8m),
            L(3, "Defender", 950, 5, 7.5m),
            L(4, "Midfielder", 0, null, null),     // in the squad, never played
            L(5, "Attacker", 300, 1, 9.0m));       // best rating, but under 900 minutes
        db.SaveChanges();
        return db;
    }

    [Fact]
    public async Task Latest_season_standing_previous_and_table()
    {
        using var db = Seed();
        var page = (await ClubPage.LoadAsync(db, 85, null, Ct))!;

        Assert.Equal(("Paris Saint Germain", "/media/teams/85.png", "France"), (page.Name, page.Logo, page.Country));
        Assert.Equal([2025, 2024], page.Seasons);
        Assert.Equal(2025, page.Season);
        Assert.Equal(new LeagueRef(61, "Ligue 1", "/media/leagues/61.png"), page.League);
        Assert.Equal(new StandingLine(1, 80, 34, 19, 5, 10, 60, 31, "ucl"), page.Standing);
        Assert.Equal(2, page.Previous!.Rank);
        Assert.Equal([(1, "Paris Saint Germain", "ucl"), (2, "Lille", "relegation"), (3, "Lyon", null)],
            page.Table.Select(r => (r.Rank, r.Club.Name, r.Zone)));
        Assert.Equal(29, page.Table[0].GoalDiff);
    }

    [Fact]
    public async Task Promoted_club_has_one_season_and_no_previous()
    {
        using var db = Seed();
        var page = (await ClubPage.LoadAsync(db, 80, null, Ct))!;
        Assert.Equal([2025], page.Seasons);
        Assert.Null(page.Previous);
    }

    [Fact]
    public async Task Results_most_recent_first_from_the_club_side()
    {
        using var db = Seed();
        var page = (await ClubPage.LoadAsync(db, 85, null, Ct))!;

        // Fixture 3 has no score yet: left out.
        Assert.Equal(
            [(2, false, 0, 3, "LIL", true), (1, true, 2, 1, "LIL", true), (4, false, 1, 1, null, false)],
            page.Results.Select(m => (m.FixtureId, m.Home, m.GoalsFor, m.GoalsAgainst, m.Opponent.Code, m.Opponent.HasPage)));
        Assert.Equal(page.Results, page.Form);
    }

    [Fact]
    public async Task Squad_by_position_then_minutes_and_key_players()
    {
        using var db = Seed();
        var page = (await ClubPage.LoadAsync(db, 85, null, Ct))!;

        Assert.Equal(["Keeper", "Defender", "Striker", "Super Sub"], page.Squad.Select(p => p.Name));
        Assert.Equal(new SquadPlayer(2, "Keeper", "/media/players/2.png", "Goalkeeper", 22, 2000, 0, 0, 6.8m), page.Squad[0]);
        var keys = page.KeyPlayers;
        Assert.Equal(("Striker", 5m), (keys.TopScorer!.Name, keys.TopScorer.Value));   // 5 goals each: more minutes wins
        Assert.Null(keys.TopAssists);                                                  // nobody has an assist
        Assert.Equal(("Defender", 7.5m), (keys.BestRated!.Name, keys.BestRated.Value)); // Super Sub has 9.0 but 300 minutes
        Assert.Equal(("Keeper", 2000m), (keys.MostMinutes!.Name, keys.MostMinutes.Value));
    }

    [Theory]
    [InlineData(999, null)]    // unknown club
    [InlineData(17000, null)]  // no standing: not in the 5 leagues
    [InlineData(85, 2023)]     // season without standing
    public async Task Missing_pages(int id, int? season)
    {
        using var db = Seed();
        Assert.Null(await ClubPage.LoadAsync(db, id, season, Ct));
    }
}
