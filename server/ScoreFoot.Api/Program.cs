using Microsoft.EntityFrameworkCore;
using ScoreFoot.Data;

// Used by the Compose healthcheck: the runtime image has no curl.
if (args is ["healthcheck"])
{
    var port = Environment.GetEnvironmentVariable("ASPNETCORE_HTTP_PORTS") ?? "8080";
    using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(3) };
    try { return (await http.GetAsync($"http://localhost:{port}/health")).IsSuccessStatusCode ? 0 : 1; }
    catch (HttpRequestException) { return 1; }
}

var builder = WebApplication.CreateBuilder(args);
// Read-only api: no tracking needed, and migrations are applied by ScoreFoot.Sync.
builder.Services.AddDbContext<ScoreFootDbContext>(o => o
    .UseNpgsql(Database.ConnectionStringFromEnvironment())
    .UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking));

var app = builder.Build();

app.MapGet("/health", async (ScoreFootDbContext db, CancellationToken ct) =>
    await db.Database.CanConnectAsync(ct) ? Results.Ok() : Results.StatusCode(StatusCodes.Status503ServiceUnavailable));

app.Run();
return 0;
