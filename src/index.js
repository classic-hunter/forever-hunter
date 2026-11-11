import {
  Client,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
} from "discord.js";

import { config } from "./config.js";
import { commands, commandMap } from "./commands/index.js";
import { wiki } from "./wiki/store.js";
import { handleFaqSelect } from "./faq/manager.js";
import { syncBugPanel } from "./bugs/panel.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

async function registerCommands(applicationId) {
  const rest = new REST({ version: "10" }).setToken(config.token);
  const body = commands.map((command) => command.data.toJSON());

  if (config.guildId) {
    await rest.put(
      Routes.applicationGuildCommands(applicationId, config.guildId),
      { body },
    );
    console.log(
      `[discord] synced ${body.length} commands to guild ${config.guildId}`,
    );
  } else {
    await rest.put(Routes.applicationCommands(applicationId), { body });
    console.log(`[discord] synced ${body.length} global commands`);
  }
}

client.once(Events.ClientReady, async (readyClient) => {
  try {
    const status = await wiki.refreshRepo();
    console.log(`[wiki] ${status}`);
    console.log(`[wiki] indexed ${wiki.sections.length} sections`);
  } catch (error) {
    console.error("[wiki] refresh failed:", error);

    try {
      await wiki.build();
      console.log(`[wiki] using existing cache (${wiki.sections.length} sections)`);
    } catch (cacheError) {
      console.error("[wiki] no usable cache:", cacheError);
    }
  }

  try {
    await registerCommands(readyClient.application.id);
  } catch (error) {
    console.error("[discord] command sync failed:", error);
  }

  try {
    const bugStatus = await syncBugPanel(readyClient, { force: true });
    console.log(`[bugs] ${bugStatus}`);
  } catch (error) {
    console.error("[bugs] initial panel sync failed:", error);
  }

  setInterval(async () => {
    try {
      const bugStatus = await syncBugPanel(readyClient, { force: true });
      console.log(`[bugs] ${bugStatus}`);
    } catch (error) {
      console.error("[bugs] scheduled panel sync failed:", error);
    }
  }, 15 * 60 * 1000);

  console.log(
    `[discord] logged in as ${readyClient.user.tag} (${readyClient.user.id})`,
  );
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (await handleFaqSelect(interaction)) return;
  } catch (error) {
    console.error("[faq-select]", error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "Something went wrong while loading that FAQ topic.",
        ephemeral: true,
      }).catch(() => {});
    }

    return;
  }

  if (interaction.isAutocomplete()) {
    const command = commandMap.get(interaction.commandName);
    if (!command?.autocomplete) return;

    try {
      await command.autocomplete(interaction);
    } catch (error) {
      console.error(`[autocomplete:${interaction.commandName}]`, error);
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = commandMap.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`[command:${interaction.commandName}]`, error);

    const payload = {
      content: "Something went wrong while running that command.",
      ephemeral: true,
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

client.login(config.token);
