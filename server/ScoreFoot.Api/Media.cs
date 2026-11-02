using System.Text.RegularExpressions;

namespace ScoreFoot.Api;

public static partial class Media
{
    // Only files written by ScoreFoot.Sync: "<folder>/<api id>.png". Rules out "..", other folders and other types.
    [GeneratedRegex(@"\A(leagues|teams|players)/[0-9]{1,10}\.png\z")]
    private static partial Regex ValidPath();

    /// <summary>Full file path for an allowed media path, otherwise null.</summary>
    public static string? Resolve(string root, string? path) =>
        path is not null && ValidPath().IsMatch(path) ? Path.Combine(root, path) : null;
}
