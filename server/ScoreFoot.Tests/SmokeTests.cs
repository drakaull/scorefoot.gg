namespace ScoreFoot.Tests;

public class SmokeTests
{
    [Fact]
    public void Fixtures_are_copied_to_output()
    {
        Assert.True(File.Exists(Path.Combine(AppContext.BaseDirectory, "Fixtures", "fixture-single.json")));
    }
}
