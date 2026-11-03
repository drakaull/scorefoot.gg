using Microsoft.EntityFrameworkCore;
using ScoreFoot.Data;

namespace ScoreFoot.Api;

public sealed record LeaderboardQuery(string Stat, int? Season, int? League, string? Position, string? Age, string? Mode);
public sealed record LeaderboardPlayer(int Id, string Name, string? Photo);
public sealed record LeaderboardRow(int Rank, LeaderboardPlayer Player, ClubRef Club, string? Position, int Appearances, int Minutes, decimal Value, decimal? Per90);
public sealed record LeagueOption(int Id, string Name);
public sealed record LeaderboardResult(
    string Stat, string Mode, int Season, int? League, string? Position, string? Age, int? MinMinutes,
    IReadOnlyList<int> Seasons, IReadOnlyList<LeagueOption> Leagues, IReadOnlyList<LeaderboardRow> Rows);

/// <summary>
/// Players ranked by one stat over a season (spec 05). One row per player: his played lines of the season
/// (in the chosen league) added up. Rating and per-90 rankings need <see cref="Radar.MinMinutes"/> minutes.
/// </summary>
public static class Leaderboard
{
    public const int MaxRows = 50;

    /// <param name="Count">The count behind the stat, for per-90 values; null when per 90 makes no sense.</param>
    private sealed record StatDef(Func<SeasonTotals, decimal?> Total, Func<SeasonTotals, int>? Count);

    private static StatDef CountStat(Func<SeasonTotals, int> count) => new(t => count(t), count);

    private static readonly Dictionary<string, StatDef> Defs = new()
    {
        ["goals"] = CountStat(t => t.Goals),
        ["assists"] = CountStat(t => t.Assists),
        ["goalsAssists"] = CountStat(t => t.Goals + t.Assists),
        ["rating"] = new(t => t.Rating, null),
        ["minutes"] = new(t => t.Minutes, null),
        ["shotsOnTarget"] = CountStat(t => t.ShotsOnTarget),
        ["keyPasses"] = CountStat(t => t.KeyPasses),
        ["dribbles"] = CountStat(t => t.DribblesSuccess),
        ["tackles"] = CountStat(t => t.Tackles),
        ["interceptions"] = CountStat(t => t.Interceptions),
        ["duelsWon"] = CountStat(t => t.DuelsWon),
        ["saves"] = CountStat(t => t.Saves),
    };

    public static IReadOnlyList<string> Stats { get; } = [.. Defs.Keys];
    private static readonly string[] Positions = ["Goalkeeper", "Defender", "Midfielder", "Attacker"];
    private static readonly Dictionary<string, int> MaxAge = new() { ["u21"] = 21, ["u23"] = 23 };

    public static bool IsStat(string stat) => Defs.ContainsKey(stat);

