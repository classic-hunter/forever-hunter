import fs from "node:fs/promises";
import path from "node:path";
import { simpleGit } from "simple-git";
import {
  githubAnchor,
  pageSlugFromFilename,
  prettyTitleFromFilename,
} from "./markdown.js";

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "of",
  "and",
  "to",
  "in",
  "for",
  "is",
  "how",
  "does",
]);

export class WikiIndex {
  constructor({ repoUrl, webBase, wikiDir }) {
    this.repoUrl = repoUrl;
    this.webBase = webBase.replace(/\/+$/, "");
    this.wikiDir = path.resolve(wikiDir);
    this.sections = [];
  }

  async refreshRepo() {
    const gitDir = path.join(this.wikiDir, ".git");

    try {
      await fs.access(gitDir);
      const git = simpleGit(this.wikiDir);
      const result = await git.pull(["--ff-only"]);
      await this.build();
      return result.summary?.changes
        ? `Pulled ${result.summary.changes} changed file(s).`
        : "Wiki already up to date.";
    } catch {
      await fs.mkdir(path.dirname(this.wikiDir), { recursive: true });
      const git = simpleGit();
      await git.clone(this.repoUrl, this.wikiDir, ["--depth", "1"]);
      await this.build();
      return "Wiki cloned.";
    }
  }

  async build() {
    this.sections = [];

    const entries = await fs.readdir(this.wikiDir, { withFileTypes: true });
    const markdownFiles = entries
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.endsWith(".md") &&
          !entry.name.startsWith("_"),
      )
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    for (const filename of markdownFiles) {
      const fullPath = path.join(this.wikiDir, filename);
      const text = await fs.readFile(fullPath, "utf8");

      const pageSlug = pageSlugFromFilename(filename);
      const pageTitle =
        this.firstH1(text) || prettyTitleFromFilename(filename);
      const pageUrl = `${this.webBase}/${encodeURIComponent(pageSlug)}`;

      const parsed = this.parseSections(text);

      if (!parsed.length) {
        this.sections.push({
          pageTitle,
          pageSlug,
          heading: pageTitle,
          level: 1,
          body: text.trim(),
          pageUrl,
          sourceUrl: pageUrl,
        });
        continue;
      }

      for (const section of parsed) {
        const anchor = githubAnchor(section.heading);
        this.sections.push({
          pageTitle,
          pageSlug,
          heading: section.heading,
          level: section.level,
          body: section.body,
          subtreeBody: section.subtreeBody,
          pageUrl,
          sourceUrl: pageUrl,
          sectionAnchor: anchor,
        });
      }
    }
  }


  findHeading(query, { pageIncludes = null, limit = 10 } = {}) {
    const q = this.normalize(query);
    const compactQ = this.compact(query);
    if (!q || !compactQ) return [];

    const pageNeedle = pageIncludes ? this.normalize(pageIncludes) : null;

    const matches = this.sections
      .filter((section) => {
        if (!pageNeedle) return true;
        return this.normalize(section.pageTitle).includes(pageNeedle);
      })
      .map((section) => {
        const heading = this.normalize(section.heading);
        const compactHeading = this.compact(section.heading);
        let score = 0;

        if (heading === q) score = 300;
        else if (compactHeading === compactQ) score = 280;
        else if (heading.startsWith(q)) score = 240;
        else if (heading.includes(q)) score = 220;
        else if (compactHeading.includes(compactQ)) score = 200;
        else {
          const qTerms = q.split(" ").filter(Boolean);
          const hTerms = new Set(heading.split(" "));
          let overlap = 0;

          for (const term of qTerms) {
            if (hTerms.has(term)) overlap += 1;
          }

          if (overlap > 0) {
            score = overlap * 40;
            if (overlap === qTerms.length) score += 50;
          }
        }

        return { score, section };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.section.heading.length - b.section.heading.length;
      })
      .slice(0, limit);

    return matches;
  }

  bestHeading(query, options = {}) {
    return this.findHeading(query, { ...options, limit: 1 })[0]?.section ?? null;
  }

  pageTitles() {
    return [...new Set(this.sections.map((section) => section.pageTitle))];
  }

  findPage(query, limit = 10) {
    const normalizedQuery = this.normalize(query);
    const pages = new Map();

    for (const section of this.sections) {
      if (!pages.has(section.pageTitle)) {
        pages.set(section.pageTitle, section);
      }
    }

    return [...pages.values()]
      .map((section) => ({
        section,
        score: this.titleScore(
          normalizedQuery,
          this.normalize(section.pageTitle),
        ),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ section }) => section);
  }

  search(query, limit = 5) {
    const terms = this.terms(query);
    if (!terms.length) return [];

    const q = this.normalize(query);
    const results = [];

    for (const section of this.sections) {
      const page = this.normalize(section.pageTitle);
      const heading = this.normalize(section.heading);
      const body = this.normalize(section.subtreeBody ?? section.body);
      const combined = `${page} ${heading} ${body}`;

      let score = 0;

      if (q === heading) score += 120;
      else if (heading.includes(q)) score += 55;

      if (q === page) score += 90;
      else if (page.includes(q)) score += 35;

      if (q && body.includes(q)) score += 18;

      for (const term of terms) {
        if (heading.includes(term)) score += 18;
        if (page.includes(term)) score += 12;

        const matches = Math.min(this.countOccurrences(body, term), 5);
        score += matches * 2;
      }

      if (terms.every((term) => combined.includes(term))) score += 15;

      if (score > 0) results.push({ score, section });
    }

    return results
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.section.body.length - b.section.body.length;
      })
      .slice(0, limit);
  }

  bestSection(query) {
    return this.search(query, 1)[0]?.section ?? null;
  }

  firstH1(text) {
    return text.match(/^#\s+(.+?)\s*$/m)?.[1]?.trim() ?? null;
  }

  parseSections(text) {
    const regex = /^(#{1,6})\s+(.+?)\s*$/gm;
    const matches = [...text.matchAll(regex)];
    const sections = [];

    for (let i = 0; i < matches.length; i += 1) {
      const match = matches[i];
      const level = match[1].length;
      const heading = match[2].trim();
      const contentStart = match.index + match[0].length;

      const nextHeadingStart =
        i + 1 < matches.length ? matches[i + 1].index : text.length;
      const body = text.slice(contentStart, nextHeadingStart).trim();

      let subtreeEnd = text.length;
      for (let j = i + 1; j < matches.length; j += 1) {
        if (matches[j][1].length <= level) {
          subtreeEnd = matches[j].index;
          break;
        }
      }

      const subtreeBody = text.slice(contentStart, subtreeEnd).trim();

      if (level === 1 && !subtreeBody) continue;
      sections.push({ heading, level, body, subtreeBody });
    }

    return sections;
  }

  normalize(text) {
    return String(text ?? "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  compact(text) {
    return this.normalize(text).replace(/\s+/g, "");
  }

  terms(text) {
    return this.normalize(text)
      .split(" ")
      .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
  }

  titleScore(query, title) {
    if (!query) return 0;
    if (query === title) return 100;
    if (title.startsWith(query)) return 80;
    if (title.includes(query)) return 60;

    const queryTerms = new Set(query.split(" "));
    const titleTerms = new Set(title.split(" "));
    let overlap = 0;

    for (const term of queryTerms) {
      if (titleTerms.has(term)) overlap += 1;
    }

    return overlap * 15;
  }

  countOccurrences(text, term) {
    if (!term) return 0;
    let count = 0;
    let start = 0;

    while (true) {
      const index = text.indexOf(term, start);
      if (index === -1) return count;
      count += 1;
      start = index + term.length;
    }
  }
}
