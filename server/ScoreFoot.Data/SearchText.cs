using System.Globalization;
using System.Text;

namespace ScoreFoot.Data;

public static class SearchText
{
    /// <summary>Lower-case, accent-free form used for search: "Kylian Mbappé" → "kylian mbappe".</summary>
    public static string Normalize(string text)
    {
        var decomposed = text.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder(decomposed.Length);
        foreach (var c in decomposed)
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                sb.Append(c);
        return sb.ToString().Normalize(NormalizationForm.FormC).ToLowerInvariant().Trim();
    }
}
