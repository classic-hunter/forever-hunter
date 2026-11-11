import { SlashCommandBuilder } from "discord.js";
import { wiki } from "../wiki/store.js";
import { wikiEmbed } from "../utils/embed.js";

export const searchCommand = {
  data: new SlashCommandBuilder()
    .setName("search")
    .setDescription("Search the Forever Hunter wiki.")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Words or mechanic to search for")
        .setRequired(true),
    ),

  async execute(interaction) {
    const query = interaction.options.getString("query", true);
    const results = wiki.search(query, 5);

    if (!results.length) {
      await interaction.reply({
        content: `No wiki results found for **${query}**.`,
        ephemeral: true,
      });
      return;
    }

    const best = results[0].section;
    const embed = wikiEmbed({
      title: best.heading,
      body: best.body,
      url: best.sourceUrl,
      pageTitle: best.pageTitle,
      prefix: "🔎 ",
    });

    if (results.length > 1) {
      const related = results
        .slice(1)
        .map(
          ({ section }) =>
            `• [${section.pageTitle} — ${section.heading}](${section.sourceUrl})`,
        )
        .join("\n")
        .slice(0, 1024);

      embed.addFields({
        name: "Related results",
        value: related,
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
