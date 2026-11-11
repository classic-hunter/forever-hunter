import { config } from "../config.js";
class HunterBugStore {
  constructor() { this.payload = null; this.lastFetch = 0; this.cacheMs = 60_000; }
  async refresh({ force = false } = {}) {
    if (!force && this.payload && Date.now() - this.lastFetch < this.cacheMs) return this.payload;
    const sep = config.hunterBugDataUrl.includes("?") ? "&" : "?";
    const response = await fetch(`${config.hunterBugDataUrl}${sep}t=${Date.now()}`, { headers: { "User-Agent": "Forever-Hunter-Discord-Bot/1.9", Accept: "application/json" } });
    if (!response.ok) throw new Error(`Hunter bug data request failed: ${response.status} ${response.statusText}`);
    const payload = await response.json();
    if (!payload || !Array.isArray(payload.bugs)) throw new Error("Hunter bug data is invalid.");
    this.payload = payload; this.lastFetch = Date.now(); return payload;
  }
  async all(options = {}) { return (await this.refresh(options)).bugs; }
  async find(number) { return (await this.all()).find((bug) => bug.number === Number(number)) ?? null; }
}
export const hunterBugs = new HunterBugStore();
