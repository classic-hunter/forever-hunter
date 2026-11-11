import { EmbedBuilder } from "discord.js";
import {
  discordWikiMarkdown,
  excerpt,
  splitDiscordMarkdown,
} from "../wiki/markdown.js";

export function wikiEmbed({
  title,
  body,
  url,
  pageTitle,
  prefix = "",
}) {
  const embed = new EmbedBuilder()
    .setTitle(`${prefix}${title}`.slice(0, 256))
    .setDescription(discordWikiMarkdown(body).slice(0, 4096) || "No text in this section.")
    .setFooter({
      text: "Classic Hunter Lodge • Source: Forever Hunter Wiki",
    });

  if (url) embed.setURL(url);

  if (pageTitle) {
    embed.addFields({
      name: "Wiki page",
      value: pageTitle.slice(0, 1024),
      inline: false,
    });
  }

  return embed;
}

export function wikiEmbeds({
  title,
  body,
  url,
  pageTitle,
  prefix = "",
}) {
  const chunks = splitDiscordMarkdown(body, 3800);
  const safeChunks = chunks.length ? chunks : ["No text in this section."];

  return safeChunks.map((chunk, index) => {
    const suffix = index === 0 ? "" : ` (${index + 1}/${safeChunks.length})`;

    const embed = new EmbedBuilder()
      .setTitle(`${prefix}${title}${suffix}`.slice(0, 256))
      .setDescription(chunk)
      .setFooter({
        text: "Classic Hunter Lodge • Source: Forever Hunter Wiki",
      });

    if (url) embed.setURL(url);

    if (pageTitle && index === 0) {
      embed.addFields({
        name: "Wiki page",
        value: pageTitle.slice(0, 1024),
        inline: false,
      });
    }

    return embed;
  });
}

export function shortWikiEmbed({
  title,
  body,
  url,
  pageTitle,
  prefix = "",
}) {
  const embed = new EmbedBuilder()
    .setTitle(`${prefix}${title}`.slice(0, 256))
    .setDescription(excerpt(body) || "No text in this section.")
    .setFooter({
      text: "Classic Hunter Lodge • Source: Forever Hunter Wiki",
    });

  if (url) embed.setURL(url);

  if (pageTitle) {
    embed.addFields({
      name: "Wiki page",
      value: pageTitle.slice(0, 1024),
      inline: false,
    });
  }

  return embed;
}
