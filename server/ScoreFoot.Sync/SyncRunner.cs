using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ScoreFoot.Data;

namespace ScoreFoot.Sync;

public enum RunResult { Completed, Stopped }

public sealed class SyncRunner(ScoreFootDbContext db, ApiFootballClient api, SyncOptions options, TimeProvider clock, ILogger<SyncRunner> log)
{
    public async Task<RunResult> RunAsync(bool retryFailed, CancellationToken ct = default)
    {
        if (retryFailed)
        {
            var reset = await db.SyncTasks.Where(t => t.Status == SyncTaskStatus.Failed)
                .ExecuteUpdateAsync(u => u.SetProperty(t => t.Status, SyncTaskStatus.Pending), ct);
            log.LogInformation("{Count} failed tasks set back to pending", reset);
        }

        var planned = (await db.SyncTasks.Select(t => new { t.LeagueId, t.Season }).Distinct().ToListAsync(ct))
            .Select(x => (x.LeagueId, x.Season)).ToHashSet();
        db.SyncTasks.AddRange(TaskPlanner.SeedTasks(options, planned, clock.GetUtcNow()));
        await db.SaveChangesAsync(ct);

        int done = 0, failed = 0;
        while (true)
        {
            db.ChangeTracker.Clear();
            var pending = await db.SyncTasks.Where(t => t.Status == SyncTaskStatus.Pending)
                .Select(t => new { t.Id, t.LeagueId, t.Season }).ToListAsync(ct);
            if (TaskPlanner.NextId(pending.Select(p => (p.Id, p.LeagueId, p.Season)), options) is not { } nextId)
            {
                log.LogInformation("All tasks processed: {Done} done, {Failed} failed in this run", done, failed);
                return RunResult.Completed;
            }

            var task = await db.SyncTasks.SingleAsync(t => t.Id == nextId, ct);
            var (endpoint, query) = TaskPlanner.Request(task);
            string body;
            try
            {
                body = await GetWithRetriesAsync(endpoint, query, ct);
            }
            catch (ApiStopException ex)
            {
                log.LogWarning("Run stopped: {Reason}. {Done} tasks done in this run; the rest stays pending", ex.Message, done);
                return RunResult.Stopped;
            }
            catch (Exception ex) when (ex is ApiTaskException or HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested)
            {
                await MarkFailedAsync(task, ex.Message, ct);
                failed++;
                continue;
            }

            try
            {
                await using var tx = await db.Database.BeginTransactionAsync(ct);
                var now = clock.GetUtcNow();
                db.RawResponses.Add(new RawResponse { Endpoint = endpoint, Parameters = query, FetchedAt = now, Body = body });
                await new Importer(db, options, now).ImportAsync(task, body, ct);
                task.Status = SyncTaskStatus.Done;
                task.Attempts++;
                task.UpdatedAt = now;
                await db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
                done++;
                log.LogInformation("Done {Type} league {League} season {Season} {Detail}", task.Type, task.LeagueId, task.Season, task.Page?.ToString() ?? task.FixtureIds);
            }
            catch (Exception ex) when (!ct.IsCancellationRequested)
            {
                // Rolled back: no partial rows. The answer is not kept, so a retry costs one request.
                log.LogError(ex, "Import failed for task {Id}", task.Id);
                db.ChangeTracker.Clear();
                await MarkFailedAsync(await db.SyncTasks.SingleAsync(t => t.Id == task.Id, ct), ex.Message, ct);
                failed++;
            }
        }
    }

    private async Task<string> GetWithRetriesAsync(string endpoint, string query, CancellationToken ct)
    {
        for (var attempt = 0; ; attempt++)
        {
            try
            {
                return await api.GetAsync(endpoint, query, ct);
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested && attempt < options.RetryDelaysSeconds.Length)
            {
                var delay = TimeSpan.FromSeconds(options.RetryDelaysSeconds[attempt]);
                log.LogWarning("Network error ({Message}), retry in {Delay}s", ex.Message, delay.TotalSeconds);
                await Task.Delay(delay, clock, ct);
            }
        }
    }

    /// <summary>
    /// Re-applies every saved players and match-detail answer, in their original order, without any API call.
    /// Used after a fix to the import (e.g. player names before 2026-11-02). Match lists are skipped:
    /// they would plan detail tasks again.
    /// </summary>
    public async Task<int> ReimportAsync(CancellationToken ct = default)
    {
        var saved = await db.RawResponses
            .Where(r => r.Endpoint == "players" || r.Endpoint == "fixtures" && !r.Parameters.StartsWith("league="))
            .OrderBy(r => r.Id).Select(r => r.Id).ToListAsync(ct);
        foreach (var id in saved)
        {
            db.ChangeTracker.Clear();
            var raw = await db.RawResponses.SingleAsync(r => r.Id == id, ct);
            var query = raw.Parameters.Split('&').Select(p => p.Split('=')).ToDictionary(p => p[0], p => p[1]);
            // Page left empty on purpose: page 1 would plan the follow-up pages again.
            var task = raw.Endpoint == "players"
                ? new SyncTask { Type = SyncTaskType.Players, LeagueId = int.Parse(query["league"]), Season = int.Parse(query["season"]) }
                : new SyncTask { Type = SyncTaskType.FixtureDetails };
            await new Importer(db, options, clock.GetUtcNow()).ImportAsync(task, raw.Body, ct);
            await db.SaveChangesAsync(ct);
        }
        log.LogInformation("Re-imported {Count} saved answers", saved.Count);
        return saved.Count;
    }

    private async Task MarkFailedAsync(SyncTask task, string error, CancellationToken ct)
    {
        task.Status = SyncTaskStatus.Failed;
        task.Attempts++;
        task.LastError = error;
        task.UpdatedAt = clock.GetUtcNow();
        await db.SaveChangesAsync(ct);
        log.LogWarning("Task {Id} ({Type} league {League} season {Season}) failed: {Error}", task.Id, task.Type, task.LeagueId, task.Season, error);
    }
}
