using ScoreFoot.Data;

namespace ScoreFoot.Sync;

public static class TaskPlanner
{
    public static readonly string[] FinishedStatuses = ["FT", "AET", "PEN"];

    /// <summary>First tasks of every league-season that has none yet: teams → standings → fixtures → players page 1.</summary>
    public static IEnumerable<SyncTask> SeedTasks(SyncOptions options, ISet<(int League, int Season)> alreadyPlanned, DateTimeOffset now)
    {
        foreach (var season in options.Seasons)
            foreach (var league in options.Leagues)
            {
                if (alreadyPlanned.Contains((league, season))) continue;
                yield return New(SyncTaskType.Teams, league, season, now);
                yield return New(SyncTaskType.Standings, league, season, now);
                yield return New(SyncTaskType.Fixtures, league, season, now);
                yield return New(SyncTaskType.Players, league, season, now, page: 1);
            }
    }

    // shortcut: creates detail tasks for every finished fixture of the list, fine for the one-off download; re-syncing a season later would need to skip fixtures already detailed.
    public static IEnumerable<SyncTask> FixtureDetailTasks(int league, int season, IEnumerable<int> finishedFixtureIds, int batchSize, DateTimeOffset now) =>
        finishedFixtureIds.Chunk(batchSize).Select(ids => New(SyncTaskType.FixtureDetails, league, season, now, fixtureIds: string.Join('-', ids)));

    public static IEnumerable<SyncTask> PlayerPageTasks(int league, int season, int totalPages, DateTimeOffset now) =>
        Enumerable.Range(2, Math.Max(0, totalPages - 1)).Select(page => New(SyncTaskType.Players, league, season, now, page: page));

    /// <summary>Next task to run: seasons and leagues in configuration order, then creation order.</summary>
    public static long? NextId(IEnumerable<(long Id, int League, int Season)> pending, SyncOptions options) =>
        pending
            .OrderBy(t => Rank(options.Seasons, t.Season))
            .ThenBy(t => Rank(options.Leagues, t.League))
            .ThenBy(t => t.Id)
            .Select(t => (long?)t.Id)
            .FirstOrDefault();

    public static (string Endpoint, string Query) Request(SyncTask task) => task.Type switch
    {
        SyncTaskType.Teams => ("teams", $"league={task.LeagueId}&season={task.Season}"),
        SyncTaskType.Standings => ("standings", $"league={task.LeagueId}&season={task.Season}"),
        SyncTaskType.Fixtures => ("fixtures", $"league={task.LeagueId}&season={task.Season}"),
        SyncTaskType.Players => ("players", $"league={task.LeagueId}&season={task.Season}&page={task.Page}"),
        // The free plan refuses "ids", so a batch of one uses "id".
        SyncTaskType.FixtureDetails => ("fixtures", task.FixtureIds!.Contains('-') ? $"ids={task.FixtureIds}" : $"id={task.FixtureIds}"),
        _ => throw new ArgumentOutOfRangeException(nameof(task), task.Type, null),
    };

    private static int Rank(int[] order, int value) => Array.IndexOf(order, value) is var i and >= 0 ? i : int.MaxValue;

    private static SyncTask New(SyncTaskType type, int league, int season, DateTimeOffset now, int? page = null, string? fixtureIds = null) => new()
    {
        Type = type, LeagueId = league, Season = season, Page = page, FixtureIds = fixtureIds,
        Status = SyncTaskStatus.Pending, CreatedAt = now, UpdatedAt = now,
    };
}
