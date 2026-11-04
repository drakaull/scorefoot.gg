using ScoreFoot.Api;

namespace ScoreFoot.Tests;

public class MediaTests
{
    [Theory]
    [InlineData("players/278.png")]
    [InlineData("teams/85.png")]
    [InlineData("leagues/61.png")]
    public void Allowed_paths_resolve_inside_the_root(string path) =>
        Assert.Equal(Path.Combine("/data/images", path), Media.Resolve("/data/images", path));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("../appsettings.json")]
    [InlineData("players/../../etc/passwd")]
    [InlineData("players/..%2F..%2Fsecret.png")]
    [InlineData("players\\278.png")]
    [InlineData("/players/278.png")]
    [InlineData("players/278.png\n")]
    [InlineData("players/278.svg")]
    [InlineData("players/x.exe")]
    [InlineData("players/abc.png")]
    [InlineData("other/278.png")]
    [InlineData("players/sub/278.png")]
    public void Anything_else_is_refused(string? path) => Assert.Null(Media.Resolve("/data/images", path));
}
