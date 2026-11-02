using System.Net;
using ScoreFoot.Data;
using ScoreFoot.Sync;

namespace ScoreFoot.Tests;

[Collection("db")]
public class ApiFootballClientTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task Budget_reached_makes_no_call()
    {
        using var db = TestDb.CreateEmpty();
        db.ApiCalls.AddRange(
            new ApiCall { CalledAt = DateTimeOffset.UtcNow, Endpoint = "teams", HttpStatus = 200 },
            new ApiCall { CalledAt = DateTimeOffset.UtcNow, Endpoint = "teams", HttpStatus = 200 });
        await db.SaveChangesAsync(Ct);
        var api = new FakeApi(_ => FakeApi.Json(Samples.Read("teams-league61-2024.json")));

        await Assert.ThrowsAsync<ApiStopException>(() => Build.Client(db, api, Build.Options(budget: 2)).GetAsync("teams", "league=61&season=2024", Ct));
        Assert.Empty(api.Requests);
    }

    [Fact]
    public async Task Calls_from_yesterday_do_not_count()
    {
        using var db = TestDb.CreateEmpty();
        db.ApiCalls.Add(new ApiCall { CalledAt = DateTimeOffset.UtcNow.AddDays(-1), Endpoint = "teams", HttpStatus = 200 });
        await db.SaveChangesAsync(Ct);
        var api = new FakeApi(_ => FakeApi.Json(Samples.Read("teams-league61-2024.json")));

        await Build.Client(db, api, Build.Options(budget: 1)).GetAsync("teams", "league=61&season=2024", Ct);
        Assert.Single(api.Requests);
    }

    [Fact]
    public async Task Every_call_is_logged_even_when_it_fails()
    {
        using var db = TestDb.CreateEmpty();
        var api = new FakeApi(_ => FakeApi.Json(Samples.Read("error-plan-ids.json")));

        var ex = await Assert.ThrowsAsync<ApiTaskException>(() => Build.Client(db, api, Build.Options()).GetAsync("fixtures", "ids=1-2", Ct));
        Assert.Contains("plan", ex.Message);
        Assert.Equal(1, db.ApiCalls.Count());
    }

    [Fact]
    public async Task Daily_limit_error_stops_the_run()
    {
        using var db = TestDb.CreateEmpty();
        var api = new FakeApi(_ => FakeApi.Json(Samples.DailyLimitError));
        await Assert.ThrowsAsync<ApiStopException>(() => Build.Client(db, api, Build.Options()).GetAsync("teams", "league=61&season=2024", Ct));
    }

    [Fact]
    public async Task Http_429_stops_and_5xx_is_a_network_error()
    {
        using var db = TestDb.CreateEmpty();
        var tooMany = new FakeApi(_ => FakeApi.Json("{}", HttpStatusCode.TooManyRequests));
        await Assert.ThrowsAsync<ApiStopException>(() => Build.Client(db, tooMany, Build.Options()).GetAsync("teams", "x=1", Ct));

        var down = new FakeApi(_ => FakeApi.Json("{}", HttpStatusCode.BadGateway));
        await Assert.ThrowsAsync<HttpRequestException>(() => Build.Client(db, down, Build.Options()).GetAsync("teams", "x=1", Ct));
    }
}
