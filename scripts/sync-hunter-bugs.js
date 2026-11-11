import fs from "node:fs/promises";
import path from "node:path";

const TRACKER_URL = process.env.HUNTER_TRACKER_URL || "https://4evrbugs.com/";
const GITHUB_REPO = process.env.UPSTREAM_BUG_REPO || "ClassicWoWCommunity/forever-bugs";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";

const ghHeaders = {
  "User-Agent": "forever-hunter-bug-sync/1.0",
  Accept: "application/vnd.github+json",
  ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28" } : {}),
};

async function trackerReport(issue) {
  const url = new URL(`/bug/${issue.number}`, TRACKER_URL).href;
  const response = await fetch(url, {
    headers: { "User-Agent": "ForeverHunterBugSync/1.10", Accept: "text/html" },
    signal: AbortSignal.timeout(20_000),
  });
  if (response.status === 404 || response.status === 410) return null;
  if (!response.ok) throw new Error(`Tracker issue #${issue.number} failed: HTTP ${response.status}`);

  const html = (await response.text()).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  const heading = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  const title = heading && htmlToText(heading[1]);
  if (!title || !title.startsWith(`#${issue.number} `)) {
    throw new Error(`Could not verify tracker page for #${issue.number}`);
  }

  const report = html.slice(heading.index + heading[0].length).split(/<h[2-6]\b/i, 1)[0];
  const lines = report.split(/<\/(?:p|div|li|section)>|<br\b[^>]*>/i).map(htmlToText).filter(Boolean);
  const metadataIndex = lines.findIndex((line) => /^Status:/i.test(line));
  const metadata = lines[metadataIndex]?.match(/^Status:\s*(.+?)\s*·\s*Area:\s*(.+)$/i);
  if (!metadata) throw new Error(`Could not read tracker status and area for #${issue.number}`);

  const hunterArea = metadata[2].split("·").some((area) => /^hunter$/i.test(area.trim()));
  const reportTitle = title.slice(title.indexOf(" ") + 1);
  const hunterTag = /^(?:\[[^\]]+\]\s*)*\[hunter\]/i.test(reportTitle);
  const hunterMechanic = /\bhunters?(?:['’]s?)?\s+(?:pets?|traps?|auto[ -]?shot)\b/i;
  const summary = lines[metadataIndex + 1] || "";
  if (!(hunterArea || hunterTag || hunterMechanic.test(reportTitle) ||
    /^(?:hunter pets?\b|hunters['’]\s+\w+\s+pets?\b)/i.test(summary))) {
    return null;
  }

  const trackerStatus = metadata[1].toLowerCase();
  const statuses = new Map([
    ["open", "Open"], ["seen", "Open"],
    ["pending", "Awaiting review"], ["awaiting review", "Awaiting review"],
    ["needs info", "Needs info"], ["closed", null], ["fixed", null], ["not a bug", null],
  ]);
  const status = statuses.get(trackerStatus);
  if (status === undefined) {
    console.warn(`[bugs] skipping #${issue.number}: unknown tracker status ${metadata[1]}`);
  }
  return status ? { status, url } : null;
}

function htmlToText(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&middot;|&#183;|&#x0*b7;/gi, "·").replace(/\s+/g, " ").trim();
}

async function openGithubIssues() {
  const issues = new Map();
  let url = `https://api.github.com/repos/${GITHUB_REPO}/issues?state=open&per_page=100`;
  while (url) {
    const response = await fetch(url, { headers: ghHeaders, signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`GitHub issue list failed: HTTP ${response.status}`);
    for (const issue of await response.json()) {
      if (!issue.pull_request && issue.state === "open") issues.set(issue.number, issue);
    }
    url = response.headers.get("link")?.match(/<([^>]+)>;\s*rel="next"/)?.[1];
  }
  return [...issues.values()];
}

function categoryFor(issue) {
  const haystack = [issue.title, issue.body || "", ...(issue.labels || []).map((l) => typeof l === "string" ? l : l.name)].join(" ").toLowerCase();
  if (/\bpet\b|pets|tallstrider|growl|bite|claw|focus|happiness/.test(haystack)) return "Pets";
  if (/trap|entrapment|freezing|immolation|explosive trap/.test(haystack)) return "Traps";
  if (/auto shot|multi-shot|aimed shot|arcane shot|serpent sting|ranged|dead zone|deadzone/.test(haystack)) return "Ranged";
  if (/melee|raptor strike|mongoose|wing clip|weav/.test(haystack)) return "Melee";
  if (/talent|barrage|efficiency|spirit bond|improved/.test(haystack)) return "Talents";
  return "Other";
}

function esc(text) { return String(text || "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim(); }

function buildMarkdown(payload) {
  const groups = new Map();
  for (const bug of payload.bugs) { if (!groups.has(bug.status)) groups.set(bug.status, []); groups.get(bug.status).push(bug); }
  const lines = ["# 🐛 Forever Hunter Bugs", "", "This dashboard is generated automatically.", "", `**Tracker:** [4evrbugs](${payload.trackerUrl})  `, `**Issue details:** [${payload.upstreamRepo}](https://github.com/${payload.upstreamRepo}/issues)  `, `**Last sync:** ${payload.generatedAt}`, "", `**Tracked Hunter issues:** ${payload.bugs.length}`, ""];
  for (const status of ["Open", "Awaiting review", "Needs info"]) {
    const items = groups.get(status) || []; if (!items.length) continue;
    lines.push(`## ${status} (${items.length})`, "", "| Issue | Category | Title | Updated |", "| --- | --- | --- | --- |");
    for (const bug of items) lines.push(`| [#${bug.number}](${bug.url}) | ${esc(bug.category)} | ${esc(bug.title)} | ${bug.updatedAt.slice(0,10)} |`);
    lines.push("");
  }
  lines.push("## How this works", "", "The scheduled GitHub Action checks individual 4evrbugs reports for Hunter classification and active status. Issue details come from the upstream GitHub tracker.", "", "The next sync replaces generated content.", "");
  return lines.join("\n");
}

async function main() {
  const candidates = await openGithubIssues();
  const issues = [];
  const concurrency = 5;
  for (let index = 0; index < candidates.length; index += concurrency) {
    await Promise.all(candidates.slice(index, index + concurrency).map(async (issue) => {
      const report = await trackerReport(issue);
      if (!report) return;
      issues.push({
        number: issue.number,
        title: issue.title,
        status: report.status,
        category: categoryFor(issue),
        url: issue.html_url,
        trackerUrl: report.url,
        labels: (issue.labels || []).map((label) => typeof label === "string" ? label : label.name),
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        author: issue.user?.login ?? null,
      });
    }));
  }
  if (!issues.length) throw new Error("No usable open Hunter issues returned; refusing to overwrite existing data.");
  issues.sort((a, b) => b.number - a.number);
  const payload = { generatedAt: new Date().toISOString(), trackerUrl: TRACKER_URL, upstreamRepo: GITHUB_REPO, count: issues.length, bugs: issues };
  await fs.mkdir(path.resolve("data"), { recursive: true });
  await fs.writeFile(path.resolve("data/hunter-bugs.json"), JSON.stringify(payload, null, 2) + "\n");
  await fs.writeFile(path.resolve("HUNTER_BUGS.md"), buildMarkdown(payload) + "\n");
  console.log(`[bugs] wrote ${issues.length} active Hunter bugs`);
}
main().catch((error) => { console.error("[bugs]", error); process.exitCode = 1; });
