using ScoreFoot.Api;
using ScoreFoot.Data;

namespace ScoreFoot.Tests;

[Collection("db")]
public class SearchTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static ScoreFootDbContext Seed()
    {
        var db = TestDb.CreateEmpty();
        db.Leagues.Add(new League { Id = 61, Name = "Ligue 1", Country = "France" });
        db.Teams.AddRange(
            new Team { Id = 85, Name = "Paris Saint Germain", NameSearch = "paris saint germain", Code = "PSG", Country = "France", LogoPath = "teams/85.png" },
            new Team { Id = 79, Name = "Lille", NameSearch = "lille", Code = "LIL", Country = "France" });
        db.Standings.AddRange(
            new Standing { LeagueId = 61, Season = 2025, TeamId = 85, Rank = 1 },
            new Standing { LeagueId = 61, Season = 2025, TeamId = 79, Rank = 2 });
        Player P(int id, string name, string? photo = null) => new() { Id = id, Name = name, NameSearch = SearchText.Normalize(name), PhotoPath = photo };
        db.Players.AddRange(
            P(1, "Kylian Mbappé", "players/1.png"),
            P(2, "Ethan Mbappé"),
            P(3, "Mbappe Prefix"),        // starts with the query
            P(4, "Martin Ødegaard"),
            P(5, "Junior Mbappeau"));    // contains the query mid-word
        PlayerSeasonStat S(int player, int team, int season, int minutes) =>
            new() { PlayerId = player, TeamId = team, LeagueId = 61, Season = season, Minutes = minutes, Position = "Attacker" };
        db.PlayerSeasonStats.AddRange(
            S(1, 85, 2024, 2500), S(1, 85, 2025, 3000),
            S(2, 79, 2025, 500),
            S(3, 79, 2025, 10));
        db.SaveChanges();
        return db;
    }

    [Fact]
    public async Task Prefix_first_then_word_prefix_then_stars_before_reserves()
    {
        using var db = Seed();
        var result = await Search.RunAsync(db, "mbappe", Ct);

        Assert.Equal(["Mbappe Prefix", "Kylian Mbappé", "Ethan Mbappé", "Junior Mbappeau"], result.Players.Select(p => p.Name));
        var kylian = result.Players[1];
        Assert.Equal(new PlayerResult(1, "Kylian Mbappé", "/media/players/1.png", "Paris Saint Germain", "Attacker", 2025), kylian);
    }

    [Theory]
    [InlineData("MBAPPÉ")]
    [InlineData("  kylian  ")]
    [InlineData("mbape")] // typo
    public async Task Accents_case_spaces_and_typos_do_not_matter(string query)
    {
        using var db = Seed();
        Assert.Contains((await Search.RunAsync(db, query, Ct)).Players, p => p.Id == 1);
    }

    [Fact]
    public async Task Letters_without_accent_marks_are_folded()
    {
        using var db = Seed();
        Assert.Equal(4, Assert.Single((await Search.RunAsync(db, "odegaard", Ct)).Players).Id);
    }

    [Fact]
    public async Task Clubs_match_on_name_or_code_with_their_league()
    {
        using var db = Seed();
        var psg = Assert.Single((await Search.RunAsync(db, "psg", Ct)).Clubs);
        Assert.Equal(new ClubResult(85, "Paris Saint Germain", "/media/teams/85.png", "Ligue 1", "France"), psg);
        Assert.Equal(79, Assert.Single((await Search.RunAsync(db, "lil", Ct)).Clubs).Id);
    }

    [Fact]
    public async Task Like_wildcards_are_literal_and_limits_hold()
    {
        using var db = Seed();
        Assert.Empty((await Search.RunAsync(db, "%%", Ct)).Players);
        for (var i = 0; i < 10; i++) db.Players.Add(new Player { Id = 100 + i, Name = $"Mbappe Clone {i}", NameSearch = $"mbappe clone {i}" });
        await db.SaveChangesAsync(Ct);
        Assert.Equal(Search.MaxPlayers, (await Search.RunAsync(db, "mbappe", Ct)).Players.Count);
    }
}
