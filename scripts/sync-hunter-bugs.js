import fs from "node:fs/promises";
import path from "node:path";

const TRACKER_URL = process.env.HUNTER_TRACKER_URL || "https://4evrbugs.com/?class=hunter&status=pending%2Copen";
const GITHUB_REPO = process.env.UPSTREAM_BUG_REPO || "ClassicWoWCommunity/forever-bugs";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";

const ghHeaders = {
  "User-Agent": "forever-hunter-bug-sync/1.0",
  Accept: "application/vnd.github+json",
  ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}`, "X-GitHub-Api-Version": "2022-11-28" } : {}),
};

async function fetchText(url) {
  const response = await fetch(url, { headers: { "User-Agent": "ForeverHunterBugSync/1.0", Accept: "text/html,application/xhtml+xml" } });
  if (!response.ok) throw new Error(`Tracker request failed: ${response.status} ${response.statusText}`);
  return response.text();
}

function htmlToText(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function discoverBugIds(html) {
  const ids = new Set();
  for (const match of html.matchAll(/(?:href=["']?\/bug\/|\/bug\/)(\d+)/gi)) ids.add(Number(match[1]));
  const text = htmlToText(html);
  for (const match of text.matchAll(/#(\d+)\b/g)) ids.add(Number(match[1]));
  return [...ids].filter(Number.isInteger).sort((a, b) => b - a);
}

function trackerStatusMap(html) {
  const text = htmlToText(html);
  const statuses = new Map();
  const known = "Awaiting review|Awaiting Review|Open|Closed|Fixed|Not a bug|Needs info|Needs Info|Pending";
  const regex = new RegExp(`#(\\d+)\\s+(.{0,300}?)\\s+(?:—|-|–)\\s+(${known})(?=\\s+#\\d+|$)`, "gi");
  for (const match of text.matchAll(regex)) {
    let status = match[3];
    if (/^pending$/i.test(status)) status = "Awaiting review";
    if (/^awaiting review$/i.test(status)) status = "Awaiting review";
    if (/^needs info$/i.test(status)) status = "Needs info";
    if (/^open$/i.test(status)) status = "Open";
    statuses.set(Number(match[1]), status);
  }
  return statuses;
}

async function githubIssue(number) {
  const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues/${number}`, { headers: ghHeaders });
  if (!response.ok) throw new Error(`GitHub issue #${number} failed: ${response.status} ${response.statusText}`);
  const issue = await response.json();
  return issue.pull_request ? null : issue;
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

function statusFor(issue, trackerStatus) {
  if (issue.state === "closed") return "Closed";
  if (trackerStatus) return trackerStatus;
  const labels = (issue.labels || []).map((l) => typeof l === "string" ? l : l.name).join(" ").toLowerCase();
  if (/pending approval|awaiting review|pending/.test(labels)) return "Awaiting review";
  if (/needs info|need info/.test(labels)) return "Needs info";
  return "Open";
}

function esc(text) { return String(text || "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim(); }

function buildMarkdown(payload) {
  const groups = new Map();
  for (const bug of payload.bugs) { if (!groups.has(bug.status)) groups.set(bug.status, []); groups.get(bug.status).push(bug); }
  const lines = ["# 🐛 Forever Hunter Bugs", "", "This dashboard is generated automatically.", "", `**Source filter:** [4evrbugs Hunter / Open + Pending](${payload.trackerUrl})  `, `**Issue details:** [${payload.upstreamRepo}](https://github.com/${payload.upstreamRepo}/issues)  `, `**Last sync:** ${payload.generatedAt}`, "", `**Tracked Hunter issues:** ${payload.bugs.length}`, ""];
  for (const status of ["Open", "Awaiting review", "Needs info"]) {
    const items = groups.get(status) || []; if (!items.length) continue;
    lines.push(`## ${status} (${items.length})`, "", "| Issue | Category | Title | Updated |", "| --- | --- | --- | --- |");
    for (const bug of items) lines.push(`| [#${bug.number}](${bug.url}) | ${esc(bug.category)} | ${esc(bug.title)} | ${bug.updatedAt.slice(0,10)} |`);
    lines.push("");
  }
  lines.push("## How this works", "", "The scheduled GitHub Action uses the 4evrbugs Hunter filter to determine which reports belong to Hunters, then reads canonical issue data from the Forever bug tracker on GitHub.", "", "Do not edit this file manually; the next sync replaces generated content.", "");
  return lines.join("\n");
}

async function main() {
  const html = await fetchText(TRACKER_URL);
  const ids = discoverBugIds(html);
  const statuses = trackerStatusMap(html);
  if (!ids.length) throw new Error("No Hunter bug IDs discovered; refusing to overwrite tracker with empty data.");
  const issues = [];
  for (const id of ids) {
    try {
      const issue = await githubIssue(id);
      if (!issue || issue.state !== "open") continue;
      issues.push({ number: issue.number, title: issue.title, status: statusFor(issue, statuses.get(issue.number)), category: categoryFor(issue), url: issue.html_url, trackerUrl: `https://4evrbugs.com/bug/${issue.number}`, labels: (issue.labels || []).map((l) => typeof l === "string" ? l : l.name), createdAt: issue.created_at, updatedAt: issue.updated_at, author: issue.user?.login ?? null });
    } catch (error) { console.warn(`[bugs] skipping #${id}: ${error.message}`); }
  }
  if (!issues.length) throw new Error("No usable open Hunter issues returned; refusing to overwrite existing data.");
  issues.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  const payload = { generatedAt: new Date().toISOString(), trackerUrl: TRACKER_URL, upstreamRepo: GITHUB_REPO, count: issues.length, bugs: issues };
  await fs.mkdir(path.resolve("data"), { recursive: true });
  await fs.writeFile(path.resolve("data/hunter-bugs.json"), JSON.stringify(payload, null, 2) + "\n");
  await fs.writeFile(path.resolve("HUNTER_BUGS.md"), buildMarkdown(payload) + "\n");
  console.log(`[bugs] wrote ${issues.length} active Hunter bugs`);
}
main().catch((error) => { console.error("[bugs]", error); process.exitCode = 1; });
