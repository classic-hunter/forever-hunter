# Forever Hunter Discord Bot — JavaScript Edition

A Discord slash-command bot powered by the
[Classic Hunter Lodge Forever Hunter Wiki](https://github.com/classic-hunter/forever-hunter/wiki).

The bot does **not** generate Hunter mechanics itself. It clones the GitHub Wiki,
indexes its Markdown pages and headings, and returns matching sections in Discord.

## Commands

- `/hunter` — short command overview
- `/help` — full command reference with examples
- `/wiki page:<page>` — open a wiki page
- `/search query:<words>` — search the whole wiki
- `/lookup question:<question>` — combine several relevant wiki sections into one grounded answer
- `/formula topic:<mechanic>` — formula lookup
- `/pet topic:<family/ability/mechanic>` — pet lookup
- `/range topic:<mechanic>` — range/dead-zone lookup
- `/refresh` — pull new wiki changes

Examples:

```text
/formula topic:auto shot
/formula topic:serpent sting
/pet topic:raptor
/pet topic:dust cloud
/pet topic:focus
/range topic:deadzone
/range topic:combat reach
/search query:feign death swing timer
/lookup question:how does pet crit work
/lookup question:how does the dead zone work against bosses
```

---

# Requirements

- Node.js 18 or newer
- Git
- A Discord bot/application

Check:

```text
node --version
npm --version
git --version
```

---

# 1. Create the Discord bot

Open:

https://discord.com/developers/applications

Then:

1. Click **New Application**
2. Name it something like `Forever Hunter`
3. Open **Bot**
4. Create/reset the bot token
5. Copy the token somewhere private

Do **not** share the token or commit it to GitHub.

The bot only needs the normal `Guilds` gateway intent.
It does not need Message Content Intent because all interaction is through slash commands.

---

# 2. Invite it to your server

In the Discord Developer Portal, use the app installation/OAuth settings.

Include:

```text
bot
applications.commands
```

Useful bot permissions:

```text
View Channels
Send Messages
Embed Links
```

Open the generated install link and choose your Discord server.

---

# 3. Get your Discord server ID

While developing, setting a server ID makes slash-command changes appear quickly.

In Discord:

1. User Settings
2. Advanced
3. Enable Developer Mode
4. Right-click your server
5. Copy Server ID

---

# 4. Configure the project

Copy:

```text
.env.example
```

to:

```text
.env
```

Edit it:

```text
DISCORD_TOKEN=your_secret_bot_token
DISCORD_GUILD_ID=your_server_id
```

The GitHub Wiki is already configured as:

```text
https://github.com/classic-hunter/forever-hunter.wiki.git
```

Do not commit `.env`.

---

# 5. Install

Open a terminal in the project folder:

```text
npm install
```

---

# 6. Run

```text
npm start
```

For development with automatic restart when JS files change:

```text
npm run dev
```

On first start, the bot will:

1. clone the GitHub Wiki
2. build the search index
3. connect to Discord
4. register the slash commands

You should see output similar to:

```text
[wiki] Wiki cloned.
[wiki] indexed 150 sections
[discord] synced 7 commands to guild ...
[discord] logged in as Forever Hunter#....
```

Then try:

```text
/hunter
```

---

# Updating wiki content

After editing the GitHub Wiki, use:

```text
/refresh
```

The command:

1. pulls the newest wiki commit
2. rebuilds the index
3. immediately uses the new content

`/refresh` requires the Discord **Manage Server** permission.

Restarting the bot also refreshes the wiki automatically.

---

# Project structure

```text
src/
  index.js
  config.js

  commands/
    index.js
    hunter.js
    wiki.js
    search.js
    lookup.js
    refresh.js

  wiki/
    store.js
    indexer.js
    markdown.js

  utils/
    embed.js

package.json
.env.example
README.md
```

---

# How wiki search works

The bot splits every Markdown file at headings:

```markdown
# Page
## Section
### Subsection
```

Each section is indexed using:

- page title
- heading
- section text
- wiki source URL

Search gives the highest weight to:

1. exact heading matches
2. page title matches
3. phrase matches
4. individual search terms in the section body

This keeps the bot deterministic and grounded in the wiki.

---

---

# Multi-section `/lookup`

`/lookup` is completely non-AI.

It:

1. searches the wiki for the question
2. selects several strong matching sections
3. limits duplicate sections from the same page
4. scores individual lines and sentences against the question
5. extracts the strongest facts
6. removes near-duplicates
7. returns direct links to every source section

Example:

```text
/lookup question:how does pet crit work
```

This may combine:

```text
Pet Stat Mechanics → Crit Inheritance
Pet Stat Mechanics → Pet Base Crit
Pet Attack Formulas → Crit Damage
```

Use `/search` when you want the single strongest matching section.
Use `/lookup` when the answer is spread across several wiki pages.


# Guild vs global commands

During development:

```text
DISCORD_GUILD_ID=your_server_id
```

Commands are registered directly to that server.

If you eventually want the bot available across multiple servers, leave it blank:

```text
DISCORD_GUILD_ID=
```

Then restart.

The bot will register global application commands instead.

---

# Adding a command

Commands are plain JavaScript objects.

Example:

```js
import { SlashCommandBuilder } from "discord.js";

export const exampleCommand = {
  data: new SlashCommandBuilder()
    .setName("example")
    .setDescription("Example command"),

  async execute(interaction) {
    await interaction.reply("Hello Hunter.");
  },
};
```

Import it in:

```text
src/commands/index.js
```

and add it to the `commands` array.

---

# Good next upgrades

The current version is intentionally simple.

The next upgrades I would add are:

```text
/pet family <family>
/pet ability <ability>

/calc auto-shot
/calc aimed-shot
/calc pet-auto
/calc deadzone

/compare pets

/testing <mechanic>
```

After that, `/ask` could support natural-language questions while remaining
strictly grounded in retrieved wiki sections.

---

# Troubleshooting

## Slash commands don't appear

Check:

- the app was invited with application-command support
- `DISCORD_GUILD_ID` is correct
- startup shows successful command sync
- the bot is installed in the same server

## Wiki clone fails

Try:

```text
git clone https://github.com/classic-hunter/forever-hunter.wiki.git
```

If that command fails, Git or GitHub access is the problem rather than Discord.

## `git` is not recognized

Install Git and restart your terminal.

## Invalid token

Reset the bot token in the Discord Developer Portal and update:

```text
DISCORD_TOKEN=
```

in `.env`.

## Node version error

Check:

```text
node --version
```

Use Node.js 18 or newer.


---

# Heading-first lookups

`/formula`, `/pet`, and `/range` now prefer matching wiki headings before
searching the full text.

For example:

```text
/range topic:deadzone
```

will prefer a heading such as:

```text
The Hunter Dead Zone
```

rather than returning `Combat Reach` because that section contains many
range-related words.

These commands also provide heading autocomplete as you type.


---


## `/stat`

`/stat` is split into player and pet subcommands so the lookup stays in the
correct mechanics page.

Examples:

```text
/stat player topic:crit
/stat player topic:hit
/stat player topic:agility
/stat pet topic:agility
/stat pet topic:crit
/stat pet topic:armor
```

Scopes:

```text
/stat player → Stat Mechanics
/stat pet    → Pet Stat Mechanics
```

Autocomplete is scoped the same way, so pet-stat searches cannot resolve to
player-stat sections and vice versa.


---

# Live Discord FAQ

Add the target FAQ channel to `.env`:

```env
DISCORD_FAQ_CHANNEL_ID=123456789012345678
```

To copy a Discord channel ID:

1. Enable Developer Mode in Discord.
2. Right-click the FAQ channel.
3. Choose **Copy Channel ID**.
4. Paste it into `.env`.

Restart:

```text
npm start
```

Then run:

```text
/faq sync
```

This creates a pinned reference message, an interactive topic dropdown, and
persistent wiki-driven FAQ cards.

Detailed dropdown responses are private/ephemeral, so browsing does not spam
the channel.

`/refresh` also refreshes the FAQ after pulling the newest wiki changes.

Edit `src/faq/config.js` to add/remove persistent FAQ topics.


## Automatic wiki page cards

The FAQ sync now also creates one persistent Discord embed for **every wiki page**.

Each page card contains:

- the page title
- the page Summary section when available
- otherwise the first meaningful page content
- a short table of contents from its H2/H3 headings
- a link to the source wiki page

Page cards are fully dynamic:

```text
new wiki page     → new Discord card
updated wiki page → existing card edited
renamed page      → old card removed + new card created
deleted wiki page → old Discord card removed
```

Run either:

```text
/faq sync
```

or:

```text
/refresh
```

to synchronize the FAQ and all wiki page cards.


---

# Automatic Hunter Bug Tracker

The repository contains an hourly GitHub Action at `.github/workflows/sync-hunter-bugs.yml`. It checks individual 4evrbugs reports for active status and Hunter classification, using open issues from `ClassicWoWCommunity/forever-bugs` as candidates. Bug lists show the highest issue numbers first. It generates `data/hunter-bugs.json` and `HUNTER_BUGS.md`.

Discord commands: `/bugs`, `/bug number:454`. Set `DISCORD_BUG_CHANNEL_ID` for a separate live bug channel; otherwise the FAQ channel is used. While the bot is online, the bug panel refreshes every 15 minutes.

Never commit `.env` or your Discord token.
