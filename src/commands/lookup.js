import { SlashCommandBuilder } from "discord.js";
import { wiki } from "../wiki/store.js";
import { buildPetFamilyProfile, petFamilyNames } from "../wiki/pet-profile.js";
import { wikiEmbeds } from "../utils/embed.js";

async function headingAutocomplete(
  interaction,
  pageHints = [],
) {
  const current = interaction.options.getFocused();
  if (!current) {
    await interaction.respond([]);
    return;
  }

  const hints = Array.isArray(pageHints) ? pageHints : [pageHints];
  const seen = new Set();
  const matches = [];

  for (const hint of hints.filter(Boolean)) {
    for (const result of wiki.findHeading(current, {
      pageIncludes: hint,
      limit: 25,
    })) {
      const key = `${result.section.pageTitle}::${result.section.heading}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push(result);
    }
  }

  // If scoped pages produce no suggestions, fall back globally.
  if (!matches.length) {
    matches.push(...wiki.findHeading(current, { limit: 25 }));
  }

  matches.sort((a, b) => b.score - a.score);

  await interaction.respond(
    matches.slice(0, 25).map(({ section }) => ({
      name: `${section.pageTitle} — ${section.heading}`.slice(0, 100),
      value: section.heading.slice(0, 100),
    })),
  );
}

async function sendBest(
  interaction,
  {
    topic,
    prefix,
    pageHints = [],
    fallbackQuery = null,
    allowGlobalFallback = true,
  },
) {
  const hints = Array.isArray(pageHints) ? pageHints : [pageHints];
  const scopedHints = hints.filter(Boolean);

  let section = null;

  // 1) Strongest path: heading match inside the command's own domain.
  for (const hint of scopedHints) {
    section = wiki.bestHeading(topic, {
      pageIncludes: hint,
    });
    if (section) break;
  }

  // 2) Full-text search, but still constrained to the command's domain.
  if (!section && scopedHints.length) {
    const results = wiki.search(fallbackQuery ?? topic, 30);

    const scopedResults = results.filter(({ section: candidate }) =>
      scopedHints.some((hint) =>
        wiki.normalize(candidate.pageTitle).includes(wiki.normalize(hint)),
      ),
    );

    section = scopedResults[0]?.section ?? null;
  }

  // 3) Optional global fallback. Commands like /pet should generally avoid
  // unrelated global results if the scoped domain has no match.
  if (!section && allowGlobalFallback) {
    section = wiki.bestHeading(topic);
  }

  if (!section && allowGlobalFallback) {
    section = wiki.bestSection(fallbackQuery ?? topic);
  }

  if (!section) {
    const scopeText = scopedHints.length
      ? ` in ${scopedHints.join(", ")}`
      : "";

    await interaction.reply({
      content: `No wiki section matched **${topic}**${scopeText}.`,
      ephemeral: true,
    });
    return;
  }

  const embeds = wikiEmbeds({
    title: section.heading,
    body: section.subtreeBody ?? section.body,
    url: section.sourceUrl,
    pageTitle: section.pageTitle,
    prefix,
  });

  await interaction.reply({ embeds: [embeds[0]] });

  for (const embed of embeds.slice(1)) {
    await interaction.followUp({ embeds: [embed] });
  }
}

export const formulaCommand = {
  data: new SlashCommandBuilder()
    .setName("formula")
    .setDescription("Look up a Hunter or pet formula.")
    .addStringOption((option) =>
      option
        .setName("topic")
        .setDescription("Example: auto shot, serpent sting, pet auto")
        .setRequired(true)
        .setAutocomplete(true),
    ),

  async autocomplete(interaction) {
    await headingAutocomplete(interaction, [
      "Attack Formulas",
      "Pet Attack Formulas",
      "Shot Mechanics",
      "Stat Mechanics",
    ]);
  },

  async execute(interaction) {
    const topic = interaction.options.getString("topic", true);
    await sendBest(interaction, {
      topic,
      prefix: "📐 ",
      pageHints: [
        "Attack Formulas",
        "Pet Attack Formulas",
        "Shot Mechanics",
        "Stat Mechanics",
        "Ability Mechanics",
      ],
      fallbackQuery: `${topic} formula`,
    });
  },
};

export const petCommand = {
  data: new SlashCommandBuilder()
    .setName("pet")
    .setDescription("Look up a pet family, ability, stat, or mechanic.")
    .addStringOption((option) =>
      option
        .setName("topic")
        .setDescription("Example: raptor, dust cloud, focus, loyalty")
        .setRequired(true)
        .setAutocomplete(true),
    ),

  async autocomplete(interaction) {
    const current = interaction.options.getFocused();
    const q = wiki.compact(current);

    const familySuggestions = petFamilyNames(wiki)
      .filter((family) => !q || wiki.compact(family).includes(q))
      .map((family) => ({
        name: `${family} — Pet Family`.slice(0, 100),
        value: family.slice(0, 100),
      }));

    if (familySuggestions.length >= 25) {
      await interaction.respond(familySuggestions.slice(0, 25));
      return;
    }

    const seen = new Set(familySuggestions.map((item) => item.value));
    const headingMatches = [];

    for (const hint of [
      "Pet Families and Abilities",
      "Pet Fundamentals",
      "Pet Stat Mechanics",
      "Pet Attack Formulas",
    ]) {
      for (const result of wiki.findHeading(current, {
        pageIncludes: hint,
        limit: 25,
      })) {
        const value = result.section.heading.slice(0, 100);
        if (seen.has(value)) continue;
        seen.add(value);
        headingMatches.push({
          name: `${result.section.pageTitle} — ${result.section.heading}`.slice(0, 100),
          value,
        });
      }
    }

    await interaction.respond(
      [...familySuggestions, ...headingMatches].slice(0, 25),
    );
  },

  async execute(interaction) {
    const topic = interaction.options.getString("topic", true);

    // If the topic is an actual pet family, build a profile from the family
    // modifier table, ability overview, and unique-ability section.
    const familyProfile = buildPetFamilyProfile(wiki, topic);

    if (familyProfile) {
      const embeds = wikiEmbeds({
        title: familyProfile.title,
        body: familyProfile.body,
        url: familyProfile.sourceUrl,
        pageTitle: familyProfile.pageTitle,
        prefix: "🐺 ",
      });

      await interaction.reply({ embeds: [embeds[0]] });

      for (const embed of embeds.slice(1)) {
        await interaction.followUp({ embeds: [embed] });
      }

      return;
    }

    await sendBest(interaction, {
      topic,
      prefix: "🐺 ",
      pageHints: [
        "Pet Families and Abilities",
        "Pet Fundamentals",
        "Pet Stat Mechanics",
        "Pet Attack Formulas",
      ],
      fallbackQuery: `pet ${topic}`,
      allowGlobalFallback: false,
    });
  },
};


export const statCommand = {
  data: new SlashCommandBuilder()
    .setName("stat")
    .setDescription("Look up player or pet stat mechanics.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("player")
        .setDescription("Look up Hunter/player stat mechanics.")
        .addStringOption((option) =>
          option
            .setName("topic")
            .setDescription("Example: crit, hit, agility, stamina, attack power")
            .setRequired(true)
            .setAutocomplete(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("pet")
        .setDescription("Look up pet stat mechanics.")
        .addStringOption((option) =>
          option
            .setName("topic")
            .setDescription("Example: agility, crit, armor, stamina, hit")
            .setRequired(true)
            .setAutocomplete(true),
        ),
    ),

  async autocomplete(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "pet") {
      await headingAutocomplete(interaction, ["Pet Stat Mechanics"]);
      return;
    }

    await headingAutocomplete(interaction, ["Stat Mechanics"]);
  },

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const topic = interaction.options.getString("topic", true);

    if (subcommand === "pet") {
      await sendBest(interaction, {
        topic,
        prefix: "🐺📊 ",
        pageHints: ["Pet Stat Mechanics"],
        fallbackQuery: topic,
        allowGlobalFallback: false,
      });
      return;
    }

    await sendBest(interaction, {
      topic,
      prefix: "🏹📊 ",
      pageHints: ["Stat Mechanics"],
      fallbackQuery: topic,
      allowGlobalFallback: false,
    });
  },
};

export const rangeCommand = {
  data: new SlashCommandBuilder()
    .setName("range")
    .setDescription("Look up Hunter range and dead-zone mechanics.")
    .addStringOption((option) =>
      option
        .setName("topic")
        .setDescription("Example: deadzone, melee range, combat reach")
        .setRequired(true)
        .setAutocomplete(true),
    ),

  async autocomplete(interaction) {
    await headingAutocomplete(interaction, [
      "Anatomy of Range Checks",
      "Shot Mechanics",
      "Melee Weaving",
    ]);
  },

  async execute(interaction) {
    const topic = interaction.options.getString("topic", true);
    await sendBest(interaction, {
      topic,
      prefix: "📏 ",
      pageHints: [
        "Anatomy of Range Checks",
        "Shot Mechanics",
        "Melee Weaving",
      ],
      fallbackQuery: topic,
      allowGlobalFallback: false,
    });
  },
};
