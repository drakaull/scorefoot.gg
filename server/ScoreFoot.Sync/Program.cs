using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using ScoreFoot.Data;
using ScoreFoot.Sync;

var command = args.FirstOrDefault();
if (command is not ("run" or "status" or "reimport"))
{
    Console.Error.WriteLine("Usage: ScoreFoot.Sync run [--retry-failed] | status | reimport");
    return 1;
}

// Content root = exe folder, so appsettings.json is found whatever the working directory.
var builder = Host.CreateApplicationBuilder(new HostApplicationBuilderSettings { Args = args, ContentRootPath = AppContext.BaseDirectory });
var options = builder.Configuration.GetSection("Sync").Get<SyncOptions>() ?? throw new InvalidOperationException("Missing Sync section in appsettings.json");

builder.Services.AddSingleton(options);
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddDbContext<ScoreFootDbContext>(o => o.UseNpgsql(Database.ConnectionStringFromEnvironment()));
builder.Services.AddHttpClient<ApiFootballClient>(c =>
{
    // Read only when an API call is about to be made, so `status` works without the key.
    var apiKey = Environment.GetEnvironmentVariable("API_FOOTBALL_KEY") is { Length: > 0 } k ? k : throw new InvalidOperationException("API_FOOTBALL_KEY is not set (see .env.example)");
    c.BaseAddress = new Uri(options.BaseUrl);
    c.DefaultRequestHeaders.Add("x-apisports-key", apiKey);
});
builder.Services.AddHttpClient<ImageDownloader>(); // no API key: images come from a public CDN
builder.Services.AddTransient<SyncRunner>();

using var host = builder.Build();
using var scope = host.Services.CreateScope();
var services = scope.ServiceProvider;
var db = services.GetRequiredService<ScoreFootDbContext>();
await db.Database.MigrateAsync();

if (command == "status")
{
    Console.WriteLine(await StatusReport.BuildAsync(db, options, TimeProvider.System));
    return 0;
}

if (command == "reimport")
{
    await services.GetRequiredService<SyncRunner>().ReimportAsync();
    return 0;
}

var result = await services.GetRequiredService<SyncRunner>().RunAsync(args.Contains("--retry-failed"));
await services.GetRequiredService<ImageDownloader>().DownloadMissingAsync();
Console.WriteLine(await StatusReport.BuildAsync(db, options, TimeProvider.System));
return result == RunResult.Completed ? 0 : 2;
