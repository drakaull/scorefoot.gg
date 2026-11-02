using Microsoft.EntityFrameworkCore;
using ScoreFoot.Data;

namespace ScoreFoot.Api;

public sealed record PlayerResult(int Id, string Name, string? Photo, string? Club, string? Position, int? Season);
public sealed record ClubResult(int Id, string Name, string? Logo, string? League, string? Country);
public sealed record SearchResults(IReadOnlyList<PlayerResult> Players, IReadOnlyList<ClubResult> Clubs);

/// <summary>
/// Ranks names starting with the query, then names with a word starting with it, then the rest
/// (substring or pg_trgm word similarity, which forgives typos like "mbape"). Ties: closest, then most minutes.
/// </summary>
public static class Search
{
    public const int MaxPlayers = 6;
    public const int MaxClubs = 4;

    /// <summary>Trimmed query when it is 2 to 50 characters long, otherwise null.</summary>
    public static string? ValidQuery(string? q) => q?.Trim() is { Length: >= 2 and <= 50 } t ? t : null;

    private sealed record PlayerRow(int Id, string Name, string? PhotoPath, string? Club, string? Position, int? Season);
    private sealed record ClubRow(int Id, string Name, string? LogoPath, string? League, string? Country);

    public static async Task<SearchResults> RunAsync(ScoreFootDbContext db, string query, CancellationToken ct = default)
    {
        var q = SearchText.Normalize(query);
        // LIKE wildcards typed by the user are matched literally.
        var like = q.Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_");

        var players = await db.Database.SqlQuery<PlayerRow>($"""
            WITH latest AS (
              SELECT DISTINCT ON (s."PlayerId") s."PlayerId", s."TeamId", s."Position", s."Season",
                     sum(coalesce(s."Minutes", 0)) OVER (PARTITION BY s."PlayerId", s."Season") AS minutes
              FROM "PlayerSeasonStats" s
              ORDER BY s."PlayerId", s."Season" DESC, s."Minutes" DESC NULLS LAST)
            SELECT p."Id", p."Name", p."PhotoPath", t."Name" AS "Club", l."Position", l."Season"
            FROM "Players" p
            LEFT JOIN latest l ON l."PlayerId" = p."Id"
            LEFT JOIN "Teams" t ON t."Id" = l."TeamId"
            WHERE p."NameSearch" LIKE '%' || {like} || '%' OR {q} <% p."NameSearch"
            ORDER BY CASE WHEN p."NameSearch" LIKE {like} || '%' THEN 0
                          WHEN p."NameSearch" LIKE '% ' || {like} || '%' THEN 1 ELSE 2 END,
                     word_similarity({q}, p."NameSearch") DESC, l.minutes DESC NULLS LAST, p."Id"
            LIMIT {MaxPlayers}
            """).ToListAsync(ct);

        var clubs = await db.Database.SqlQuery<ClubRow>($"""
            WITH latest AS (
              SELECT DISTINCT ON (st."TeamId") st."TeamId", st."LeagueId"
              FROM "Standings" st
              ORDER BY st."TeamId", st."Season" DESC)
            SELECT t."Id", t."Name", t."LogoPath", l."Name" AS "League", t."Country"
            FROM "Teams" t
            LEFT JOIN latest ls ON ls."TeamId" = t."Id"
            LEFT JOIN "Leagues" l ON l."Id" = ls."LeagueId"
            WHERE t."NameSearch" LIKE '%' || {like} || '%' OR {q} <% t."NameSearch" OR lower(t."Code") = {q}
            ORDER BY CASE WHEN lower(t."Code") = {q} OR t."NameSearch" LIKE {like} || '%' THEN 0
                          WHEN t."NameSearch" LIKE '% ' || {like} || '%' THEN 1 ELSE 2 END,
                     word_similarity({q}, t."NameSearch") DESC, t."Name"
            LIMIT {MaxClubs}
            """).ToListAsync(ct);

        return new SearchResults(
            players.Select(p => new PlayerResult(p.Id, p.Name, Media(p.PhotoPath), p.Club, p.Position, p.Season)).ToList(),
            clubs.Select(c => new ClubResult(c.Id, c.Name, Media(c.LogoPath), c.League, c.Country)).ToList());
    }

    private static string? Media(string? path) => path is null ? null : "/media/" + path;
}
