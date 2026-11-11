import { EmbedBuilder } from "discord.js";
import { config } from "../config.js";
import { hunterBugs } from "./store.js";
const PANEL_TITLE = "🐛 Current Hunter Bugs";
const short = (t,n=100) => t.length <= n ? t : `${t.slice(0,n-1)}…`;
function panelEmbed(payload) {
  const bugs = payload.bugs ?? [];
  const count = (s) => bugs.filter((b) => b.status === s).length;
  const recent = [...bugs].sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)).slice(0,12).map((b)=>`[#${b.number}](${b.url}) • **${b.category}** • ${short(b.title)} — *${b.status}*`).join("\n");
  const generated = payload.generatedAt ? new Date(payload.generatedAt).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" }) : "not synced yet";
  return new EmbedBuilder().setTitle(PANEL_TITLE).setDescription([`**${bugs.length}** active Hunter reports • **${count("Open")}** Open • **${count("Awaiting review")}** Awaiting review • **${count("Needs info")}** Needs info`, "", recent || "No active Hunter bugs are currently in the generated tracker."].join("\n")).setURL("https://github.com/classic-hunter/forever-hunter/blob/master/HUNTER_BUGS.md").setFooter({ text: `4evrbugs Hunter filter • GitHub issue data • Synced ${generated}` });
}
async function findPanel(channel) { const messages = await channel.messages.fetch({limit:100}); return messages.find((m)=>m.author.bot && m.embeds.some((e)=>e.title===PANEL_TITLE)) ?? null; }
export async function syncBugPanel(client,{force=true}={}) {
  const channelId = config.bugChannelId || config.faqChannelId;
  if (!channelId) return "Bug panel channel is not configured.";
  const channel = await client.channels.fetch(channelId);
  if (!channel?.isTextBased() || !("messages" in channel)) throw new Error("Configured Hunter bug channel is not a standard text channel.");
  const payload = await hunterBugs.refresh({force}); const existing = await findPanel(channel); const mp={embeds:[panelEmbed(payload)]};
  if (existing) { await existing.edit(mp); return `Hunter bug panel updated (${payload.bugs.length} active bugs).`; }
  const created = await channel.send(mp); await created.pin().catch(()=>{}); return `Hunter bug panel created (${payload.bugs.length} active bugs).`;
}
