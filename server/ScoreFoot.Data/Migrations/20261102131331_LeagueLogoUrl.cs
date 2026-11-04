using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ScoreFoot.Data.Migrations
{
    /// <inheritdoc />
    public partial class LeagueLogoUrl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LogoUrl",
                table: "Leagues",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LogoUrl",
                table: "Leagues");
        }
    }
}
