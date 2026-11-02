using System.Globalization;
using System.Text;

namespace ScoreFoot.Data;

public static class SearchText
{
    // Letters that FormD does not split into base letter + accent.
    private static readonly Dictionary<char, string> Letters = new()
    {
        ['ø'] = "o", ['æ'] = "ae", ['œ'] = "oe", ['đ'] = "d", ['ð'] = "d",
        ['ı'] = "i", ['ł'] = "l", ['ß'] = "ss", ['þ'] = "th",
    };

    /// <summary>Lower-case, accent-free form used for search: "Kylian Mbappé" → "kylian mbappe".</summary>
    public static string Normalize(string text)
    {
        var decomposed = text.ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(decomposed.Length);
        foreach (var c in decomposed)
        {
            // Drops accents and invisible characters such as the soft hyphen.
            var category = CharUnicodeInfo.GetUnicodeCategory(c);
            if (category is UnicodeCategory.NonSpacingMark or UnicodeCategory.Format) continue;
            if (Letters.TryGetValue(c, out var plain)) sb.Append(plain);
            else sb.Append(c);
        }
        return sb.ToString().Normalize(NormalizationForm.FormC).Trim();
    }
}
