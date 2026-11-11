import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from "discord.js";

import { config } from "../config.js";
import { wiki } from "../wiki/store.js";
import { faqTopics } from "./config.js";
import { splitDiscordMarkdown } from "../wiki/markdown.js";

const LEGACY_FAQ_MARKER = "FOREVER_HUNTER_FAQ_OVERVIEW";
const LEGACY_TOPIC_MARKER_PREFIX = "FOREVER_HUNTER_FAQ_TOPIC:";

function findTopicSection(topic) {
  const exact = wiki.sections.find(
    (section) =>
      wiki.normalize(section.pageTitle) === wiki.normalize(topic.page) &&
      wiki.normalize(section.heading) === wiki.normalize(topic.heading),
  );

  if (exact) return exact;

  return wiki.findHeading(topic.heading, {
    pageIncludes: topic.page,
    limit: 1,
  })[0]?.section ?? null;
}

function compactWikiText(markdown, limit = 900) {
  return splitDiscordMarkdown(markdown, limit)[0] ?? "No wiki content found.";
}

function overviewEmbed() {
  return new EmbedBuilder()
    .setTitle("🏹 Forever Hunter Reference")
    .setDescription([
      "Live FAQ and mechanics reference pulled from the Forever Hunter Wiki.",
      "",
      "Use the menu below to open a detailed topic without leaving Discord.",
      "",
      "The cards below are refreshed from the wiki by the bot.",
    ].join("\n"))
    .setFooter({ text: "Forever Hunter Wiki • Live FAQ" });
}

function overviewComponents() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("forever_hunter_faq_select")
    .setPlaceholder("Browse Hunter mechanics…")
    .addOptions(
      faqTopics.map((topic) => ({
        label: topic.label,
        value: topic.key,
        emoji: topic.emoji,
      })),
    );

  return [new ActionRowBuilder().addComponents(menu)];
}

function topicEmbed(topic, section) {
  const body = section?.subtreeBody ?? section?.body ?? "No wiki content found.";

  const embed = new EmbedBuilder()
    .setTitle(`${topic.emoji} ${topic.label}`)
    .setDescription(compactWikiText(body))
    .setFooter({ text: "Forever Hunter Wiki • Live FAQ" });

  if (section?.sourceUrl) embed.setURL(section.sourceUrl);
  return embed;
}

async function findBotMessage(
  channel,
  {
    title,
    legacyFooter = null,
  },
) {
  const messages = await channel.messages.fetch({ limit: 100 });

  return messages.find((message) => {
    if (!message.author.bot) return false;

    return message.embeds.some((embed) => {
      if (embed.title === title) return true;
      if (legacyFooter && embed.footer?.text === legacyFooter) return true;
      return false;
    });
  }) ?? null;
}


function uniqueWikiPages() {
  const pages = new Map();

  for (const section of wiki.sections) {
    if (!pages.has(section.pageTitle)) {
      pages.set(section.pageTitle, {
        pageTitle: section.pageTitle,
        pageUrl: section.pageUrl ?? section.sourceUrl,
        sections: [],
      });
    }

    pages.get(section.pageTitle).sections.push(section);
  }

  return [...pages.values()].sort((a, b) =>
    a.pageTitle.localeCompare(b.pageTitle),
  );
}

function pageSummarySection(page) {
  const exactSummary = page.sections.find(
    (section) => wiki.normalize(section.heading) === "summary",
  );

  if (exactSummary) return exactSummary;

  const h1 = page.sections.find((section) => section.level === 1);
  if (h1 && (h1.subtreeBody ?? h1.body)?.trim()) return h1;

  return page.sections.find(
    (section) => (section.subtreeBody ?? section.body)?.trim(),
  ) ?? null;
}

function pageHeadings(page, limit = 10) {
  return page.sections
    .filter((section) => section.level >= 2 && section.level <= 3)
    .map((section) => section.heading)
    .filter((heading, index, all) => all.indexOf(heading) === index)
    .slice(0, limit);
}

function pageCardEmbed(page) {
  const summary = pageSummarySection(page);
  const summaryBody = summary?.body ?? summary?.subtreeBody ?? "";
  const summaryText = compactWikiText(summaryBody, 1350);

  const headings = pageHeadings(page);
  const contents = headings.length
    ? headings.map((heading) => `• ${heading}`).join("\n")
    : "No section headings found.";

  const embed = new EmbedBuilder()
    .setTitle(`📄 ${page.pageTitle}`)
    .setDescription(summaryText || "Wiki page available.")
    .addFields({
      name: "On this page",
      value: contents.slice(0, 1024),
      inline: false,
    })
    .setFooter({ text: "Forever Hunter Wiki • Page" });

  if (page.pageUrl) embed.setURL(page.pageUrl);
  return embed;
}

