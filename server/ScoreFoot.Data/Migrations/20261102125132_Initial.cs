using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ScoreFoot.Data.Migrations
{
    /// <inheritdoc />
    public partial class Initial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:pg_trgm", ",,");

            migrationBuilder.CreateTable(
                name: "ApiCalls",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CalledAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Endpoint = table.Column<string>(type: "text", nullable: false),
                    HttpStatus = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApiCalls", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Leagues",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Country = table.Column<string>(type: "text", nullable: true),
                    LogoPath = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Leagues", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Players",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    NameSearch = table.Column<string>(type: "text", nullable: false),
                    FirstName = table.Column<string>(type: "text", nullable: true),
                    LastName = table.Column<string>(type: "text", nullable: true),
                    BirthDate = table.Column<DateOnly>(type: "date", nullable: true),
                    Nationality = table.Column<string>(type: "text", nullable: true),
                    HeightCm = table.Column<int>(type: "integer", nullable: true),
                    WeightKg = table.Column<int>(type: "integer", nullable: true),
                    PhotoUrl = table.Column<string>(type: "text", nullable: true),
                    PhotoPath = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Players", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RawResponses",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Endpoint = table.Column<string>(type: "text", nullable: false),
                    Parameters = table.Column<string>(type: "text", nullable: false),
                    FetchedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Body = table.Column<string>(type: "jsonb", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RawResponses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SyncTasks",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Type = table.Column<string>(type: "text", nullable: false),
                    LeagueId = table.Column<int>(type: "integer", nullable: false),
                    Season = table.Column<int>(type: "integer", nullable: false),
                    Page = table.Column<int>(type: "integer", nullable: true),
                    FixtureIds = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    Attempts = table.Column<int>(type: "integer", nullable: false),
                    LastError = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SyncTasks", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Teams",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    NameSearch = table.Column<string>(type: "text", nullable: false),
                    Code = table.Column<string>(type: "text", nullable: true),
                    Country = table.Column<string>(type: "text", nullable: true),
                    LogoUrl = table.Column<string>(type: "text", nullable: true),
                    LogoPath = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Teams", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Fixtures",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false),
                    LeagueId = table.Column<int>(type: "integer", nullable: false),
                    Season = table.Column<int>(type: "integer", nullable: false),
                    Round = table.Column<string>(type: "text", nullable: false),
                    KickoffUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    HomeTeamId = table.Column<int>(type: "integer", nullable: false),
                    AwayTeamId = table.Column<int>(type: "integer", nullable: false),
                    HomeGoals = table.Column<int>(type: "integer", nullable: true),
                    AwayGoals = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Fixtures", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Fixtures_Leagues_LeagueId",
                        column: x => x.LeagueId,
                        principalTable: "Leagues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Fixtures_Teams_AwayTeamId",
                        column: x => x.AwayTeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Fixtures_Teams_HomeTeamId",
                        column: x => x.HomeTeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PlayerSeasonStats",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PlayerId = table.Column<int>(type: "integer", nullable: false),
                    TeamId = table.Column<int>(type: "integer", nullable: false),
                    LeagueId = table.Column<int>(type: "integer", nullable: false),
                    Season = table.Column<int>(type: "integer", nullable: false),
                    Appearances = table.Column<int>(type: "integer", nullable: true),
                    Lineups = table.Column<int>(type: "integer", nullable: true),
                    Position = table.Column<string>(type: "text", nullable: true),
                    Minutes = table.Column<int>(type: "integer", nullable: true),
                    Rating = table.Column<decimal>(type: "numeric(4,2)", precision: 4, scale: 2, nullable: true),
                    Goals = table.Column<int>(type: "integer", nullable: true),
                    Assists = table.Column<int>(type: "integer", nullable: true),
                    GoalsConceded = table.Column<int>(type: "integer", nullable: true),
                    Saves = table.Column<int>(type: "integer", nullable: true),
                    ShotsTotal = table.Column<int>(type: "integer", nullable: true),
                    ShotsOnTarget = table.Column<int>(type: "integer", nullable: true),
                    PassesTotal = table.Column<int>(type: "integer", nullable: true),
                    PassesKey = table.Column<int>(type: "integer", nullable: true),
                    PassAccuracy = table.Column<int>(type: "integer", nullable: true),
                    Tackles = table.Column<int>(type: "integer", nullable: true),
                    Blocks = table.Column<int>(type: "integer", nullable: true),
                    Interceptions = table.Column<int>(type: "integer", nullable: true),
                    DuelsTotal = table.Column<int>(type: "integer", nullable: true),
                    DuelsWon = table.Column<int>(type: "integer", nullable: true),
                    DribblesAttempts = table.Column<int>(type: "integer", nullable: true),
                    DribblesSuccess = table.Column<int>(type: "integer", nullable: true),
                    FoulsDrawn = table.Column<int>(type: "integer", nullable: true),
                    FoulsCommitted = table.Column<int>(type: "integer", nullable: true),
                    YellowCards = table.Column<int>(type: "integer", nullable: true),
                    RedCards = table.Column<int>(type: "integer", nullable: true),
                    PenaltiesScored = table.Column<int>(type: "integer", nullable: true),
                    PenaltiesMissed = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlayerSeasonStats", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PlayerSeasonStats_Leagues_LeagueId",
                        column: x => x.LeagueId,
                        principalTable: "Leagues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PlayerSeasonStats_Players_PlayerId",
                        column: x => x.PlayerId,
                        principalTable: "Players",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PlayerSeasonStats_Teams_TeamId",
                        column: x => x.TeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Standings",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LeagueId = table.Column<int>(type: "integer", nullable: false),
                    Season = table.Column<int>(type: "integer", nullable: false),
                    TeamId = table.Column<int>(type: "integer", nullable: false),
                    Rank = table.Column<int>(type: "integer", nullable: false),
                    Points = table.Column<int>(type: "integer", nullable: false),
                    Played = table.Column<int>(type: "integer", nullable: false),
                    Won = table.Column<int>(type: "integer", nullable: false),
                    Drawn = table.Column<int>(type: "integer", nullable: false),
                    Lost = table.Column<int>(type: "integer", nullable: false),
                    GoalsFor = table.Column<int>(type: "integer", nullable: false),
                    GoalsAgainst = table.Column<int>(type: "integer", nullable: false),
                    Form = table.Column<string>(type: "text", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Standings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Standings_Leagues_LeagueId",
                        column: x => x.LeagueId,
                        principalTable: "Leagues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Standings_Teams_TeamId",
                        column: x => x.TeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FixturePlayerStats",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FixtureId = table.Column<int>(type: "integer", nullable: false),
                    PlayerId = table.Column<int>(type: "integer", nullable: false),
                    TeamId = table.Column<int>(type: "integer", nullable: false),
                    Substitute = table.Column<bool>(type: "boolean", nullable: false),
                    Captain = table.Column<bool>(type: "boolean", nullable: false),
                    Position = table.Column<string>(type: "text", nullable: true),
                    Minutes = table.Column<int>(type: "integer", nullable: true),
                    Rating = table.Column<decimal>(type: "numeric(4,2)", precision: 4, scale: 2, nullable: true),
                    Goals = table.Column<int>(type: "integer", nullable: true),
                    Assists = table.Column<int>(type: "integer", nullable: true),
                    GoalsConceded = table.Column<int>(type: "integer", nullable: true),
                    Saves = table.Column<int>(type: "integer", nullable: true),
                    ShotsTotal = table.Column<int>(type: "integer", nullable: true),
                    ShotsOnTarget = table.Column<int>(type: "integer", nullable: true),
                    PassesTotal = table.Column<int>(type: "integer", nullable: true),
                    PassesKey = table.Column<int>(type: "integer", nullable: true),
                    PassAccuracy = table.Column<int>(type: "integer", nullable: true),
                    Tackles = table.Column<int>(type: "integer", nullable: true),
                    Blocks = table.Column<int>(type: "integer", nullable: true),
                    Interceptions = table.Column<int>(type: "integer", nullable: true),
                    DuelsTotal = table.Column<int>(type: "integer", nullable: true),
                    DuelsWon = table.Column<int>(type: "integer", nullable: true),
                    DribblesAttempts = table.Column<int>(type: "integer", nullable: true),
                    DribblesSuccess = table.Column<int>(type: "integer", nullable: true),
                    FoulsDrawn = table.Column<int>(type: "integer", nullable: true),
                    FoulsCommitted = table.Column<int>(type: "integer", nullable: true),
                    YellowCards = table.Column<int>(type: "integer", nullable: true),
                    RedCards = table.Column<int>(type: "integer", nullable: true),
                    PenaltiesScored = table.Column<int>(type: "integer", nullable: true),
                    PenaltiesMissed = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FixturePlayerStats", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FixturePlayerStats_Fixtures_FixtureId",
                        column: x => x.FixtureId,
                        principalTable: "Fixtures",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_FixturePlayerStats_Players_PlayerId",
                        column: x => x.PlayerId,
                        principalTable: "Players",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_FixturePlayerStats_Teams_TeamId",
                        column: x => x.TeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ApiCalls_CalledAt",
                table: "ApiCalls",
                column: "CalledAt");

            migrationBuilder.CreateIndex(
                name: "IX_FixturePlayerStats_FixtureId_PlayerId",
                table: "FixturePlayerStats",
                columns: new[] { "FixtureId", "PlayerId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FixturePlayerStats_PlayerId",
                table: "FixturePlayerStats",
                column: "PlayerId");

            migrationBuilder.CreateIndex(
                name: "IX_FixturePlayerStats_TeamId",
                table: "FixturePlayerStats",
                column: "TeamId");

            migrationBuilder.CreateIndex(
                name: "IX_Fixtures_AwayTeamId",
                table: "Fixtures",
                column: "AwayTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_Fixtures_HomeTeamId",
                table: "Fixtures",
                column: "HomeTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_Fixtures_LeagueId_Season",
                table: "Fixtures",
                columns: new[] { "LeagueId", "Season" });

            migrationBuilder.CreateIndex(
                name: "IX_Players_NameSearch",
                table: "Players",
                column: "NameSearch")
                .Annotation("Npgsql:IndexMethod", "gin")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" });

            migrationBuilder.CreateIndex(
                name: "IX_PlayerSeasonStats_LeagueId_Season",
                table: "PlayerSeasonStats",
                columns: new[] { "LeagueId", "Season" });

            migrationBuilder.CreateIndex(
                name: "IX_PlayerSeasonStats_PlayerId_TeamId_LeagueId_Season",
                table: "PlayerSeasonStats",
                columns: new[] { "PlayerId", "TeamId", "LeagueId", "Season" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PlayerSeasonStats_TeamId",
                table: "PlayerSeasonStats",
                column: "TeamId");

            migrationBuilder.CreateIndex(
                name: "IX_Standings_LeagueId_Season_TeamId",
                table: "Standings",
                columns: new[] { "LeagueId", "Season", "TeamId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Standings_TeamId",
                table: "Standings",
                column: "TeamId");

            migrationBuilder.CreateIndex(
                name: "IX_SyncTasks_Status",
                table: "SyncTasks",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Teams_NameSearch",
                table: "Teams",
                column: "NameSearch")
                .Annotation("Npgsql:IndexMethod", "gin")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ApiCalls");

            migrationBuilder.DropTable(
                name: "FixturePlayerStats");

            migrationBuilder.DropTable(
                name: "PlayerSeasonStats");

            migrationBuilder.DropTable(
                name: "RawResponses");

            migrationBuilder.DropTable(
                name: "Standings");

            migrationBuilder.DropTable(
                name: "SyncTasks");

            migrationBuilder.DropTable(
                name: "Fixtures");

            migrationBuilder.DropTable(
                name: "Players");

            migrationBuilder.DropTable(
                name: "Leagues");

            migrationBuilder.DropTable(
                name: "Teams");
        }
    }
}
