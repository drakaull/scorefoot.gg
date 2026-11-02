using System.Globalization;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using ScoreFoot.Data;

namespace ScoreFoot.Sync;

/// <summary>
/// Turns one API answer into rows. Every row is found by its API id (or natural key) and updated,
/// or created if missing, so importing the same answer twice changes nothing.
/// Does not call SaveChanges: the runner saves the task and its rows in one transaction.
/// </summary>
public sealed class Importer(ScoreFootDbContext db, SyncOptions options, DateTimeOffset now)
{
    public async Task ImportAsync(SyncTask task, string body, CancellationToken ct = default)
    {
        var root = JsonNode.Parse(body)!;
        var response = root["response"]!.AsArray();
        await PreloadAsync(task, root, ct);
        // Each Local lookup would otherwise rescan every tracked row; SaveChanges detects changes once at the end.
        db.ChangeTracker.AutoDetectChangesEnabled = false;
        try { await ImportResponseAsync(task, root, response, ct); }
        finally { db.ChangeTracker.AutoDetectChangesEnabled = true; }
    }

    private async Task ImportResponseAsync(SyncTask task, JsonNode root, JsonArray response, CancellationToken ct)
    {
        switch (task.Type)
        {
            case SyncTaskType.Teams:
                foreach (var item in response) await UpsertTeamAsync(item!["team"]!, ct);
                break;

            case SyncTaskType.Standings:
                foreach (var item in response)
                {
                    var league = item!["league"]!;
                    await UpsertLeagueAsync(league, ct);
                    foreach (var row in league["standings"]!.AsArray().SelectMany(group => group!.AsArray()))
                        await UpsertStandingAsync(task, row!, ct);
                }
                break;

            case SyncTaskType.Fixtures:
                var finished = new List<int>();
                foreach (var item in response)
                {
                    var fixture = await UpsertFixtureAsync(item!, ct);
                    if (TaskPlanner.FinishedStatuses.Contains(fixture.Status)) finished.Add(fixture.Id);
                }
                db.SyncTasks.AddRange(TaskPlanner.FixtureDetailTasks(task.LeagueId, task.Season, finished, options.FixtureBatchSize, now));
                break;

            case SyncTaskType.FixtureDetails:
                foreach (var item in response)
                {
                    var fixture = await UpsertFixtureAsync(item!, ct);
                    foreach (var side in item!["players"]?.AsArray() ?? [])
                    {
                        var team = await UpsertTeamAsync(side!["team"]!, ct);
                        foreach (var p in side["players"]!.AsArray())
                            await UpsertFixturePlayerStatAsync(fixture.Id, team.Id, p!, ct);
                    }
                }
                break;

            case SyncTaskType.Players:
                foreach (var item in response)
                {
                    var player = await UpsertPlayerAsync(item!["player"]!, fromMatch: false, ct);
                    foreach (var stat in item["statistics"]!.AsArray())
                    {
                        // A player's list can include other competitions; keep only the one this task is about.
                        if (Int(stat!["league"]?["id"]) != task.LeagueId || Int(stat["league"]?["season"]) != task.Season) continue;
                        await UpsertPlayerSeasonStatAsync(task, player.Id, stat, ct);
                    }
                }
                if (task.Page == 1 && Int(root["paging"]?["total"]) is int total)
                    db.SyncTasks.AddRange(TaskPlanner.PlayerPageTasks(task.LeagueId, task.Season, total, now));
                break;
        }
    }

    private async Task<League> UpsertLeagueAsync(JsonNode n, CancellationToken ct)
    {
        var league = await FindOrAddAsync(db.Leagues, Int(n["id"])!.Value, id => new League { Id = id, Name = "" }, ct);
        league.Name = Str(n["name"]) ?? league.Name;
        league.Country = Str(n["country"]) ?? league.Country;
        league.LogoUrl = Str(n["logo"]) ?? league.LogoUrl;
        return league;
    }

    private async Task<Team> UpsertTeamAsync(JsonNode n, CancellationToken ct)
    {
        var team = await FindOrAddAsync(db.Teams, Int(n["id"])!.Value, id => new Team { Id = id, Name = "", NameSearch = "" }, ct);
        team.Name = Str(n["name"]) ?? team.Name;
        team.NameSearch = SearchText.Normalize(team.Name);
        team.Code = Str(n["code"]) ?? team.Code;
        team.Country = Str(n["country"]) ?? team.Country;
        team.LogoUrl = Str(n["logo"]) ?? team.LogoUrl;
        return team;
    }