    /// <summary>The ranking, or an error message for an invalid parameter (the endpoint answers 400).</summary>
    public static async Task<(LeaderboardResult? Result, string? Error)> RunAsync(ScoreFootDbContext db, LeaderboardQuery q, CancellationToken ct = default)
    {
        if (!Defs.TryGetValue(q.Stat, out var def)) return (null, "unknown stat");
        var seasons = await db.Standings.Select(s => s.Season).Distinct().OrderByDescending(s => s).ToListAsync(ct);
        var leagues = await db.Leagues.Where(l => db.Standings.Any(s => s.LeagueId == l.Id))
            .OrderBy(l => l.Name).Select(l => new LeagueOption(l.Id, l.Name)).ToListAsync(ct);
        var season = q.Season ?? seasons.FirstOrDefault();
        var mode = q.Mode ?? "total";
        if (!seasons.Contains(season)) return (null, "unknown season");
        if (q.League is { } lg && leagues.All(l => l.Id != lg)) return (null, "unknown league");
        if (q.Position is not null && !Positions.Contains(q.Position)) return (null, "unknown position");
        if (q.Age is not null && !MaxAge.ContainsKey(q.Age)) return (null, "age must be u21 or u23");
        if (mode is not ("total" or "per90")) return (null, "mode must be total or per90");
        if (mode == "per90" && def.Count is null) return (null, "no per-90 value for this stat");

        var perNinety = mode == "per90";
        int? minMinutes = perNinety || q.Stat == "rating" ? Radar.MinMinutes : null;
        // Under 21 on 1 July of the season's first year = born after this day.
        DateOnly? bornAfter = q.Age is null ? null : new DateOnly(season, 7, 1).AddYears(-MaxAge[q.Age]);

        var lines = await db.PlayerSeasonStats.AsNoTracking()
            .Where(s => s.Season == season && s.Minutes > 0 && (q.League == null || s.LeagueId == q.League))
            .Include(s => s.Player).Include(s => s.Team)
            .ToListAsync(ct);

        var ranked = lines.GroupBy(l => l.PlayerId)
            .Select(g =>
            {
                var main = g.MaxBy(l => l.Minutes)!;
                var totals = SeasonTotals.From(g.ToList());
                var value = perNinety ? totals.Per90(def.Count!(totals)) : def.Total(totals);
                return (Lines: g.ToList(), main.Player, main.Position, Totals: totals, Value: value);
            })
            .Where(p => q.Position is null || p.Position == q.Position)
            .Where(p => bornAfter is null || p.Player.BirthDate > bornAfter)
            .Where(p => minMinutes is null || p.Totals.Minutes >= minMinutes)
            .Where(p => p.Value > 0)
            .OrderByDescending(p => p.Value).ThenBy(p => p.Totals.Minutes).ThenBy(p => p.Player.Name)
            .Take(MaxRows)
            .ToList();

        var lastClub = await LastClubAsync(db, ranked.Select(p => p.Player.Id).ToList(), season, q.League, ct);
        var withPage = await PlayerPage.WithPageAsync(db, ranked.SelectMany(p => p.Lines.Select(l => l.TeamId)).Distinct().ToList(), ct);

        var rows = ranked.Select((p, i) =>
        {
            // Club of his last match; without match data, the club he played the most minutes for.
            var line = p.Lines.FirstOrDefault(l => lastClub.TryGetValue(p.Player.Id, out var team) && l.TeamId == team)
                       ?? p.Lines.MaxBy(l => l.Minutes)!;
            return new LeaderboardRow(i + 1,
                new LeaderboardPlayer(p.Player.Id, p.Player.Name, PlayerPage.Media(p.Player.PhotoPath)),
                new ClubRef(line.TeamId, line.Team.Name, PlayerPage.Media(line.Team.LogoPath), withPage.Contains(line.TeamId)),
                p.Position, p.Totals.Appearances, p.Totals.Minutes, Math.Round(p.Value!.Value, 2),
                def.Count is null ? null : p.Totals.Per90(def.Count(p.Totals)));
        }).ToList();

        return (new LeaderboardResult(q.Stat, mode, season, q.League, q.Position, q.Age, minMinutes, seasons, leagues, rows), null);
    }

    /// <summary>For each player, the club of his last played match of the season (in the league, when filtered).</summary>
    private static async Task<Dictionary<int, int>> LastClubAsync(ScoreFootDbContext db, List<int> players, int season, int? league, CancellationToken ct)
    {
        var matches = await db.FixturePlayerStats.AsNoTracking()
            .Where(s => players.Contains(s.PlayerId) && s.Minutes > 0 && s.Fixture.Season == season
                        && (league == null || s.Fixture.LeagueId == league))
            .Select(s => new { s.PlayerId, s.TeamId, s.Fixture.KickoffUtc })
            .ToListAsync(ct);
        return matches.GroupBy(m => m.PlayerId).ToDictionary(g => g.Key, g => g.MaxBy(m => m.KickoffUtc)!.TeamId);
    }
}
