import {
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { syncFaq } from "../faq/manager.js";

export const faqCommand = {
  data: new SlashCommandBuilder()
    .setName("faq")
    .setDescription("Manage the live Forever Hunter FAQ.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("sync")
        .setDescription("Create or refresh the live FAQ messages."),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const result = await syncFaq(interaction.client);
    await interaction.editReply(result);
  },
};
