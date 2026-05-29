# Remotion Engine — Template Research & Migration Notes

Created from the user request: *"do research about remotion, find some cool
template and migrate to remotion engine. current templates are not ideal."*

## Existing templates (before this round)

| Template | Use case | Aspect | Vibe |
| --- | --- | --- | --- |
| `marketing/product-hero.json` | SaaS landing-page hero | 16x9 | Polished, corporate |
| `marketing/feature-showcase.json` | Multi-feature explainer | 16x9 | Polished, corporate |
| `marketing/before-after.json` | Comparison demo | 16x9 | Polished, corporate |
| `marketing/social-clip.json` | Generic 15s social ad | 9x16 / 1x1 / 16x9 | Polished, corporate |
| `demo/demo-walkthrough.json` | Product walkthrough | 16x9 | Polished, corporate |

All five are b2b-marketing-flavored. They cover **one creator persona** (a
SaaS team showing a product) but miss the larger universe of formats that
people actually watch and reshare on TikTok / X / IG / YouTube Shorts.

## Inspiration sources

Pulled from the official Remotion gallery
([remotion.dev/templates](https://www.remotion.dev/templates) +
[showcase](https://www.remotion.dev/showcase)) and the wider creator-tool
landscape:

- **AnimStats** — animated statistics gifs/videos
- **Stargazer** — GitHub stargazer celebration
- **GitHub Unwrapped** — personalized year-in-review
- **MyKaraoke** — synced lyric reveal
- **Hackreels / Code Hike** — code animation reels
- **Submagic / Revid** — viral short-form (captions + b-roll + zooms)
- **Hello Météo** — daily auto-generated weather story
- **Audiogram** — podcast quote + waveform
- **Watercolor Map** — travel/journey b-roll

These map to recurring **format archetypes** that work on social: hero
number reveal, top-N countdown, single-quote card, year recap, lyric
reveal, code reel, weather/news card, travel map.

## Templates added in this round

All four are inspired by the archetypes above, expressed in our existing
component vocabulary (`AnimatedHeadline`, `TypewriterText`, `GlitchReveal`,
`StatCounter`, `GradientBackground`, `ParticleField`, `LightLeak`,
`DeviceMockup`, etc.). No new React components were needed.

| Template | Use case | Aspect | Duration | Slots |
| --- | --- | --- | --- | --- |
| `social/stat-reveal.json` | Single big-number milestone celebration ("1M users", "10K stars") | 9x16 / 1x1 / 16x9 | 10s | teaser, statValue, statPrefix, statSuffix, statLabel, callout |
| `social/quote-card.json` | Animated pull-quote card with author | 1x1 / 9x16 / 16x9 | 8s | accent, quote, author, authorTitle |
| `social/top5-countdown.json` | "Top 5 X" countdown reveal (#5→#1) | 9x16 / 16x9 / 1x1 | 28s | category + 5 × (name, tagline, image) |
| `social/year-recap.json` | 4-stat year-in-review (GitHub Unwrapped vibe) | 9x16 / 1x1 / 16x9 | 18s | year, owner, 4 × (value, label, suffix), closingLine |

### Why these four

1. **stat-reveal** — single universal celebration moment. Replaces the
   awkward "stat tucked at the end of a generic clip" pattern.
2. **quote-card** — the single most-reshared static format on social;
   moving it gives it a fresh life. Pairs well with the audiogram pattern.
3. **top5-countdown** — the workhorse format of TikTok/YouTube Shorts
   creators. Has built-in retention curve (curiosity → reveal).
4. **year-recap** — personalizable, gift-able, and proves the engine can
   hold a multi-stat narrative. Easy to extend (`monthly-recap`,
   `sprint-recap`, `quarterly-review`).

## Suggested next round (not implemented yet)

If we want broader coverage, candidates:

- **lyric-reveal** — line-by-line karaoke reveal synced to audio cues
  (needs audio stream + word-level VTT)
- **code-reel** — typewriter syntax-highlighted code over animated bg
  (needs a `CodeBlock` component or use of a syntax-highlighting JSX
  component)
- **travel-map** — animated path on a 2D map (would need a map component
  or use the `map` stream type already in the full bundle)
- **podcast-audiogram** — title + waveform animation over single image
  (needs a `Waveform` component)
- **weather-card** — title + icon + temp + 7-day forecast (needs an icon
  set; could be done with `image` streams)
- **announcement** — "We launched X" + CTA + countdown to date (could be
  done today; closest sibling to existing `product-hero`)
- **roast-list** — 5 sequential bullet points appearing with glitch
  (similar to top5 but text-only)

## Component gaps observed during this work

To unlock the suggested-next-round set without faking it via text-only
hacks:

- **CodeBlock** — code with syntax highlight + per-line reveal timing
- **Waveform** — audio amplitude visualization
- **WeatherIcon** — small icon set (sun/cloud/rain/snow) sized for cards
- **Avatar** — circular avatar with optional ring + handle below
  (would make `quote-card` and `year-recap` feel more first-class)
- **MapPath** — animated polyline on a map tile (for travel-map)

None are blocking; we shipped four new templates with the existing
inventory. Build these only if the next round of templates needs them.
