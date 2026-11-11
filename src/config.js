import "dotenv/config";

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is missing. Copy .env.example to .env and add it.`);
  }
  return value;
}

export const config = {
  token: requireEnv("DISCORD_TOKEN"),
  guildId: process.env.DISCORD_GUILD_ID?.trim() || null,
  faqChannelId: process.env.DISCORD_FAQ_CHANNEL_ID?.trim() || null,
  bugChannelId: process.env.DISCORD_BUG_CHANNEL_ID?.trim() || null,
  hunterBugDataUrl:
    process.env.HUNTER_BUG_DATA_URL?.trim() ||
    "https://raw.githubusercontent.com/classic-hunter/forever-hunter/master/data/hunter-bugs.json",
  wikiGitUrl:
    process.env.WIKI_GIT_URL?.trim() ||
    "https://github.com/classic-hunter/forever-hunter.wiki.git",
  wikiWebBase:
    process.env.WIKI_WEB_BASE?.trim() ||
    "https://github.com/classic-hunter/forever-hunter/wiki",
  wikiDir: process.env.WIKI_DIR?.trim() || "wiki-cache",
};
