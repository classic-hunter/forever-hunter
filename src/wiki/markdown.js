export function stripMarkdown(text) {
  return text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, "• ")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/(?<!`)`([^`\n]+)`(?!`)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanTableCell(text) {
  return String(text ?? "")
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/`/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

function markdownTablesToBullets(text) {
  const lines = String(text ?? "").split("\n");
  const out = [];

  for (let i = 0; i < lines.length; i += 1) {
    const header = lines[i];
    const divider = lines[i + 1] ?? "";

    const isHeader = header.includes("|");
    const isDivider =
      divider.includes("|") &&
      divider
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean)
        .every((cell) => /^:?-{3,}:?$/.test(cell));

    if (!isHeader || !isDivider) {
      out.push(header);
      continue;
    }

    const headers = header
      .split("|")
      .map(cleanTableCell)
      .filter(Boolean);

    i += 2;

    while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
      const cells = lines[i]
        .split("|")
        .map(cleanTableCell)
        .filter((cell, index, all) => {
          if (index === 0 && cell === "") return false;
          if (index === all.length - 1 && cell === "") return false;
          return true;
        });

      const parts = [];
      for (let c = 0; c < Math.min(headers.length, cells.length); c += 1) {
        if (!cells[c]) continue;
        if (c == 0) {
          parts.push(`**${cells[c]}**`);
        } else {
          parts.push(cells[c]);
        }
      }

      if (parts.length) out.push(`• ${parts.join(" — ")}`);
      i += 1;
    }

    i -= 1;
  }

  return out.join("\n");
}

export function discordWikiMarkdown(text) {
  return markdownTablesToBullets(String(text ?? ""))
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    // Discord does not render Markdown horizontal rules; hide wiki separators.
    .replace(/^\s*(?:---+|\*\*\*+|___+)\s*$/gm, "")
    .replace(/^#{4,6}\s+(.+)$/gm, "**$1**")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitPlainBlock(block, limit) {
  const parts = [];
  let remaining = block;

  while (remaining.length > limit) {
    let cut = remaining.lastIndexOf("\n", limit);
    if (cut < limit * 0.6) cut = remaining.lastIndexOf(" ", limit);
    if (cut < limit * 0.6) cut = limit;
    parts.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }

  if (remaining) parts.push(remaining);
  return parts;
}

export function splitDiscordMarkdown(text, limit = 3800) {
  const source = discordWikiMarkdown(text);
  if (!source) return [];
  if (source.length <= limit) return [source];

  const blocks = [];
  const fenceRegex = /```[\s\S]*?```/g;
  let last = 0;

  for (const match of source.matchAll(fenceRegex)) {
    const before = source.slice(last, match.index).trim();
    if (before) {
      blocks.push(...before.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean));
    }
    blocks.push(match[0].trim());
    last = match.index + match[0].length;
  }

  const after = source.slice(last).trim();
  if (after) {
    blocks.push(...after.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean));
  }

  const prepared = [];
  for (const block of blocks) {
    if (block.length <= limit) {
      prepared.push(block);
      continue;
    }

    if (block.startsWith("```") && block.endsWith("```")) {
      const firstNewline = block.indexOf("\n");
      const language = firstNewline > 3 ? block.slice(3, firstNewline).trim() : "";
      const contentStart = firstNewline >= 0 ? firstNewline + 1 : 3;
      const content = block.slice(contentStart, -3).trim();
      const innerLimit = Math.max(500, limit - language.length - 8);

      for (const piece of splitPlainBlock(content, innerLimit)) {
        prepared.push(`\`\`\`${language}\n${piece}\n\`\`\``);
      }
    } else {
      prepared.push(...splitPlainBlock(block, limit));
    }
  }

  const chunks = [];
  let current = "";

  for (const block of prepared) {
    const candidate = current ? `${current}\n\n${block}` : block;

    if (candidate.length <= limit) {
      current = candidate;
    } else {
      if (current) chunks.push(current);
      current = block;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

export function excerpt(text, limit = 3800) {
  const cleaned = stripMarkdown(text);
  if (cleaned.length <= limit) return cleaned;

  let cut = cleaned.slice(0, limit);
  const markers = ["\n\n", ". ", "\n", " "];

  for (const marker of markers) {
    const index = cut.lastIndexOf(marker);
    if (index > limit * 0.65) {
      cut = cut.slice(0, index + (marker === ". " ? 1 : 0));
      break;
    }
  }

  return `${cut.trimEnd()}…`;
}

export function githubAnchor(heading) {
  return heading
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function prettyTitleFromFilename(filename) {
  return filename
    .replace(/\.md$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function pageSlugFromFilename(filename) {
  return filename.replace(/\.md$/i, "").replace(/ /g, "-");
}
