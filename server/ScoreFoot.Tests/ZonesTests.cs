using ScoreFoot.Api;

namespace ScoreFoot.Tests;

public class ZonesTests
{
    // Every standing description found in the database on 2026-11-03.
    [Theory]
    [InlineData("Champions League", "ucl")]
    [InlineData("Champions League Qualification", "ucl")]
    [InlineData("Promotion - Champions League (Group Stage: )", "ucl")]
    [InlineData("Promotion - Champions League (League phase)", "ucl")]
    [InlineData("Promotion - Champions League (League phase: )", "ucl")]
    [InlineData("Promotion - Champions League (Qualification: )", "ucl")]
    [InlineData("Conference League Qualification", "uecl")]
    [InlineData("Promotion - Conference League (Qualification)", "uecl")]
    [InlineData("Promotion - Conference League (Qualification: )", "uecl")]
    [InlineData("Promotion - Europa Conference League (Qualification: )", "uecl")]
    [InlineData("Promotion - Europa League (Group Stage: )", "uel")]
    [InlineData("Promotion - Europa League (League phase)", "uel")]
    [InlineData("Promotion - Europa League (League phase: )", "uel")]
    [InlineData("UEFA Europa League", "uel")]
    [InlineData("Relegation Playoffs", "playoff")]
    [InlineData("Bundesliga (Relegation)", "playoff")]
    [InlineData("Ligue 1 (Promotion - Play Offs: )", "playoff")]
    [InlineData("Relegation", "relegation")]
    [InlineData("Relegation - 2. Bundesliga", "relegation")]
    [InlineData("Relegation - Championship", "relegation")]
    [InlineData("Relegation - LaLiga2", "relegation")]
    [InlineData("Relegation - Ligue 2", "relegation")]
    [InlineData("Relegation - Serie B", "relegation")]
    [InlineData("Serie A (Additional match: )", null)]
    [InlineData("", null)]
    [InlineData(null, null)]
    public void Standing_descriptions_map_to_zones(string? description, string? zone) =>
        Assert.Equal(zone, Zones.FromDescription(description));
}
