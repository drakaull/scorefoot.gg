using ScoreFoot.Data;
using ScoreFoot.Sync;

namespace ScoreFoot.Tests;

public class TaskPlannerTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.UtcNow;

    [Theory]
    [InlineData(20, 16)]  // 308 finished matches → 15 batches of 20 + 1 of 8
    [InlineData(1, 308)]  // free plan: one match per request
    public void Detail_tasks_follow_the_batch_size(int batchSize, int expectedTasks)
    {
        var tasks = TaskPlanner.FixtureDetailTasks(61, 2024, Enumerable.Range(1, 308), batchSize, Now).ToList();
        Assert.Equal(expectedTasks, tasks.Count);
        Assert.Equal(308, tasks.Sum(t => t.FixtureIds!.Split('-').Length));
    }

    [Fact]
    public void Batch_uses_ids_and_single_uses_id()
    {
        Assert.Equal("ids=1-2", TaskPlanner.Request(new SyncTask { Type = SyncTaskType.FixtureDetails, FixtureIds = "1-2" }).Query);
        Assert.Equal("id=1", TaskPlanner.Request(new SyncTask { Type = SyncTaskType.FixtureDetails, FixtureIds = "1" }).Query);
    }

    [Fact]
    public void Player_pages_start_at_two()
    {
        Assert.Equal([2, 3, 4], TaskPlanner.PlayerPageTasks(61, 2024, 4, Now).Select(t => t.Page!.Value));
        Assert.Empty(TaskPlanner.PlayerPageTasks(61, 2024, 1, Now));
    }

    [Fact]
    public void Seed_skips_planned_league_seasons_and_keeps_order()
    {
        var options = new SyncOptions { Leagues = [39, 61], Seasons = [2025, 2024] };
        var tasks = TaskPlanner.SeedTasks(options, new HashSet<(int, int)> { (39, 2025) }, Now).ToList();
        Assert.Equal(12, tasks.Count);
        Assert.Equal((61, 2025, SyncTaskType.Teams), (tasks[0].LeagueId, tasks[0].Season, tasks[0].Type));
        Assert.Equal(SyncTaskType.Players, tasks[3].Type);
    }

    [Fact]
    public void Next_follows_season_then_league_order()
    {
        var options = new SyncOptions { Leagues = [39, 61], Seasons = [2025, 2024] };
        (long, int, int)[] pending = [(1, 39, 2024), (2, 61, 2025), (3, 39, 2025)];
        Assert.Equal(3, TaskPlanner.NextId(pending, options));
        Assert.Null(TaskPlanner.NextId([], options));
    }
}
