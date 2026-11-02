using Microsoft.EntityFrameworkCore;
using ScoreFoot.Data;
using ScoreFoot.Sync;

namespace ScoreFoot.Tests;

[Collection("db")]
public class SyncRunnerTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    /// <summary>Answers like API-Football for Ligue 1 2024, with only 2 player pages to keep the test short.</summary>
    private static HttpResponseMessage FakeLigue1(Uri uri)
    {
        var path = uri.AbsolutePath.Trim('/');
        var q = uri.Query;
        return FakeApi.Json(path switch
        {
            "teams" => Samples.Read("teams-league61-2024.json"),
            "standings" => Samples.Read("standings-league61-2024.json"),
            "fixtures" when q.Contains("ids=") || q.Contains("id=") && !q.Contains("league=") => Samples.Read("fixtures-ids-batch.json"),
            "fixtures" => Samples.Read("fixtures-league61-2024.json"),
            "players" => Samples.WithPagingTotal(Samples.Read("players-league61-2024-p1.json"), 2),
            _ => throw new InvalidOperationException(uri.ToString()),
        });
    }

    [Fact]
    public async Task Full_run_processes_every_task_once()
    {
        using var db = TestDb.CreateEmpty();
        var api = new FakeApi(FakeLigue1);

        Assert.Equal(RunResult.Completed, await Build.Runner(db, api, Build.Options()).RunAsync(retryFailed: false, Ct));

        // teams + standings + fixtures + 2 player pages + 16 detail batches
        Assert.Equal(21, api.Requests.Count);
        Assert.True(db.SyncTasks.All(t => t.Status == SyncTaskStatus.Done));
        Assert.Equal(21, db.RawResponses.Count());
        Assert.Equal(21, db.ApiCalls.Count());

        // A second run has nothing left to do and spends nothing.
        Assert.Equal(RunResult.Completed, await Build.Runner(db, api, Build.Options()).RunAsync(retryFailed: false, Ct));
        Assert.Equal(21, api.Requests.Count);
    }

    [Fact]
    public async Task Stops_at_the_budget_and_resumes_later()
    {
        using var db = TestDb.CreateEmpty();
        var api = new FakeApi(FakeLigue1);

        Assert.Equal(RunResult.Stopped, await Build.Runner(db, api, Build.Options(budget: 3)).RunAsync(retryFailed: false, Ct));
        Assert.Equal(3, api.Requests.Count);
        Assert.Equal(3, db.SyncTasks.Count(t => t.Status == SyncTaskStatus.Done));

        // Same day, same budget: still blocked, no request made.
        Assert.Equal(RunResult.Stopped, await Build.Runner(db, api, Build.Options(budget: 3)).RunAsync(retryFailed: false, Ct));
        Assert.Equal(3, api.Requests.Count);

        // Bigger budget (e.g. next day): finishes without redoing the first tasks.
        Assert.Equal(RunResult.Completed, await Build.Runner(db, api, Build.Options()).RunAsync(retryFailed: false, Ct));
        Assert.Equal(21, api.Requests.Count);
    }

    [Fact]
    public async Task Daily_limit_error_stops_and_keeps_the_task_pending()
    {
        using var db = TestDb.CreateEmpty();
        var calls = 0;
        var api = new FakeApi(uri => ++calls == 2 ? FakeApi.Json(Samples.DailyLimitError) : FakeLigue1(uri));

        Assert.Equal(RunResult.Stopped, await Build.Runner(db, api, Build.Options()).RunAsync(retryFailed: false, Ct));
        Assert.Equal(1, db.SyncTasks.Count(t => t.Status == SyncTaskStatus.Done));
        Assert.Equal(0, db.SyncTasks.Count(t => t.Status == SyncTaskStatus.Failed));
    }

    [Fact]
    public async Task Plan_error_fails_one_task_and_the_run_goes_on()
    {
        using var db = TestDb.CreateEmpty();
        var api = new FakeApi(uri => uri.AbsolutePath.Contains("standings") ? FakeApi.Json(Samples.Read("error-plan-ids.json")) : FakeLigue1(uri));

        Assert.Equal(RunResult.Completed, await Build.Runner(db, api, Build.Options()).RunAsync(retryFailed: false, Ct));
        var failed = Assert.Single(db.SyncTasks.Where(t => t.Status == SyncTaskStatus.Failed));
        Assert.Equal(SyncTaskType.Standings, failed.Type);
        Assert.Contains("plan", failed.LastError);

        // --retry-failed puts it back in the queue.
        var fixedApi = new FakeApi(FakeLigue1);
        await Build.Runner(db, fixedApi, Build.Options()).RunAsync(retryFailed: true, Ct);
        Assert.True(db.SyncTasks.All(t => t.Status == SyncTaskStatus.Done));
        Assert.Single(fixedApi.Requests);
    }

    [Fact]
    public async Task Network_errors_are_retried()
    {
        using var db = TestDb.CreateEmpty();
        var failures = 0;
        var api = new FakeApi(uri => uri.AbsolutePath.Contains("teams") && failures++ < 2 ? throw new HttpRequestException("connection reset") : FakeLigue1(uri));

        Assert.Equal(RunResult.Completed, await Build.Runner(db, api, Build.Options()).RunAsync(retryFailed: false, Ct));
        Assert.True(db.SyncTasks.All(t => t.Status == SyncTaskStatus.Done));
    }

    [Fact]
    public async Task Reimport_rebuilds_rows_from_saved_answers_without_api_calls()
    {
        using var db = TestDb.CreateEmpty();
        var api = new FakeApi(FakeLigue1);
        await Build.Runner(db, api, Build.Options()).RunAsync(retryFailed: false, Ct);
        await db.Players.Where(p => p.Id == 9).ExecuteUpdateAsync(u => u.SetProperty(p => p.Name, "broken"), Ct);
        var (requests, tasks) = (api.Requests.Count, db.SyncTasks.Count());

        await Build.Runner(db, api, Build.Options()).ReimportAsync(Ct);

        db.ChangeTracker.Clear();
        Assert.Equal("Achraf Hakimi", db.Players.Single(p => p.Id == 9).Name);
        Assert.Equal((requests, tasks), (api.Requests.Count, db.SyncTasks.Count()));
    }
}
