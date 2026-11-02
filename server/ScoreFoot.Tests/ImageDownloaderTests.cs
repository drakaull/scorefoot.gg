using System.Net;
using Microsoft.Extensions.Logging.Abstractions;
using ScoreFoot.Data;
using ScoreFoot.Sync;

namespace ScoreFoot.Tests;

[Collection("db")]
public class ImageDownloaderTests : IDisposable
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;
    private readonly string _images = Directory.CreateTempSubdirectory("scorefoot-images-").FullName;

    public void Dispose() => Directory.Delete(_images, recursive: true);

    private ImageDownloader Downloader(ScoreFootDbContext db, FakeApi cdn)
    {
        var options = Build.Options();
        options.ImagesPath = _images;
        options.MinImageDelayMs = 0;
        return new ImageDownloader(new HttpClient(cdn), db, options, TimeProvider.System, NullLogger<ImageDownloader>.Instance);
    }

    [Fact]
    public async Task Downloads_missing_images_and_skips_existing_files()
    {
        using var db = TestDb.CreateEmpty();
        db.Teams.Add(new Team { Id = 85, Name = "PSG", NameSearch = "psg", LogoUrl = "https://cdn.test/football/teams/85.png" });
        db.Players.Add(new Player { Id = 6, Name = "L. Balerdi", NameSearch = "l. balerdi", PhotoUrl = "https://cdn.test/football/players/6.png" });
        await db.SaveChangesAsync(Ct);
        Directory.CreateDirectory(Path.Combine(_images, "players"));
        await File.WriteAllBytesAsync(Path.Combine(_images, "players", "6.png"), [1], Ct); // left by an interrupted run

        var cdn = new FakeApi(_ => new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent([137, 80, 78, 71]) });
        await Downloader(db, cdn).DownloadMissingAsync(Ct);

        Assert.Equal("https://cdn.test/football/teams/85.png", Assert.Single(cdn.Requests).ToString());
        Assert.True(File.Exists(Path.Combine(_images, "teams", "85.png")));
        db.ChangeTracker.Clear();
        Assert.Equal("teams/85.png", db.Teams.Single().LogoPath);
        Assert.Equal("players/6.png", db.Players.Single().PhotoPath);

        // Nothing left to fetch on the next run.
        await Downloader(db, cdn).DownloadMissingAsync(Ct);
        Assert.Single(cdn.Requests);
    }

    [Fact]
    public async Task Failed_download_is_retried_next_time()
    {
        using var db = TestDb.CreateEmpty();
        db.Teams.Add(new Team { Id = 1, Name = "X", NameSearch = "x", LogoUrl = "https://cdn.test/football/teams/1.png" });
        await db.SaveChangesAsync(Ct);

        await Downloader(db, new FakeApi(_ => new HttpResponseMessage(HttpStatusCode.NotFound))).DownloadMissingAsync(Ct);

        db.ChangeTracker.Clear();
        Assert.Null(db.Teams.Single().LogoPath);
    }
}
