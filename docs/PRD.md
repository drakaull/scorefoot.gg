# Product Requirements Document

## 01 Product Overview
- **Product Name:** ScoreFoot.gg
- **Tagline:** Search any player or club from Europe's top 5 leagues and read their stats at a glance.
- **Description:** A football stats website inspired by dpm.lol: a central search bar leads to dense, readable player and club pages, plus leaderboards and a player comparator. It covers the Premier League, La Liga, Serie A, Bundesliga and Ligue 1 over four complete seasons (2022-23 to 2025-26). Built as a portfolio project, designed so it could be deployed later.

## 02 Problem
- Football stats are spread across many sites, often cluttered with ads, betting and news.
- Comparing two players or reading a player's form needs several pages and tabs.
- Few sites offer the fast "search → one clean page with everything" flow that dpm.lol offers for League of Legends.

## 03 Goal
- A visitor types a player's name and reads their season stats, recent form and percentile radar in under 10 seconds.

## 04 Target Users
- Football fans who want quick stats on a player or club (e.g. before a debate or fantasy league pick).
- Recruiters and developers viewing the project in Léonard Fontaine's portfolio.

## 05 Core Features (Version 1)
Keep this list tight. Each feature gets its own spec in specs/NN-name.md before it is built.
- **Search:** Central search bar with autocomplete across all players and clubs of the 5 leagues.
- **Player page:** Season stats, form over the last 5 matches with a rating per match, club history across the 4 seasons, percentile radar against players in the same position.
- **Club page:** League position, recent form, squad, top players, season results.
- **Leaderboards:** Rankings by stat (goals, assists, rating, dribbles, tackles…), filterable by league, season, position and age.
- **Comparator:** Two players side by side with overlaid radars and stat table.
- **Languages:** English by default, French available via a language switch.

## 06 Out of Scope (for now)
- User accounts and any personal data (favourites, if added, stay in the browser).
- Current season (2026-27) and live scores: a frozen mid-season snapshot would look wrong once the paid month ends.
- Competitions other than the top 5 leagues (Champions League, cups, national teams).
- Match pages, team of the week, "in form" trends, player tier list.
- Shot maps / xG visuals (StatsBomb open data), end-of-season simulator.
- Combining several data providers.
- Betting, ads, analytics, trackers.

## 07 Data Constraints
- Single source: API-Football. One month of the Pro plan (7,500 requests per day, 300 per minute, until 2026-12-02) for the initial download; the free plan (100 per day, seasons 2022 to 2024 only) is enough for small updates later.
- The website never calls the API while a visitor browses. A sync script fills our own database; the site reads only from it.
- Initial download: about 1,450 requests for the 4 seasons (match details fetched 20 per request, a Pro-only feature), done in one day before the Pro month ends.
- The code must not hard-code the season, so switching to a paid plan and the current season later only means re-running the sync.

## 08 Success Metrics
- Every player who played in the top 5 leagues in the 4 seasons is findable via search.
- Any page loads in under 1 second locally.
- All interface text exists in English and French.
- The site works on desktop and at 390 px width, in Chrome and Firefox.
