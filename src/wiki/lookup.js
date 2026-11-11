import { stripMarkdown } from "./markdown.js";

const STOP_WORDS = new Set([
  "the", "a", "an", "of", "and", "to", "in", "for", "is", "how", "does",
  "do", "can", "what", "why", "when", "where", "with", "from", "on", "it",
  "are", "be", "this", "that", "about"
]);

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}\s.%/+:-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function terms(text) {
  return normalize(text)
    .split(" ")
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

function sentenceScore(sentence, queryTerms, heading, pageTitle) {
  const s = normalize(sentence);
  const h = normalize(heading);
  const p = normalize(pageTitle);

  let score = 0;

  for (const term of queryTerms) {
    if (s.includes(term)) score += 4;
    if (h.includes(term)) score += 3;
    if (p.includes(term)) score += 2;
  }

  if (/[=×≈~%]/.test(sentence)) score += 2;
  if (/\b(verified|observed|working model|needs testing|known bug|current|forever|classic)\b/i.test(sentence)) score += 2;
  if (sentence.length >= 35 && sentence.length <= 220) score += 1;

  return score;
}

function splitIntoUnits(markdown) {
  const clean = stripMarkdown(markdown).replace(/\r/g, "").trim();
  if (!clean) return [];

  const lines = clean.split("\n").map((line) => line.trim()).filter(Boolean);
  const units = [];

  for (const line of lines) {
    if (line.startsWith("• ")) {
      units.push(line.slice(2).trim());
      continue;
    }

    if (/[=×≈~%]/.test(line) && line.length <= 240) {
      units.push(line);
      continue;
    }

    const sentences = line.match(/[^.!?]+[.!?]?/g) ?? [line];
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length >= 20) units.push(trimmed);
    }
  }

  return units;
}

function dedupeFacts(facts) {
  const seen = new Set();
  const result = [];

  for (const fact of facts) {
    const key = normalize(fact)
      .replace(/\b\d+(?:\.\d+)?\b/g, "#")
      .slice(0, 180);

    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(fact);
  }

  return result;
}

export function buildDeterministicLookup(
  wiki,
  query,
  { searchLimit = 12, sourceLimit = 5, factLimit = 8 } = {}
) {
  const results = wiki.search(query, searchLimit);
  const queryTerms = terms(query);

  if (!results.length) {
    return { facts: [], sources: [], sections: [] };
  }

  const selected = [];
  const perPage = new Map();

  for (const result of results) {
    const count = perPage.get(result.section.pageTitle) ?? 0;
    if (count >= 2) continue;

    selected.push(result);
    perPage.set(result.section.pageTitle, count + 1);

    if (selected.length >= sourceLimit) break;
  }

  const candidateFacts = [];

  for (const { score: sectionScore, section } of selected) {
    const ranked = splitIntoUnits(section.body)
      .map((text) => ({
        text,
        score:
          sentenceScore(text, queryTerms, section.heading, section.pageTitle) +
          sectionScore / 30,
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    candidateFacts.push(...ranked);
  }

  candidateFacts.sort((a, b) => b.score - a.score);

  return {
    facts: dedupeFacts(candidateFacts.map((item) => item.text)).slice(0, factLimit),
    sources: selected.map(({ section }) => ({
      pageTitle: section.pageTitle,
      heading: section.heading,
      sourceUrl: section.pageUrl ?? section.sourceUrl,
    })),
    sections: selected.map(({ section }) => section),
  };
}
