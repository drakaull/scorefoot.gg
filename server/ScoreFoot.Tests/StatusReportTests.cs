using ScoreFoot.Sync;

namespace ScoreFoot.Tests;

[Collection("db")]
public class StatusReportTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Reports_progress_without_calling_the_api()
    {
        using var db = TestDb.CreateEmpty();
        var calls = 0;
        var api = new FakeApi(uri => ++calls > 3 ? FakeApi.Json(Samples.DailyLimitError) : FakeApi.Json(uri.AbsolutePath.Contains("teams")
            ? Samples.Read("teams-league61-2024.json") : uri.AbsolutePath.Contains("standings")
            ? Samples.Read("standings-league61-2024.json") : Samples.Read("fixtures-league61-2024.json")));
        await Build.Runner(db, api, Build.Options()).RunAsync(retryFailed: false, Ct);
        var requestsBefore = api.Requests.Count;

        var report = await StatusReport.BuildAsync(db, Build.Options(), TimeProvider.System, Ct);

        Assert.Equal(requestsBefore, api.Requests.Count);
        Assert.Contains("API requests today (UTC): 4 / 1000", report);
        Assert.Contains("2024    61         3       17       0", report); // teams, standings, fixtures done; players + 16 batches left
        Assert.Contains("308 fixtures", report);
    }
}
