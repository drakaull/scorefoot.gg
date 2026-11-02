using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Npgsql;

namespace ScoreFoot.Data;

public static class Database
{
    /// <summary>Builds the connection string from the same POSTGRES_* variables as docker-compose.yml.</summary>
    public static string ConnectionStringFromEnvironment()
    {
        static string Require(string name) =>
            Environment.GetEnvironmentVariable(name) is { Length: > 0 } v ? v : throw new InvalidOperationException($"{name} is not set (see .env.example)");

        return new NpgsqlConnectionStringBuilder
        {
            Host = Environment.GetEnvironmentVariable("POSTGRES_HOST") ?? "localhost",
            Port = 5432,
            Database = Require("POSTGRES_DB"),
            Username = Require("POSTGRES_USER"),
            Password = Require("POSTGRES_PASSWORD"),
        }.ConnectionString;
    }
}

/// <summary>Used by `dotnet ef` at design time.</summary>
public class DesignTimeFactory : IDesignTimeDbContextFactory<ScoreFootDbContext>
{
    public ScoreFootDbContext CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<ScoreFootDbContext>().UseNpgsql(Database.ConnectionStringFromEnvironment()).Options);
}
