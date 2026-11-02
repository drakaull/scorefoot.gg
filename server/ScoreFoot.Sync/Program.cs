using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using ScoreFoot.Data;
using ScoreFoot.Sync;

var command = args.FirstOrDefault();
if (command is not "run")
{
    Console.Error.WriteLine("Usage: ScoreFoot.Sync run [--retry-failed]");
    return 1;
}

// Content root = exe folder, so appsettings.json is found whatever the working directory.
var builder = Host.CreateApplicationBuilder(new HostApplicationBuilderSettings { Args = args, ContentRootPath = AppContext.BaseDirectory });
var options = builder.Configuration.GetSection("Sync").Get<SyncOptions>() ?? throw new InvalidOperationException("Missing Sync section in appsettings.json");
var apiKey = Environment.GetEnvironmentVariable("API_FOOTBALL_KEY") is { Length: > 0 } k ? k : throw new InvalidOperationException("API_FOOTBALL_KEY is not set (see .env.example)");

builder.Services.AddSingleton(options);
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddDbContext<ScoreFootDbContext>(o => o.UseNpgsql(Database.ConnectionStringFromEnvironment()));
builder.Services.AddHttpClient<ApiFootballClient>(c =>
{
    c.BaseAddress = new Uri(options.BaseUrl);
    c.DefaultRequestHeaders.Add("x-apisports-key", apiKey);
});
builder.Services.AddTransient<SyncRunner>();

using var host = builder.Build();
using var scope = host.Services.CreateScope();
await scope.ServiceProvider.GetRequiredService<ScoreFootDbContext>().Database.MigrateAsync();
var result = await scope.ServiceProvider.GetRequiredService<SyncRunner>().RunAsync(args.Contains("--retry-failed"));
return result == RunResult.Completed ? 0 : 2;
