using System.Net;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using ScoreFoot.Data;

namespace ScoreFoot.Sync;

/// <summary>The run must stop: daily budget reached, rate limit or invalid key. Tasks stay pending.</summary>
public sealed class ApiStopException(string message) : Exception(message);

/// <summary>This request cannot succeed (e.g. plan restriction). The task is marked failed, the run goes on.</summary>
public sealed class ApiTaskException(string message) : Exception(message);

/// <summary>
/// Only class that talks to API-Football. The key is set on the HttpClient headers in Program.cs,
/// so it never goes through this class, the database or the logs.
/// </summary>
public sealed class ApiFootballClient(HttpClient http, ScoreFootDbContext db, SyncOptions options, TimeProvider clock)
{
    private static readonly string[] StopErrorKeys = ["requests", "rateLimit", "token"];
    private DateTimeOffset? _lastCall;

    public async Task<string> GetAsync(string endpoint, string query, CancellationToken ct = default)
    {
        // API-Football resets the daily quota at 00:00 UTC.
        var startOfDay = new DateTimeOffset(clock.GetUtcNow().UtcDateTime.Date, TimeSpan.Zero);
        var usedToday = await db.ApiCalls.CountAsync(c => c.CalledAt >= startOfDay, ct);
        if (usedToday >= options.DailyBudget)
            throw new ApiStopException($"Daily budget reached ({usedToday}/{options.DailyBudget}).");

        if (_lastCall is { } last)
        {
            var wait = last.AddMilliseconds(options.MinDelayMs) - clock.GetUtcNow();
            if (wait > TimeSpan.Zero) await Task.Delay(wait, clock, ct);
        }

        using var response = await http.GetAsync($"{endpoint}?{query}", ct);
        _lastCall = clock.GetUtcNow();
        db.ApiCalls.Add(new ApiCall { CalledAt = _lastCall.Value, Endpoint = endpoint, HttpStatus = (int)response.StatusCode });
        await db.SaveChangesAsync(ct);

        if (response.StatusCode == HttpStatusCode.TooManyRequests)
            throw new ApiStopException("HTTP 429 Too Many Requests.");
        if ((int)response.StatusCode >= 500)
            throw new HttpRequestException($"HTTP {(int)response.StatusCode}", null, response.StatusCode);
        if (!response.IsSuccessStatusCode)
            throw new ApiTaskException($"HTTP {(int)response.StatusCode}");

        var body = await response.Content.ReadAsStringAsync(ct);
        // "errors" is an empty array on success and an object like {"plan": "..."} on failure.
        if (JsonNode.Parse(body)?["errors"] is JsonObject { Count: > 0 } errors)
        {
            var message = string.Join("; ", errors.Select(e => $"{e.Key}: {e.Value}"));
            if (errors.Any(e => StopErrorKeys.Contains(e.Key))) throw new ApiStopException(message);
            throw new ApiTaskException(message);
        }
        return body;
    }
}
