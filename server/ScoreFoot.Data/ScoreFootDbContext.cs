using Microsoft.EntityFrameworkCore;

namespace ScoreFoot.Data;

public class ScoreFootDbContext(DbContextOptions<ScoreFootDbContext> options) : DbContext(options)
{
    public DbSet<League> Leagues => Set<League>();
    public DbSet<Team> Teams => Set<Team>();
    public DbSet<Player> Players => Set<Player>();
    public DbSet<PlayerSeasonStat> PlayerSeasonStats => Set<PlayerSeasonStat>();
    public DbSet<Fixture> Fixtures => Set<Fixture>();
    public DbSet<FixturePlayerStat> FixturePlayerStats => Set<FixturePlayerStat>();
    public DbSet<Standing> Standings => Set<Standing>();
    public DbSet<RawResponse> RawResponses => Set<RawResponse>();
    public DbSet<SyncTask> SyncTasks => Set<SyncTask>();
    public DbSet<ApiCall> ApiCalls => Set<ApiCall>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.HasPostgresExtension("pg_trgm");

        foreach (var type in new[] { typeof(League), typeof(Team), typeof(Player), typeof(Fixture) })
            b.Entity(type).Property("Id").ValueGeneratedNever();

        b.Entity<Team>().HasIndex(t => t.NameSearch).HasMethod("gin").HasOperators("gin_trgm_ops");
        b.Entity<Player>().HasIndex(p => p.NameSearch).HasMethod("gin").HasOperators("gin_trgm_ops");

        b.Entity<PlayerSeasonStat>().HasIndex(s => new { s.PlayerId, s.TeamId, s.LeagueId, s.Season }).IsUnique();
        b.Entity<PlayerSeasonStat>().HasIndex(s => new { s.LeagueId, s.Season });
        b.Entity<FixturePlayerStat>().HasIndex(s => new { s.FixtureId, s.PlayerId }).IsUnique();
        b.Entity<FixturePlayerStat>().HasIndex(s => s.PlayerId);
        b.Entity<Standing>().HasIndex(s => new { s.LeagueId, s.Season, s.TeamId }).IsUnique();
        b.Entity<Fixture>().HasIndex(f => new { f.LeagueId, f.Season });

        b.Entity<Fixture>().HasOne(f => f.HomeTeam).WithMany().HasForeignKey(f => f.HomeTeamId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<Fixture>().HasOne(f => f.AwayTeam).WithMany().HasForeignKey(f => f.AwayTeamId).OnDelete(DeleteBehavior.Restrict);

        foreach (var type in new[] { typeof(PlayerSeasonStat), typeof(FixturePlayerStat) })
            b.Entity(type).Property(nameof(StatLine.Rating)).HasPrecision(4, 2);

        b.Entity<RawResponse>().Property(r => r.Body).HasColumnType("jsonb");

        b.Entity<SyncTask>().Property(t => t.Type).HasConversion<string>();
        b.Entity<SyncTask>().Property(t => t.Status).HasConversion<string>();
        b.Entity<SyncTask>().HasIndex(t => t.Status);

        b.Entity<ApiCall>().HasIndex(c => c.CalledAt);
    }
}
