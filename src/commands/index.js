import { hunterCommand } from "./hunter.js";
import { wikiCommand } from "./wiki.js";
import { searchCommand } from "./search.js";
import {
  formulaCommand,
  petCommand,
  rangeCommand,
  statCommand,
} from "./lookup.js";
import { refreshCommand } from "./refresh.js";
import { lookupCommand } from "./lookup-multi.js";
import { helpCommand } from "./help.js";
import { faqCommand } from "./faq.js";
import { bugsCommand, bugCommand } from "./bugs.js";

export const commands = [
  hunterCommand,
  wikiCommand,
  searchCommand,
  formulaCommand,
  petCommand,
  rangeCommand,
  statCommand,
  refreshCommand,
  lookupCommand,
  helpCommand,
  faqCommand,
  bugsCommand,
  bugCommand,
];

export const commandMap = new Map(
  commands.map((command) => [command.data.name, command]),
);
