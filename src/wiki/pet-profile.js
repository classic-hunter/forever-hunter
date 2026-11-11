function normalize(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(text) {
  return normalize(text).replace(/\s+/g, "");
}

function parseMarkdownTable(body) {
  const lines = String(body ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const rows = [];

  for (const line of lines) {
    if (!line.includes("|")) continue;
    if (/^\s*:?-{3,}/.test(line)) continue;
    if (/^\s*---/.test(line.replace(/\|/g, " "))) continue;

    const cells = line
      .split("|")
      .map((cell) => cell.trim())
      .filter((cell, index, all) => {
        if (index === 0 && cell === "") return false;
        if (index === all.length - 1 && cell === "") return false;
        return true;
      });

    if (cells.length >= 2) rows.push(cells);
  }

  return rows;
}

function findSection(wiki, headingNeedle, pageNeedle = "Pet Families and Abilities") {
  const target = compact(headingNeedle);

  return wiki.sections.find((section) => {
    const samePage = compact(section.pageTitle).includes(compact(pageNeedle));
    if (!samePage) return false;
    return compact(section.heading) === target;
  }) ?? null;
}

function familyFromTable(wiki, topic) {
  const section = findSection(wiki, "Family Modifiers");
  if (!section) return null;

  const rows = parseMarkdownTable(section.body);

  for (const row of rows) {
    if (row.length < 4) continue;

    const family = row[0];
    if (compact(family) !== compact(topic)) continue;

    return {
      family,
      health: row[1],
      armor: row[2],
      damage: row[3],
      sourceUrl: section.sourceUrl,
      pageTitle: section.pageTitle,
    };
  }

  return null;
}

function uniqueAbilityForFamily(wiki, family) {
  const section = findSection(wiki, "Family Ability Overview");
  if (!section) return null;

  const rows = parseMarkdownTable(section.body);

  for (const row of rows) {
    if (row.length < 3) continue;
    if (compact(row[0]) !== compact(family)) continue;

    return {
      ability: row[1],
      effect: row[2],
    };
  }

  return null;
}

function eligibleFor(wiki, family, abilityHeading) {
  const section = findSection(wiki, abilityHeading);
  if (!section) return false;

  const body = section.subtreeBody ?? section.body;
  return compact(body).includes(compact(family));
}

export function petFamilyNames(wiki) {
  const section = findSection(wiki, "Family Modifiers");
  if (!section) return [];

  const rows = parseMarkdownTable(section.body);
  const names = [];

  for (const row of rows) {
    if (row.length < 4) continue;

    const candidate = row[0];
    if (normalize(candidate) === "family") continue;
    if (!candidate) continue;

    names.push(candidate);
  }

  return names;
}

export function buildPetFamilyProfile(wiki, topic) {
  const familyStats = familyFromTable(wiki, topic);
  if (!familyStats) return null;

  const unique = uniqueAbilityForFamily(wiki, familyStats.family);

  const basics = [];
  for (const ability of ["Bite", "Claw", "Dash", "Dive", "Cower"]) {
    if (eligibleFor(wiki, familyStats.family, ability)) {
      basics.push(ability);
    }
  }

  let uniqueSection = null;
  if (unique?.ability) {
    uniqueSection = findSection(wiki, unique.ability);
  }

  const lines = [
    `**Family:** ${familyStats.family}`,
    "",
    "### Family Modifiers",
    `> Health = ${familyStats.health}`,
    `> Armor = ${familyStats.armor}`,
    `> Damage = ${familyStats.damage}`,
  ];

  if (unique) {
    lines.push(
      "",
      "### Unique Ability",
      `**${unique.ability}** — ${unique.effect}`,
    );
  }

  if (basics.length) {
    lines.push(
      "",
      "### Basic Abilities",
      basics.map((ability) => `• ${ability}`).join("\n"),
    );
  }

  if (uniqueSection) {
    const detail = uniqueSection.subtreeBody ?? uniqueSection.body;
    if (detail.trim()) {
      lines.push(
        "",
        `### ${unique.ability} Details`,
        detail.trim(),
      );
    }
  }

  return {
    title: familyStats.family,
    body: lines.join("\n"),
    pageTitle: familyStats.pageTitle,
    sourceUrl: familyStats.sourceUrl,
  };
}
