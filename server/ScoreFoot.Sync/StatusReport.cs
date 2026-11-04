using System.Text;
using Microsoft.EntityFrameworkCore;
using ScoreFoot.Data;

namespace ScoreFoot.Sync;

/// <summary>Progress summary read from the database only: never calls the API.</summary>
public static class StatusReport
{
    public static async Task<string> BuildAsync(ScoreFootDbContext db, SyncOptions options, TimeProvider clock, CancellationToken ct = default)
    {
        var startOfDay = new DateTimeOffset(clock.GetUtcNow().UtcDateTime.Date, TimeSpan.Zero);
        var usedToday = await db.ApiCalls.CountAsync(c => c.CalledAt >= startOfDay, ct);
        var tasks = await db.SyncTasks.GroupBy(t => new { t.LeagueId, t.Season, t.Status })
            .Select(g => new { g.Key.LeagueId, g.Key.Season, g.Key.Status, Count = g.Count() }).ToListAsync(ct);
        int Count(int league, int season, SyncTaskStatus status) =>
            tasks.Where(t => t.LeagueId == league && t.Season == season && t.Status == status).Sum(t => t.Count);

        var sb = new StringBuilder();
        sb.AppendLine($"API requests today (UTC): {usedToday} / {options.DailyBudget}");
        sb.AppendLine();
        sb.AppendLine("Season  League  Done  Pending  Failed");
        foreach (var season in options.Seasons)
            foreach (var league in options.Leagues)
                sb.AppendLine($"{season,-7} {league,-7} {Count(league, season, SyncTaskStatus.Done),4}  {Count(league, season, SyncTaskStatus.Pending),7}  {Count(league, season, SyncTaskStatus.Failed),6}");

        var pending = tasks.Where(t => t.Status == SyncTaskStatus.Pending).Sum(t => t.Count);
        var unplanned = options.Seasons.Length * options.Leagues.Length - tasks.Select(t => (t.LeagueId, t.Season)).Distinct().Count();
        sb.AppendLine();
        sb.AppendLine($"Pending tasks: {pending} (1 request each){(unplanned > 0 ? $"; {unplanned} league-seasons not planned yet" : "")}");
        if (pending > 0 && options.DailyBudget > 0)
            sb.AppendLine($"Days left at this budget: about {Math.Ceiling(pending / (double)options.DailyBudget)} (more tasks appear as lists are fetched)");
        sb.AppendLine($"Failed tasks: {tasks.Where(t => t.Status == SyncTaskStatus.Failed).Sum(t => t.Count)} (rerun with: run --retry-failed)");
        sb.AppendLine();
        sb.AppendLine($"Rows: {await db.Leagues.CountAsync(ct)} leagues, {await db.Teams.CountAsync(ct)} teams, {await db.Players.CountAsync(ct)} players, " +
                      $"{await db.Fixtures.CountAsync(ct)} fixtures, {await db.FixturePlayerStats.CountAsync(ct)} match player lines, " +
                      $"{await db.PlayerSeasonStats.CountAsync(ct)} season player lines, {await db.Standings.CountAsync(ct)} standings");
        sb.AppendLine($"Images missing: {await db.Teams.CountAsync(t => t.LogoUrl != null && t.LogoPath == null, ct)} team logos, " +
                      $"{await db.Players.CountAsync(p => p.PhotoUrl != null && p.PhotoPath == null, ct)} player photos");
        return sb.ToString();
    }
}