async function syncWikiPageCards(channel) {
  const pages = uniqueWikiPages();

  const messages = await channel.messages.fetch({ limit: 100 });

  const existingPageCards = messages.filter(
    (message) =>
      message.author.bot &&
      message.embeds.some(
        (embed) => embed.footer?.text === "Forever Hunter Wiki • Page",
      ),
  );

  const desiredTitles = new Set(pages.map((page) => `📄 ${page.pageTitle}`));

  let created = 0;
  let updated = 0;
  let removed = 0;

  for (const page of pages) {
    const title = `📄 ${page.pageTitle}`;

    const existing =
      existingPageCards.find((message) =>
        message.embeds.some((embed) => embed.title === title),
      ) ?? null;

    const payload = { embeds: [pageCardEmbed(page)] };

    if (existing) {
      await existing.edit(payload);
      updated += 1;
    } else {
      await channel.send(payload);
      created += 1;
    }
  }

  for (const message of existingPageCards.values()) {
    const title = message.embeds[0]?.title;
    if (title && !desiredTitles.has(title)) {
      await message.delete().catch(() => {});
      removed += 1;
    }
  }

  return { created, updated, removed, total: pages.length };
}

export async function syncFaq(client) {
  if (!config.faqChannelId) return "FAQ channel is not configured.";

  const channel = await client.channels.fetch(config.faqChannelId);

  if (!channel?.isTextBased() || !("messages" in channel)) {
    throw new Error("Configured FAQ channel is not a standard text channel.");
  }

  const overviewPayload = {
    embeds: [overviewEmbed()],
    components: overviewComponents(),
  };

  let overview = await findBotMessage(channel, {
    title: "🏹 Forever Hunter Reference",
    legacyFooter: LEGACY_FAQ_MARKER,
  });

  if (overview) {
    await overview.edit(overviewPayload);
  } else {
    overview = await channel.send(overviewPayload);
    await overview.pin().catch(() => {});
  }

  let created = 0;
  let updated = 0;

  for (const topic of faqTopics) {
    const section = findTopicSection(topic);
    const title = `${topic.emoji} ${topic.label}`;
    const existing = await findBotMessage(channel, {
      title,
      legacyFooter: `${LEGACY_TOPIC_MARKER_PREFIX}${topic.key}`,
    });

    // Do not publish broken placeholder cards. If the wiki page/heading is
    // missing, remove any existing card; it will reappear automatically once
    // the wiki source is corrected and /faq sync runs again.
    if (!section) {
      if (existing) {
        await existing.delete().catch(() => {});
      }
      continue;
    }

    const payload = { embeds: [topicEmbed(topic, section)] };

    if (existing) {
      await existing.edit(payload);
      updated += 1;
    } else {
      await channel.send(payload);
      created += 1;
    }
  }

  const pageCards = await syncWikiPageCards(channel);

  return [
    `FAQ synced: ${created} created, ${updated} updated.`,
    `Wiki pages: ${pageCards.total} total, ${pageCards.created} created, ${pageCards.updated} updated, ${pageCards.removed} removed.`,
  ].join("\n");
}

export async function handleFaqSelect(interaction) {
  if (!interaction.isStringSelectMenu()) return false;
  if (interaction.customId !== "forever_hunter_faq_select") return false;

  const key = interaction.values[0];
  const topic = faqTopics.find((item) => item.key === key);

  if (!topic) {
    await interaction.reply({
      content: "That FAQ topic no longer exists.",
      ephemeral: true,
    });
    return true;
  }

  const section = findTopicSection(topic);

  if (!section) {
    await interaction.reply({
      content: `No wiki section was found for **${topic.label}**.`,
      ephemeral: true,
    });
    return true;
  }

  const body = section.subtreeBody ?? section.body;
  const chunks = splitDiscordMarkdown(body, 3600);

  const embeds = chunks.slice(0, 8).map((chunk, index) => {
    const suffix = chunks.length > 1 ? ` (${index + 1}/${chunks.length})` : "";

    const embed = new EmbedBuilder()
      .setTitle(`${topic.emoji} ${topic.label}${suffix}`.slice(0, 256))
      .setDescription(chunk)
      .setFooter({ text: "Forever Hunter Wiki • Interactive FAQ" });

    if (section.sourceUrl) embed.setURL(section.sourceUrl);
    return embed;
  });

  await interaction.reply({
    embeds,
    ephemeral: true,
  });

  return true;
}
