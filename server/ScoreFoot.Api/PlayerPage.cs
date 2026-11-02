using Microsoft.EntityFrameworkCore;
using ScoreFoot.Data;

namespace ScoreFoot.Api;

public sealed record ClubRef(int Id, string Name, string? Logo);
public sealed record SeasonClub(int Id, string Name, string? Logo, string League);
public sealed record Summary(int Appearances, int Minutes, int Goals, int Assists, decimal? Rating);
public sealed record Opponent(int Id, string Name, string? Code, string? Logo);
public sealed record FormMatch(int FixtureId, DateTimeOffset KickoffUtc, Opponent Opponent, bool Home,
    int? GoalsFor, int? GoalsAgainst, int Minutes, decimal? Rating, int Goals, int Assists);
public sealed record HistoryRow(int Season, ClubRef Club, string League, int Appearances, int Minutes, int Goals, int Assists, decimal? Rating);

/// <summary>
/// Everything the player page shows for one season. Only played lines (minutes > 0) count: the API also lists
/// squad members who never played. Missing counts on a played line are 0; a missing rating is left out.
/// </summary>
public sealed record PlayerPage(
    int Id, string Name, string? Photo, DateOnly? BirthDate, string? Nationality, int? HeightCm,
    IReadOnlyList<int> Seasons, int Season, string? Position, IReadOnlyList<SeasonClub> Clubs,
    Summary Summary, Summary? Previous, IReadOnlyList<FormMatch> Form, IReadOnlyList<HistoryRow> History)
{
    public const int FormSize = 5;

    /// <summary>The page for <paramref name="season"/> (latest played season when null), or null when there is none.</summary>
    public static async Task<PlayerPage?> LoadAsync(ScoreFootDbContext db, int id, int? season, CancellationToken ct = default)
    {
        var player = await db.Players.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id, ct);
        if (player is null) return null;
        var lines = await db.PlayerSeasonStats.AsNoTracking()
            .Where(s => s.PlayerId == id && s.Minutes > 0)
            .Include(s => s.Team).Include(s => s.League)
            .OrderByDescending(s => s.Season).ThenByDescending(s => s.Minutes)
            .ToListAsync(ct);
        if (lines.Count == 0) return null;

        var seasons = lines.Select(l => l.Season).Distinct().ToList();
        var chosen = season ?? seasons[0];
        var current = lines.Where(l => l.Season == chosen).ToList();
        if (current.Count == 0) return null;
        var previous = lines.Where(l => l.Season == chosen - 1).ToList();

        var matches = await db.FixturePlayerStats.AsNoTracking()
            .Where(s => s.PlayerId == id && s.Minutes > 0 && s.Fixture.Season == chosen)
            .OrderByDescending(s => s.Fixture.KickoffUtc).Take(FormSize)
            .Include(s => s.Fixture.HomeTeam).Include(s => s.Fixture.AwayTeam)
            .ToListAsync(ct);
        var form = matches.Select(s =>
        {
            var f = s.Fixture;
            var home = s.TeamId == f.HomeTeamId;
            var opp = home ? f.AwayTeam : f.HomeTeam;
            return new FormMatch(f.Id, f.KickoffUtc, new Opponent(opp.Id, opp.Name, opp.Code, Media(opp.LogoPath)), home,
                home ? f.HomeGoals : f.AwayGoals, home ? f.AwayGoals : f.HomeGoals,
                s.Minutes ?? 0, s.Rating, s.Goals ?? 0, s.Assists ?? 0);
        }).ToList();

        return new PlayerPage(
            player.Id, player.Name, Media(player.PhotoPath), player.BirthDate, player.Nationality, player.HeightCm,
            seasons, chosen, current[0].Position,
            current.Select(l => new SeasonClub(l.TeamId, l.Team.Name, Media(l.Team.LogoPath), l.League.Name)).ToList(),
            Summarize(current), previous.Count > 0 ? Summarize(previous) : null, form,
            lines.Select(l => new HistoryRow(l.Season, new ClubRef(l.TeamId, l.Team.Name, Media(l.Team.LogoPath)), l.League.Name,
                l.Appearances ?? 0, l.Minutes ?? 0, l.Goals ?? 0, l.Assists ?? 0, l.Rating)).ToList());
    }

    private static Summary Summarize(IReadOnlyList<PlayerSeasonStat> lines) => new(
        lines.Sum(l => l.Appearances ?? 0), lines.Sum(l => l.Minutes ?? 0),
        lines.Sum(l => l.Goals ?? 0), lines.Sum(l => l.Assists ?? 0), WeightedRating(lines));

    /// <summary>Ratings weighted by minutes, lines without a rating left out; null when no line has one.</summary>
    internal static decimal? WeightedRating(IEnumerable<StatLine> lines)
    {
        var rated = lines.Where(l => l.Rating is not null && l.Minutes > 0).ToList();
        return rated.Count == 0 ? null
            : Math.Round(rated.Sum(l => l.Rating!.Value * l.Minutes!.Value) / rated.Sum(l => l.Minutes!.Value), 2);
    }

    internal static string? Media(string? path) => path is null ? null : "/media/" + path;
}
