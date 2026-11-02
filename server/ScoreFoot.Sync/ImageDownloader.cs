using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ScoreFoot.Data;

namespace ScoreFoot.Sync;

/// <summary>
/// Downloads logos and photos we do not have yet into ImagesPath (leagues/, teams/, players/).
/// Uses its own HttpClient without the API key. Media files do not count in the API quota
/// but are rate limited, hence MinImageDelayMs between downloads.
/// </summary>
public sealed class ImageDownloader(HttpClient http, ScoreFootDbContext db, SyncOptions options, TimeProvider clock, ILogger<ImageDownloader> log)
{
    public async Task DownloadMissingAsync(CancellationToken ct = default)
    {
        var leagues = await db.Leagues.Where(x => x.LogoUrl != null && x.LogoPath == null).ToListAsync(ct);
        var teams = await db.Teams.Where(x => x.LogoUrl != null && x.LogoPath == null).ToListAsync(ct);
        var players = await db.Players.Where(x => x.PhotoUrl != null && x.PhotoPath == null).ToListAsync(ct);
        log.LogInformation("Images to fetch: {Leagues} league logos, {Teams} team logos, {Players} player photos", leagues.Count, teams.Count, players.Count);

        int saved = 0, failed = 0;
        async Task Fetch(string folder, int id, string url, Action<string> setPath)
        {
            var relative = $"{folder}/{id}{Path.GetExtension(new Uri(url).AbsolutePath)}";
            var file = Path.Combine(options.ImagesPath, relative);
            if (!File.Exists(file)) // a file left by an interrupted run is reused
            {
                await Task.Delay(TimeSpan.FromMilliseconds(options.MinImageDelayMs), clock, ct);
                using var response = await http.GetAsync(url, ct);
                if (!response.IsSuccessStatusCode)
                {
                    log.LogWarning("Image {Url} returned HTTP {Status}; will retry on the next run", url, (int)response.StatusCode);
                    failed++;
                    return;
                }
                Directory.CreateDirectory(Path.GetDirectoryName(file)!);
                await File.WriteAllBytesAsync(file, await response.Content.ReadAsByteArrayAsync(ct), ct);
            }
            setPath(relative);
            if (++saved % 100 == 0)
            {
                await db.SaveChangesAsync(ct);
                log.LogInformation("{Saved} images saved", saved);
            }
        }

        foreach (var x in leagues) await Fetch("leagues", x.Id, x.LogoUrl!, p => x.LogoPath = p);
        foreach (var x in teams) await Fetch("teams", x.Id, x.LogoUrl!, p => x.LogoPath = p);
        foreach (var x in players) await Fetch("players", x.Id, x.PhotoUrl!, p => x.PhotoPath = p);
        await db.SaveChangesAsync(ct);
        log.LogInformation("Images done: {Saved} saved, {Failed} failed", saved, failed);
    }
}
