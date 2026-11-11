import { SlashCommandBuilder } from "discord.js";
import { wiki } from "../wiki/store.js";
import { wikiEmbed } from "../utils/embed.js";

export const wikiCommand = {
  data: new SlashCommandBuilder()
    .setName("wiki")
    .setDescription("Open a Forever Hunter wiki page.")
    .addStringOption((option) =>
      option
        .setName("page")
        .setDescription("Wiki page name")
        .setRequired(true)
        .setAutocomplete(true),
    ),

  async autocomplete(interaction) {
    const current = interaction.options.getFocused();
    const matches = current
      ? wiki.findPage(current, 25)
      : wiki.pageTitles().slice(0, 25).map((title) =>
          wiki.sections.find((section) => section.pageTitle === title),
        );

    await interaction.respond(
      matches
        .filter(Boolean)
        .slice(0, 25)
        .map((section) => ({
          name: section.pageTitle.slice(0, 100),
          value: section.pageTitle.slice(0, 100),
        })),
    );
  },

  async execute(interaction) {
    const page = interaction.options.getString("page", true);
    const matches = wiki.findPage(page, 1);

    if (!matches.length) {
      await interaction.reply({
        content: `No page matched **${page}**.`,
        ephemeral: true,
      });
      return;
    }

    const match = matches[0];
    const pageSections = wiki.sections.filter(
      (section) => section.pageTitle === match.pageTitle,
    );

    const intro = pageSections[0]?.body ?? match.body;
    const pageUrl = match.sourceUrl.split("#")[0];

    const embed = wikiEmbed({
      title: match.pageTitle,
      body: intro,
      url: pageUrl,
    });

    const headings = pageSections
      .filter((section) => section.level === 2 || section.level === 3)
      .slice(0, 12)
      .map((section) => section.heading);

    if (headings.length) {
      embed.addFields({
        name: "Sections",
        value: headings.join(" • ").slice(0, 1024),
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