    /// <param name="fromMatch">Match lines give the full common name ("Achraf Hakimi"), the players endpoint a short one ("A. Hakimi"): match lines win, so the result does not depend on task order.</param>
    private async Task<Player> UpsertPlayerAsync(JsonNode n, bool fromMatch, CancellationToken ct)
    {
        var player = await FindOrAddAsync(db.Players, Int(n["id"])!.Value, id => new Player { Id = id, Name = "", NameSearch = "" }, ct);
        if (fromMatch || player.Name == "") player.Name = Str(n["name"]) ?? player.Name;
        player.FirstName = Str(n["firstname"]) ?? player.FirstName;
        player.LastName = Str(n["lastname"]) ?? player.LastName;
        // "E. Haaland" alone would not match a search for "erling".
        player.NameSearch = SearchText.Normalize(string.Join(' ', new[] { player.Name, player.FirstName, player.LastName }.Where(s => !string.IsNullOrWhiteSpace(s))));
        player.BirthDate = DateOnly.TryParse(Str(n["birth"]?["date"]), CultureInfo.InvariantCulture, out var birth) ? birth : player.BirthDate;
        player.Nationality = Str(n["nationality"]) ?? player.Nationality;
        player.HeightCm = Int(n["height"]) ?? player.HeightCm;
        player.WeightKg = Int(n["weight"]) ?? player.WeightKg;
        player.PhotoUrl = Str(n["photo"]) ?? player.PhotoUrl;
        return player;
    }

    private async Task<Fixture> UpsertFixtureAsync(JsonNode item, CancellationToken ct)
    {
        await UpsertLeagueAsync(item["league"]!, ct);
        var home = await UpsertTeamAsync(item["teams"]!["home"]!, ct);
        var away = await UpsertTeamAsync(item["teams"]!["away"]!, ct);
        var f = item["fixture"]!;
        var fixture = await FindOrAddAsync(db.Fixtures, Int(f["id"])!.Value, id => new Fixture { Id = id, Round = "", Status = "" }, ct);
        fixture.LeagueId = Int(item["league"]!["id"])!.Value;
        fixture.Season = Int(item["league"]!["season"])!.Value;
        fixture.Round = Str(item["league"]!["round"]) ?? "";
        fixture.KickoffUtc = DateTimeOffset.Parse(Str(f["date"])!, CultureInfo.InvariantCulture);
        fixture.Status = Str(f["status"]?["short"]) ?? "";
        fixture.HomeTeamId = home.Id;
        fixture.AwayTeamId = away.Id;
        fixture.HomeGoals = Int(item["goals"]?["home"]);
        fixture.AwayGoals = Int(item["goals"]?["away"]);
        return fixture;
    }

    private async Task UpsertStandingAsync(SyncTask task, JsonNode row, CancellationToken ct)
    {
        var team = await UpsertTeamAsync(row["team"]!, ct);
        var s = await FindOrAddAsync(db.Standings,
            x => x.LeagueId == task.LeagueId && x.Season == task.Season && x.TeamId == team.Id,
            () => new Standing { LeagueId = task.LeagueId, Season = task.Season, TeamId = team.Id }, ct);
        var all = row["all"]!;
        s.Rank = Int(row["rank"]) ?? 0;
        s.Points = Int(row["points"]) ?? 0;
        s.Played = Int(all["played"]) ?? 0;
        s.Won = Int(all["win"]) ?? 0;
        s.Drawn = Int(all["draw"]) ?? 0;
        s.Lost = Int(all["lose"]) ?? 0;
        s.GoalsFor = Int(all["goals"]?["for"]) ?? 0;
        s.GoalsAgainst = Int(all["goals"]?["against"]) ?? 0;
        s.Form = Str(row["form"]);
        s.Description = Str(row["description"]);
    }

    private async Task UpsertPlayerSeasonStatAsync(SyncTask task, int playerId, JsonNode stat, CancellationToken ct)
    {
        var team = await UpsertTeamAsync(stat["team"]!, ct);
        await UpsertLeagueAsync(stat["league"]!, ct);
        var s = await FindOrAddAsync(db.PlayerSeasonStats,
            x => x.PlayerId == playerId && x.TeamId == team.Id && x.LeagueId == task.LeagueId && x.Season == task.Season,
            () => new PlayerSeasonStat { PlayerId = playerId, TeamId = team.Id, LeagueId = task.LeagueId, Season = task.Season }, ct);
        FillStatLine(s, stat);
        // The API names the same position "Attacker" or "Forward" in season lines; keep one label so positions compare.
        if (s.Position == "Forward") s.Position = "Attacker";
        s.Appearances = Int(stat["games"]?["appearences"]); // sic: API spelling
        s.Lineups = Int(stat["games"]?["lineups"]);
    }

    private async Task UpsertFixturePlayerStatAsync(int fixtureId, int teamId, JsonNode p, CancellationToken ct)
    {
        // Match lines only give id, name and photo; the full profile comes from the players endpoint.
        var player = await UpsertPlayerAsync(p["player"]!, fromMatch: true, ct);
        var stat = p["statistics"]![0]!;
        var s = await FindOrAddAsync(db.FixturePlayerStats,
            x => x.FixtureId == fixtureId && x.PlayerId == player.Id,
            () => new FixturePlayerStat { FixtureId = fixtureId, PlayerId = player.Id, TeamId = teamId }, ct);
        FillStatLine(s, stat);
        s.Substitute = Bool(stat["games"]?["substitute"]);
        s.Captain = Bool(stat["games"]?["captain"]);
    }

