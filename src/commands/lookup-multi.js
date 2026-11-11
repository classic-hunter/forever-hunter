import {
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";

import { wiki } from "../wiki/store.js";
import { buildDeterministicLookup } from "../wiki/lookup.js";

function trimField(text, limit = 1024) {
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
}

export const lookupCommand = {
  data: new SlashCommandBuilder()
    .setName("lookup")
    .setDescription("Build a multi-section answer from the Forever Hunter wiki.")
    .addStringOption((option) =>
      option
        .setName("question")
        .setDescription("Ask a Hunter question using normal language")
        .setRequired(true),
    ),

  async execute(interaction) {
    const question = interaction.options.getString("question", true);

    const result = buildDeterministicLookup(wiki, question);

    if (!result.sources.length) {
      await interaction.reply({
        content: `No wiki material matched **${question}**.`,
        ephemeral: true,
      });
      return;
    }

    const answerText = result.facts.length
      ? result.facts.map((fact) => `• ${fact}`).join("\n")
      : "Relevant wiki sections were found, but no concise facts could be extracted automatically.";

    const sourcesText = result.sources
      .map(
        (source, index) =>
          `${index + 1}. [${source.pageTitle} — ${source.heading}](${source.sourceUrl})`,
      )
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("📚 Hunter Wiki Lookup")
      .setDescription(`**Question:** ${question}`)
      .addFields(
        {
          name: "Wiki answer",
          value: trimField(answerText),
          inline: false,
        },
        {
          name: "Sources",
          value: trimField(sourcesText),
          inline: false,
        },
      )
      .setFooter({
        text: "Deterministic lookup • No AI • Classic Hunter Lodge",
      });

    await interaction.reply({ embeds: [embed] });
  },
};
