using Microsoft.EntityFrameworkCore;
using ScoreFoot.Data;

namespace ScoreFoot.Api;

public sealed record LeagueRef(int Id, string Name, string? Logo);
public sealed record StandingLine(int Rank, int Points, int Played, int Won, int Drawn, int Lost, int GoalsFor, int GoalsAgainst, string? Zone);
public sealed record TableRow(int Rank, ClubRef Club, int Played, int Won, int Drawn, int Lost, int GoalDiff, int Points, string? Zone);
public sealed record ClubMatch(int FixtureId, DateTimeOffset KickoffUtc, string Round, Opponent Opponent, bool Home, int GoalsFor, int GoalsAgainst);
public sealed record KeyPlayer(int Id, string Name, string? Photo, decimal Value);
public sealed record KeyPlayers(KeyPlayer? TopScorer, KeyPlayer? TopAssists, KeyPlayer? BestRated, KeyPlayer? MostMinutes);
public sealed record SquadPlayer(int Id, string Name, string? Photo, string? Position, int Appearances, int Minutes, int Goals, int Assists, decimal? Rating);

/// <summary>
/// Everything the club page shows for one season. Only clubs with a standing in the 5 leagues have a page;
/// squad and key players come from the club's played lines (minutes > 0) of that season.
/// </summary>
public sealed record ClubPage(
    int Id, string Name, string? Logo, string? Country, IReadOnlyList<int> Seasons, int Season, LeagueRef League,
    StandingLine Standing, StandingLine? Previous, IReadOnlyList<ClubMatch> Form, KeyPlayers KeyPlayers,
    IReadOnlyList<TableRow> Table, IReadOnlyList<ClubMatch> Results, IReadOnlyList<SquadPlayer> Squad)
{
    private static readonly string[] PositionOrder = ["Goalkeeper", "Defender", "Midfielder", "Attacker"];

    /// <summary>The page for <paramref name="season"/> (latest season with a standing when null), or null when there is none.</summary>
    public static async Task<ClubPage?> LoadAsync(ScoreFootDbContext db, int id, int? season, CancellationToken ct = default)
    {
        var team = await db.Teams.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id, ct);
        if (team is null) return null;
        var standings = await db.Standings.AsNoTracking().Where(s => s.TeamId == id).Include(s => s.League)
            .OrderByDescending(s => s.Season).ToListAsync(ct);
        if (standings.Count == 0) return null;
        var chosen = season ?? standings[0].Season;
        var standing = standings.FirstOrDefault(s => s.Season == chosen);
        if (standing is null) return null;
        var previous = standings.FirstOrDefault(s => s.Season == chosen - 1);

        var table = await db.Standings.AsNoTracking()
            .Where(s => s.LeagueId == standing.LeagueId && s.Season == chosen).Include(s => s.Team)
            .OrderBy(s => s.Rank).ToListAsync(ct);

        var fixtures = await db.Fixtures.AsNoTracking()
            .Where(f => f.LeagueId == standing.LeagueId && f.Season == chosen && (f.HomeTeamId == id || f.AwayTeamId == id)
                        && f.HomeGoals != null && f.AwayGoals != null)
            .Include(f => f.HomeTeam).Include(f => f.AwayTeam)
            .OrderByDescending(f => f.KickoffUtc).ToListAsync(ct);
        var opponentsWithPage = await PlayerPage.WithPageAsync(db, fixtures.Select(f => f.HomeTeamId == id ? f.AwayTeamId : f.HomeTeamId).Distinct().ToList(), ct);
        var results = fixtures.Select(f =>
        {
            var home = f.HomeTeamId == id;
            var opp = home ? f.AwayTeam : f.HomeTeam;
            return new ClubMatch(f.Id, f.KickoffUtc, f.Round, new Opponent(opp.Id, opp.Name, opp.Code, PlayerPage.Media(opp.LogoPath), opponentsWithPage.Contains(opp.Id)), home,
                home ? f.HomeGoals!.Value : f.AwayGoals!.Value, home ? f.AwayGoals!.Value : f.HomeGoals!.Value);
        }).ToList();

        var squad = (await db.PlayerSeasonStats.AsNoTracking()
                .Where(s => s.TeamId == id && s.Season == chosen && s.Minutes > 0).Include(s => s.Player).ToListAsync(ct))
            .Select(s => new SquadPlayer(s.PlayerId, s.Player.Name, PlayerPage.Media(s.Player.PhotoPath), s.Position,
                s.Appearances ?? 0, s.Minutes ?? 0, s.Goals ?? 0, s.Assists ?? 0, s.Rating))
            .OrderBy(p => Array.IndexOf(PositionOrder, p.Position) is var i and >= 0 ? i : PositionOrder.Length)
            .ThenByDescending(p => p.Minutes)
            .ToList();

        return new ClubPage(
            team.Id, team.Name, PlayerPage.Media(team.LogoPath), team.Country,
            standings.Select(s => s.Season).ToList(), chosen,
            new LeagueRef(standing.LeagueId, standing.League.Name, PlayerPage.Media(standing.League.LogoPath)),
            Line(standing), previous is null ? null : Line(previous),
            results.Take(PlayerPage.FormSize).ToList(), KeyPlayersOf(squad),
            table.Select(s => new TableRow(s.Rank, new ClubRef(s.TeamId, s.Team.Name, PlayerPage.Media(s.Team.LogoPath), true),
                s.Played, s.Won, s.Drawn, s.Lost, s.GoalsFor - s.GoalsAgainst, s.Points, Zones.FromDescription(s.Description))).ToList(),
            results, squad);
    }

    private static StandingLine Line(Standing s) =>
        new(s.Rank, s.Points, s.Played, s.Won, s.Drawn, s.Lost, s.GoalsFor, s.GoalsAgainst, Zones.FromDescription(s.Description));

    /// <summary>Highest value, ties broken by minutes; null when nobody has a value above 0.</summary>
    private static KeyPlayers KeyPlayersOf(IReadOnlyList<SquadPlayer> squad)
    {
        KeyPlayer? Best(IEnumerable<SquadPlayer> players, Func<SquadPlayer, decimal> value) =>
            players.Where(p => value(p) > 0).OrderByDescending(value).ThenByDescending(p => p.Minutes)
                .Select(p => new KeyPlayer(p.Id, p.Name, p.Photo, value(p))).FirstOrDefault();

        return new KeyPlayers(
            Best(squad, p => p.Goals),
            Best(squad, p => p.Assists),
            Best(squad.Where(p => p.Rating is not null && p.Minutes >= Radar.MinMinutes), p => p.Rating!.Value),
            Best(squad, p => p.Minutes));
    }
}