    private static void FillStatLine(StatLine s, JsonNode st)
    {
        var games = st["games"];
        s.Position = Str(games?["position"]);
        s.Minutes = Int(games?["minutes"]);
        s.Rating = Dec(games?["rating"]) is decimal r ? Math.Round(r, 2) : null;
        s.Goals = Int(st["goals"]?["total"]);
        s.Assists = Int(st["goals"]?["assists"]);
        s.GoalsConceded = Int(st["goals"]?["conceded"]);
        s.Saves = Int(st["goals"]?["saves"]);
        s.ShotsTotal = Int(st["shots"]?["total"]);
        s.ShotsOnTarget = Int(st["shots"]?["on"]);
        s.PassesTotal = Int(st["passes"]?["total"]);
        s.PassesKey = Int(st["passes"]?["key"]);
        s.PassAccuracy = Int(st["passes"]?["accuracy"]);
        s.Tackles = Int(st["tackles"]?["total"]);
        s.Blocks = Int(st["tackles"]?["blocks"]);
        s.Interceptions = Int(st["tackles"]?["interceptions"]);
        s.DuelsTotal = Int(st["duels"]?["total"]);
        s.DuelsWon = Int(st["duels"]?["won"]);
        s.DribblesAttempts = Int(st["dribbles"]?["attempts"]);
        s.DribblesSuccess = Int(st["dribbles"]?["success"]);
        s.FoulsDrawn = Int(st["fouls"]?["drawn"]);
        s.FoulsCommitted = Int(st["fouls"]?["committed"]);
        s.YellowCards = Int(st["cards"]?["yellow"]);
        s.RedCards = Int(st["cards"]?["red"]);
        s.PenaltiesScored = Int(st["penalty"]?["scored"]);
        s.PenaltiesMissed = Int(st["penalty"]?["missed"]);
    }

    /// <summary>
    /// Loads every existing row this answer can touch in a few queries, so the upserts below
    /// only look in memory (one query per row made a full download take over an hour).
    /// </summary>
    private async Task PreloadAsync(SyncTask task, JsonNode root, CancellationToken ct)
    {
        var teamIds = new HashSet<int>();
        var playerIds = new HashSet<int>();
        var fixtureIds = new HashSet<int>();
        CollectIds(root, teamIds, playerIds, fixtureIds);

        await db.Leagues.LoadAsync(ct);
        await db.Teams.Where(t => teamIds.Contains(t.Id)).LoadAsync(ct);
        await db.Players.Where(p => playerIds.Contains(p.Id)).LoadAsync(ct);
        await db.Fixtures.Where(f => fixtureIds.Contains(f.Id)).LoadAsync(ct);
        await db.FixturePlayerStats.Where(s => fixtureIds.Contains(s.FixtureId)).LoadAsync(ct);
        await db.PlayerSeasonStats.Where(s => s.LeagueId == task.LeagueId && s.Season == task.Season && playerIds.Contains(s.PlayerId)).LoadAsync(ct);
        await db.Standings.Where(s => s.LeagueId == task.LeagueId && s.Season == task.Season).LoadAsync(ct);
    }

    private static void CollectIds(JsonNode? node, HashSet<int> teams, HashSet<int> players, HashSet<int> fixtures)
    {
        switch (node)
        {
            case JsonArray array:
                foreach (var item in array) CollectIds(item, teams, players, fixtures);
                break;
            case JsonObject obj:
                foreach (var (key, value) in obj)
                {
                    if (value is JsonObject && Int(value["id"]) is int id)
                    {
                        if (key is "team" or "home" or "away") teams.Add(id);
                        else if (key == "player") players.Add(id);
                        else if (key == "fixture") fixtures.Add(id);
                    }
                    CollectIds(value, teams, players, fixtures);
                }
                break;
        }
    }

    // Rows were preloaded (or added earlier in this task), so lookups stay in memory.
    private static Task<T> FindOrAddAsync<T>(DbSet<T> set, int id, Func<int, T> create, CancellationToken ct) where T : class
    {
        if (set.Local.FindEntry(id)?.Entity is { } existing) return Task.FromResult(existing);
        var created = create(id);
        set.Add(created);
        return Task.FromResult(created);
    }

    private static Task<T> FindOrAddAsync<T>(DbSet<T> set, Func<T, bool> match, Func<T> create, CancellationToken ct) where T : class
    {
        if (set.Local.FirstOrDefault(match) is { } existing) return Task.FromResult(existing);
        var created = create();
        set.Add(created);
        return Task.FromResult(created);
    }

    // The API mixes numbers and numeric strings ("rating": "6.9", "height": "187", "accuracy": "17").
    private static string? Str(JsonNode? n) => n is JsonValue v ? v.ToString() : null;

    private static int? Int(JsonNode? n) => Str(n) is { } s && int.TryParse(s, NumberStyles.Integer, CultureInfo.InvariantCulture, out var i) ? i : null;

    private static decimal? Dec(JsonNode? n) => Str(n) is { } s && decimal.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out var d) ? d : null;

    private static bool Bool(JsonNode? n) => n is JsonValue v && v.TryGetValue<bool>(out var b) && b;
}
