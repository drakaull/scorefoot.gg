# Design System

Inspired by the art direction of dpm.lol (dense dark dashboards, cards, coloured data), with our own colours: a near-black "forest ink" green base and a pitch-green accent.

## 01 Brand Identity
Night match on the pitch, sharp, data-dense, fast.

## 02 Colour Palette
Dark theme only. All text colours below reach at least 4.5:1 contrast on every surface (WCAG AA); lowest is Error on Surface raised at 4.83:1.

| Name          | Hex       | Use for                                                  |
|---------------|-----------|----------------------------------------------------------|
| Background    | `#0B100D` | Page background                                          |
| Surface       | `#121915` | Cards, header, tables                                    |
| Surface raised| `#19221D` | Table row hover, inputs, chips, nested blocks            |
| Border        | `#232E27` | 1px borders and dividers                                 |
| Text          | `#E8EDF3` | Main text, numbers                                       |
| Muted         | `#8C9890` | Secondary text, column headers, sub-lines                |
| Accent        | `#3DDC84` | Brand, links, active tab, focus ring, key highlights     |
| Accent hover  | `#5BE79A` | Hover state of accent elements                           |
| Gold          | `#F5C451` | Top ranks (#1, tier S), primary call-to-action button    |
| Success       | `#3DDC84` | Positive deltas (+0.5)                                   |
| Error         | `#F2555A` | Negative deltas (-1.1), errors                           |

Text on an Accent, Gold or rating background is always `#0B100D`.

### Match rating scale (Sofascore-style)
| Rating      | Hex       |
|-------------|-----------|
| < 6.0       | `#F2555A` |
| 6.0 – 6.4   | `#F5803E` |
| 6.5 – 6.9   | `#F5C451` |
| 7.0 – 7.9   | `#3DDC84` |
| ≥ 8.0       | `#4C9AFF` |

Ratings are shown as a badge: rating colour background, `#0B100D` text, one decimal (7.3).

### League table zones
A 3px bar on the left of the rank, and a legend under the table listing the zones present.

| Zone | Hex |
|------|-----|
| Champions League | `#3DDC84` (Accent) |
| Europa League | `#4C9AFF` |
| Conference League | `#F5C451` (Gold) |
| Relegation play-off | `#F5803E` |
| Relegation | `#F2555A` (Error) |

The page's club row: Surface raised background, name and rank in Accent.

### Comparator colours
- Player 1: `#3DDC84` (Accent). Player 2: `#4C9AFF`. Radar fills use the same colours at 25% opacity.

## 03 Typography
- **Font:** Plus Jakarta Sans, self-hosted (no Google Fonts request). Fallback: `system-ui, sans-serif`.
- **Numbers:** always `font-variant-numeric: tabular-nums` in tables and stats.
- **Display (home logo):** 56px, 800 (mobile 36px)
- **H1:** 32px, 700 (mobile 26px)
- **H2:** 22px, 700
- **H3:** 17px, 600
- **Body:** 15px, 400
- **Stat number (big):** 36px, 700 (mobile 26px, so "6-11-21" fits half the screen)
- **Caption / table header:** 12px, 600, uppercase, letter-spacing 0.04em, Muted

## 04 Spacing
4px based: 4, 8, 12, 16, 24, 32, 48, 64px. Page max width 1200px, side gutter 16px on mobile, 24px on desktop.

## 05 Border Radius
- Small elements (badges, inputs, chips): 6px
- Cards: 10px
- Buttons: 8px
- Player photos and club logos: 50% (circle) for players, none for logos

## 06 Components
- **Primary button:** Gold background, `#0B100D` text, 600, height 40px, padding 0 16px. Hover: brightness 1.08.
- **Secondary button:** Surface raised background, Text colour, 1px Border. Hover: border Accent.
- **Inputs / search bar:** Surface raised background, 1px Border, Muted placeholder, search icon left, `Ctrl+K` hint chip right. Focus: 2px Accent outline.
- **Card:** Surface background, 1px Border, 10px radius, 16–24px padding. Home preview cards get a 3px Accent bar at the bottom.
- **Table:** header in Caption style; rows 52px high, 1px Border separator, hover Surface raised. Rank column centred, name in 600 with a Muted sub-line (club or position).
- **Delta:** small (12px) line under a number, Success if positive, Error if negative, Muted if zero.
- **Podium:** top 3 of a leaderboard as 3 big cards, rank number in Gold (#1), Text (#2, #3).
- **Tabs:** Muted text, active tab in Text colour with a 2px Accent underline.
- **Rating badge:** see rating scale above, 6px radius, min width 36px.
- **Result chip:** 24px square, 6px radius, 12px 700 letter. Win: Accent background; draw: Surface raised, 1px Border, Muted letter; loss: Error background. Letters in the page's language (W D L / V N D).
- **Stat chips:** Surface raised, 1px Border, 6px radius, Muted 15px 600 text; active chip Accent background with `#0B100D` text. One row that scrolls sideways on mobile.
- **Filter select:** native `<select>`, 36px high, Surface raised, 1px Border, 6px radius, 15px 600 text; focus 2px Accent outline. A change applies at once.
- **Header link:** Muted 600 text; on its section's pages Text colour with a 2px Accent underline at the bottom of the header.
- **Navigation feedback:** a clicked tab turns active at once; the content it replaces fades to 50% opacity (after 100ms, 150ms transition) until the new content arrives. The search bar keeps its spinner until the opened page is on screen. No skeleton on pages that can be a 404 or a redirect.

## 07 Icons
Lucide icons, outline style, 1.75px stroke, 16px or 20px. Exact package chosen in ARCHITECTURE.md.

## 08 Breakpoints
- Mobile: under 640px
- Tablet: 640px to 1023px
- Desktop: 1024px and up

## Rules
- Never use colours, fonts or sizes outside this file
- Mobile first: every page works at about 390px wide
- Dark theme only
- No mascots or decorative illustrations in v1; visuals come from player photos and club logos
