import { EmbedBuilder, SlashCommandBuilder } from "discord.js";

export const hunterCommand = {
  data: new SlashCommandBuilder()
    .setName("hunter")
    .setDescription("Show the Forever Hunter bot command guide."),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("🏹 Forever Hunter Wiki Bot")
      .setDescription(
        [
          "Commands search the Classic Hunter Lodge Forever Hunter wiki.",
          "",
          "**/help** — full command list and examples",
          "",
          "**/wiki** — open a wiki page",
          "**/search** — search wiki sections",
          "**/lookup** — combine several relevant wiki sections into one answer",
          "**/formula** — find a formula/mechanic",
          "**/pet** — find a pet family, ability, or mechanic",
          "**/range** — find dead-zone/range mechanics",
          "**/refresh** — pull the newest wiki changes",
          "",
          "**Examples**",
          "`/formula topic:auto shot`",
          "`/pet topic:dust cloud`",
          "`/range topic:deadzone`",
          "`/search query:serpent sting dynamic`",
          "`/lookup question:how does pet crit work?`",
          "`/lookup question:how does the dead zone work against bosses?`",
        ].join("\n"),
      )
      .setFooter({
        text: "Answers come from the wiki, not an AI model.",
      });

    await interaction.reply({ embeds: [embed] });
  },
};
