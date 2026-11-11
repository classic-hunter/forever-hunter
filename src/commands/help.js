import {
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";

export const helpCommand = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show all Forever Hunter bot commands and examples."),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("🏹 Forever Hunter Bot Help")
      .setDescription(
        [
          "Use the bot to search and reference the Classic Hunter Lodge Forever Hunter Wiki.",
          "",
          "**Quick guide**",
          "• Use `/lookup` for normal-language questions that may need several wiki sections.",
          "• Use `/search` when you want the single best matching wiki section.",
          "• Use `/wiki` when you already know the page you want.",
          "• Use `/formula`, `/pet`, or `/range` for focused mechanic lookups.",
        ].join("\n"),
      )
      .addFields(
        {
          name: "📚 /lookup",
          value: [
            "Builds a grounded answer from several relevant wiki sections.",
            "",
            "`/lookup question:how does pet crit work?`",
            "`/lookup question:how does the dead zone work against bosses?`",
          ].join("\n"),
          inline: false,
        },
        {
          name: "🔎 /search",
          value: [
            "Returns the strongest matching wiki section plus related results.",
            "",
            "`/search query:serpent sting dynamic`",
            "`/search query:feign death swing timer`",
          ].join("\n"),
          inline: false,
        },
        {
          name: "📖 /wiki",
          value: [
            "Opens a specific wiki page.",
            "",
            "`/wiki page:Pet Stat Mechanics`",
            "`/wiki page:Melee Weaving`",
          ].join("\n"),
          inline: false,
        },
        {
          name: "📐 /formula",
          value: [
            "Looks up an ability or stat formula.",
            "",
            "`/formula topic:auto shot`",
            "`/formula topic:pet auto`",
            "`/formula topic:serpent sting`",
          ].join("\n"),
          inline: false,
        },
        {
          name: "🐺 /pet",
          value: [
            "Looks up pet families, abilities, stats, and mechanics.",
            "",
            "`/pet topic:raptor`",
            "`/pet topic:dust cloud`",
            "`/pet topic:loyalty`",
          ].join("\n"),
          inline: false,
        },
        {
          name: "📊 /stat",
          value: [
            "Looks up player or pet stat mechanics.",
            "",
            "`/stat player topic:crit`",
            "`/stat player topic:hit`",
            "`/stat pet topic:agility`",
            "`/stat pet topic:armor`",
          ].join("\n"),
          inline: false,
        },
        {
          name: "📏 /range",
          value: [
            "Looks up dead-zone, combat-reach, and range mechanics.",
            "",
            "`/range topic:deadzone`",
            "`/range topic:combat reach`",
          ].join("\n"),
          inline: false,
        },
        {
          name: "🧭 /faq",
          value: [
            "Admin command for the live FAQ dashboard.",
            "",
            "`/faq sync` — create or refresh the FAQ channel",
          ].join("\n"),
          inline: false,
        },
        {
          name: "🔄 /refresh",
          value: [
            "Pulls the newest GitHub Wiki changes and rebuilds the search index.",
            "Requires **Manage Server** permission.",
          ].join("\n"),
          inline: false,
        },
        {
          name: "🏹 /hunter",
          value: "Shows the short branded command overview.",
          inline: false,
        },
      )
      .setFooter({
        text: "Classic Hunter Lodge • Answers are grounded in the Forever Hunter Wiki",
      });

    await interaction.reply({ embeds: [embed] });
  },
};
