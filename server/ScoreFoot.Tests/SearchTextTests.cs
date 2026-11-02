using ScoreFoot.Data;

namespace ScoreFoot.Tests;

public class SearchTextTests
{
    [Theory]
    [InlineData("Kylian Mbappé", "kylian mbappe")]
    [InlineData("Ödegaard", "odegaard")]
    [InlineData("  Ñíguez ", "niguez")]
    [InlineData("Bayern München", "bayern munchen")]
    public void Normalize_removes_accents_and_case(string input, string expected) =>
        Assert.Equal(expected, SearchText.Normalize(input));
}
