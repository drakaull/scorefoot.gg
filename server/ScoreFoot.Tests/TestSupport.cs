using System.Net;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
using ScoreFoot.Data;
using ScoreFoot.Sync;

namespace ScoreFoot.Tests;

[CollectionDefinition("db", DisableParallelization = true)]
public class DbCollection;

/// <summary>
/// A separate "<POSTGRES_DB>_test" database on the Docker Compose PostgreSQL (docker compose up -d db).
/// Credentials come from env vars, or from the repo's .env when tests run from the editor.
/// </summary>
public static class TestDb
{
    private static readonly Lazy<string> ConnectionString = new(() =>
    {
        LoadDotEnvIfNeeded();
        var cs = new NpgsqlConnectionStringBuilder(Database.ConnectionStringFromEnvironment());
        cs.Database += "_test";
        using var db = new ScoreFootDbContext(new DbContextOptionsBuilder<ScoreFootDbContext>().UseNpgsql(cs.ConnectionString).Options);
        db.Database.EnsureDeleted();
        db.Database.Migrate();
        return cs.ConnectionString;
    });

    /// <summary>A context on an empty test database.</summary>
    public static ScoreFootDbContext CreateEmpty()
    {
        var db = new ScoreFootDbContext(new DbContextOptionsBuilder<ScoreFootDbContext>().UseNpgsql(ConnectionString.Value).Options);
        var tables = string.Join(", ", db.Model.GetEntityTypes().Select(t => $"\"{t.GetTableName()}\""));
#pragma warning disable EF1002 // table names come from our own model, not from input
        db.Database.ExecuteSqlRaw($"TRUNCATE {tables} RESTART IDENTITY CASCADE");
#pragma warning restore EF1002
        return db;
    }

    private static void LoadDotEnvIfNeeded()
    {
        if (Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") is { Length: > 0 }) return;
        for (var dir = new DirectoryInfo(AppContext.BaseDirectory); dir is not null; dir = dir.Parent)
        {
            var file = Path.Combine(dir.FullName, ".env");
            if (!File.Exists(file)) continue;
            foreach (var line in File.ReadAllLines(file))
                if (line.Split('=', 2) is [var key, var value] && !key.TrimStart().StartsWith('#') && key.StartsWith("POSTGRES_"))
                    Environment.SetEnvironmentVariable(key.Trim(), value.Trim());
            return;
        }
    }
}

public static class Samples
{
    public static string Read(string name) => File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", name));

    public static string WithPagingTotal(string body, int total)
    {
        var node = JsonNode.Parse(body)!;
        node["paging"]!["total"] = total;
        return node.ToJsonString();
    }

    public const string DailyLimitError = """{"errors":{"requests":"You have reached the request limit for the day"},"response":[]}""";
}

/// <summary>Fake API-Football: answers each request with the function given, and records the URLs.</summary>
public sealed class FakeApi(Func<Uri, HttpResponseMessage> respond) : HttpMessageHandler
{
    public List<Uri> Requests { get; } = [];

    public static HttpResponseMessage Json(string body, HttpStatusCode status = HttpStatusCode.OK) =>
        new(status) { Content = new StringContent(body) };

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        Requests.Add(request.RequestUri!);
        return Task.FromResult(respond(request.RequestUri!));
    }
}

public static class Build
{
    public static SyncOptions Options(int budget = 1000, int batch = 20) => new()
    {
        Leagues = [61], Seasons = [2024], DailyBudget = budget, MinDelayMs = 0, FixtureBatchSize = batch, RetryDelaysSeconds = [0, 0, 0],
    };

    public static ApiFootballClient Client(ScoreFootDbContext db, FakeApi api, SyncOptions options) =>
        new(new HttpClient(api) { BaseAddress = new Uri("https://api.test/") }, db, options, TimeProvider.System);

    public static SyncRunner Runner(ScoreFootDbContext db, FakeApi api, SyncOptions options) =>
        new(db, Client(db, api, options), options, TimeProvider.System, NullLogger<SyncRunner>.Instance);
}
