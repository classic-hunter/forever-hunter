import { config } from "../config.js";
import { WikiIndex } from "./indexer.js";

export const wiki = new WikiIndex({
  repoUrl: config.wikiGitUrl,
  webBase: config.wikiWebBase,
  wikiDir: config.wikiDir,
});
