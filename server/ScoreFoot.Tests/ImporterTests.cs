using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using ScoreFoot.Data;
using ScoreFoot.Sync;

namespace ScoreFoot.Tests;

[Collection("db")]
public class ImporterTests
{
    private static async Task ImportAsync(ScoreFootDbContext db, SyncTaskType type, string sample, int? page = null,
        Func<string, string>? edit = null)
    {
        var task = new SyncTask { Type = type, LeagueId = 61, Season = 2024, Page = page };
        var body = Samples.Read(sample);
        await new Importer(db, Build.Options(), DateTimeOffset.UtcNow).ImportAsync(task, edit?.Invoke(body) ?? body);
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
    }

    [Fact]
    public async Task Teams_and_standings()
    {
        using var db = TestDb.CreateEmpty();
        await ImportAsync(db, SyncTaskType.Teams, "teams-league61-2024.json");
        await ImportAsync(db, SyncTaskType.Standings, "standings-league61-2024.json");

        Assert.Equal(19, db.Teams.Count());
        Assert.Equal(18, db.Standings.Count());
        var psg = db.Standings.Include(s => s.Team).Single(s => s.Rank == 1);
        Assert.Equal(("Paris Saint Germain", 84, 92), (psg.Team.Name, psg.Points, psg.GoalsFor));
        Assert.Equal("paris saint germain", psg.Team.NameSearch);
    }

    [Fact]
    public async Task Fixture_list_creates_detail_tasks_for_finished_matches()
    {
        using var db = TestDb.CreateEmpty();
        await ImportAsync(db, SyncTaskType.Fixtures, "fixtures-league61-2024.json");

        Assert.Equal(308, db.Fixtures.Count());
        Assert.Equal("Ligue 1", db.Leagues.Single().Name);
        var detailTasks = db.SyncTasks.Where(t => t.Type == SyncTaskType.FixtureDetails).ToList();
        Assert.Equal(16, detailTasks.Count);
        Assert.Equal(308, detailTasks.Sum(t => t.FixtureIds!.Split('-').Length));
    }

    [Fact]
    public async Task Fixture_details_store_one_line_per_player_and_match()
    {
        using var db = TestDb.CreateEmpty();
        await ImportAsync(db, SyncTaskType.FixtureDetails, "fixtures-ids-batch.json");

        var expected = JsonNode.Parse(Samples.Read("fixtures-ids-batch.json"))!["response"]!.AsArray()
            .Sum(f => f!["players"]!.AsArray().Sum(t => t!["players"]!.AsArray().Count));
        Assert.Equal(20, db.Fixtures.Count());
        Assert.Equal(expected, db.FixturePlayerStats.Count());
        Assert.True(db.FixturePlayerStats.Count(s => s.Rating != null) > expected / 2);
        // Players only seen in a match still get a row, so the foreign key holds.
        Assert.Equal(db.FixturePlayerStats.Select(s => s.PlayerId).Distinct().Count(), db.Players.Count());
    }

    [Fact]
    public async Task Players_page_and_follow_up_pages()
    {
        using var db = TestDb.CreateEmpty();
        await ImportAsync(db, SyncTaskType.Players, "players-league61-2024-p1.json", page: 1);

        Assert.Equal(20, db.Players.Count());
        var balerdi = db.Players.Single(p => p.Id == 6);
        Assert.Equal((187, 76, new DateOnly(1999, 1, 26)), (balerdi.HeightCm, balerdi.WeightKg, balerdi.BirthDate));
        var stat = db.PlayerSeasonStats.Single(s => s.PlayerId == 6);
        Assert.Equal((27, 2276, 6.91m, 87), (stat.Appearances, stat.Minutes, stat.Rating, stat.PassAccuracy));
        Assert.Equal(46, db.SyncTasks.Count(t => t.Type == SyncTaskType.Players)); // pages 2..47
    }

    [Fact]
    public async Task Forward_season_position_is_stored_as_attacker()
    {
        using var db = TestDb.CreateEmpty();
        await ImportAsync(db, SyncTaskType.Players, "players-league61-2024-p1.json", page: 1,
            edit: body => body.Replace("\"position\":\"Attacker\"", "\"position\":\"Forward\""));

        Assert.Equal(0, db.PlayerSeasonStats.Count(s => s.Position == "Forward"));
        Assert.Equal(2, db.PlayerSeasonStats.Count(s => s.Position == "Attacker"));
    }

    [Fact]
    public async Task Importing_the_same_answer_twice_changes_nothing()
    {
        using var db = TestDb.CreateEmpty();
        await ImportAsync(db, SyncTaskType.FixtureDetails, "fixtures-ids-batch.json");
        await ImportAsync(db, SyncTaskType.Players, "players-league61-2024-p1.json", page: 2);
        var counts = (db.Players.Count(), db.FixturePlayerStats.Count(), db.PlayerSeasonStats.Count(), db.Teams.Count());

        await ImportAsync(db, SyncTaskType.FixtureDetails, "fixtures-ids-batch.json");
        await ImportAsync(db, SyncTaskType.Players, "players-league61-2024-p1.json", page: 2);

        Assert.Equal(counts, (db.Players.Count(), db.FixturePlayerStats.Count(), db.PlayerSeasonStats.Count(), db.Teams.Count()));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Match_names_win_whatever_the_order(bool playersFirst)
    {
        using var db = TestDb.CreateEmpty();
        if (playersFirst) await ImportAsync(db, SyncTaskType.Players, "players-league61-2024-p1.json", page: 2);
        await ImportAsync(db, SyncTaskType.FixtureDetails, "fixtures-ids-batch.json");
        if (!playersFirst) await ImportAsync(db, SyncTaskType.Players, "players-league61-2024-p1.json", page: 2);

        var hakimi = db.Players.Single(p => p.Id == 9);
        Assert.Equal("Achraf Hakimi", hakimi.Name); // the players endpoint says "A. Hakimi"
        Assert.Contains("achraf hakimi", hakimi.NameSearch);
        Assert.Contains(SearchText.Normalize(hakimi.LastName!), hakimi.NameSearch);
    }
}
