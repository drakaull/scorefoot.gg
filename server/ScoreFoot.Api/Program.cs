using Microsoft.EntityFrameworkCore;
using ScoreFoot.Api;
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

var imagesPath = builder.Configuration["ImagesPath"] ?? "/data/images";

var app = builder.Build();

app.MapGet("/health", async (ScoreFootDbContext db, CancellationToken ct) =>
    await db.Database.CanConnectAsync(ct) ? Results.Ok() : Results.StatusCode(StatusCodes.Status503ServiceUnavailable));

app.MapGet("/search", async (string? q, ScoreFootDbContext db, CancellationToken ct) =>
    Search.ValidQuery(q) is { } query
        ? Results.Ok(await Search.RunAsync(db, query, ct))
        : Results.BadRequest(new { error = "q must be 2 to 50 characters long" }));

app.MapGet("/players/{id:int}", async (int id, int? season, ScoreFootDbContext db, CancellationToken ct) =>
    await PlayerPage.LoadAsync(db, id, season, ct) is { } page ? Results.Ok(page) : Results.NotFound());

app.MapGet("/clubs/{id:int}", async (int id, int? season, ScoreFootDbContext db, CancellationToken ct) =>
    await ClubPage.LoadAsync(db, id, season, ct) is { } page ? Results.Ok(page) : Results.NotFound());

app.MapGet("/leaderboards/{stat}", async (string stat, int? season, int? league, string? position, string? age, string? mode,
    ScoreFootDbContext db, CancellationToken ct) =>
{
    if (!Leaderboard.IsStat(stat)) return Results.NotFound();
    var (result, error) = await Leaderboard.RunAsync(db, new LeaderboardQuery(stat, season, league, position, age, mode), ct);
    return result is not null ? Results.Ok(result) : Results.BadRequest(new { error });
});

app.MapGet("/media/{**path}", (string? path, HttpResponse response) =>
{
    if (Media.Resolve(imagesPath, path) is not { } file || !File.Exists(file)) return Results.NotFound();
    response.Headers.CacheControl = "public, max-age=604800"; // an image never changes for a given id
    response.Headers.XContentTypeOptions = "nosniff";
    return TypedResults.PhysicalFile(Path.GetFullPath(file), "image/png");
});

app.Run();
return 0;
