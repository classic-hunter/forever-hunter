# Changelog

## 1.10.0

- Verify Hunter classification and active status on individual 4evrbugs reports, including clearly identified Hunter pet reports.
- Sort generated bug data and Discord bug lists by issue number, highest first.

## 1.9.0

- Added hourly GitHub Action for automatic Hunter bug tracking
- Uses 4evrbugs Hunter filter for classification and GitHub for canonical issue data
- Generates `data/hunter-bugs.json` and `HUNTER_BUGS.md`
- Added `/bugs` and `/bug` commands
- Added live Hunter bug Discord panel with 15-minute refresh while bot is running
- Added optional `DISCORD_BUG_CHANNEL_ID`
- Fixed `/refresh` so it refreshes wiki, FAQ cards, and bug panel

## 1.8.0

- Added one persistent Discord card for every wiki page
- Page cards use the page Summary section when available
- Page cards include a compact H2/H3 contents list
- New wiki pages are created automatically on sync
- Existing page cards are updated in place
- Renamed/deleted wiki pages remove stale Discord cards
- `/refresh` and `/faq sync` synchronize both FAQ topics and all wiki pages

## 1.7.2

- Removed visible internal FAQ marker footers
- Existing v1.7 FAQ messages are migrated in place on next sync
- Markdown tables are converted to readable Discord bullet rows
- Wiki horizontal rules no longer appear as literal `---`
- Missing/broken FAQ topics are no longer posted as `No wiki content found`
- Existing broken topic cards are removed until the wiki source is available

## 1.7.1

- Fixed `DISCORD_FAQ_CHANNEL_ID` not being loaded into bot config
- `/faq sync` can now see the configured FAQ channel

## 1.7.0

- Added live Discord FAQ dashboard
- Added `/faq sync`
- Added persistent wiki-driven FAQ cards
- Added interactive FAQ dropdown with private detailed responses
- `/refresh` now refreshes the FAQ
- Added `DISCORD_FAQ_CHANNEL_ID`

## 1.6.0

- `/pet` now detects actual pet-family names dynamically from the Family Modifiers table
- Family lookups build a profile from Family Modifiers, Family Ability Overview, and the unique ability section
- Family autocomplete now suggests actual pet families before generic pet headings
- Fixes `/pet topic:raptor` incorrectly resolving to `Choosing a Pet Family`
- Works for every family listed in the wiki table without per-family hard-coded cases

## 1.5.1

- `/stat` now uses `player` and `pet` subcommands
- `/stat player` searches only Stat Mechanics
- `/stat pet` searches only Pet Stat Mechanics
- Autocomplete is scoped separately for player and pet stats
- Updated `/help` examples

## 1.5.0

- Added `/stat topic:<topic>`
- `/stat` searches Stat Mechanics and Pet Stat Mechanics
- Added stat-heading autocomplete
- Added `/stat` to `/help`

## 1.4.2

- Audited focused command collision behavior
- `/pet` no longer falls back to unrelated global wiki matches
- `/range` no longer falls back to unrelated global wiki matches
- `/formula` domain expanded to include Ability Mechanics
- Added explicit scoped-search ordering and audit notes

## 1.4.1

- Added domain scoping for focused commands
- `/pet` now searches pet pages before the rest of the wiki
- `/range` prefers range/shot/weaving pages
- `/formula` prefers formula/mechanics pages
- Scoped autocomplete now suggests headings from the relevant wiki domain first

## 1.4.0

- Focused lookups return the matched heading plus all child subsections
- Preserves blockquotes/formulas and fenced code blocks in Discord
- Long sections continue in follow-up embeds instead of being truncated
- Heading matching uses compact normalization rather than hard-coded aliases
- Parent-section search scoring includes child content

## 1.3.1

- Fixed `/range` to target the actual `Anatomy of Range Checks` wiki page
- Added `deadzone` -> `dead zone` normalization
- Added `multishot` -> `multi shot` and `autoshot` -> `auto shot` normalization
- Wiki links now open the canonical GitHub Wiki page instead of a guessed heading anchor
- `/lookup` source links use the same canonical page URLs

## 1.3.0

- Focused commands now prefer wiki heading matches before full-text search
- `/range topic:deadzone` now targets the Dead Zone heading instead of Combat Reach
- Added heading autocomplete to `/formula`, `/pet`, and `/range`
- `/range` prefers headings specifically from `Anatomy of Ranged Checks`

## 1.2.0

- Added `/help`
- Added command descriptions and usage examples
- `/hunter` now points users to `/help`

## 1.1.0

- Added `/lookup question:<question>`
- Searches multiple wiki sections
- Extracts concise relevant facts without AI
- Limits duplicate sections from the same page
- Includes direct links to all source sections
