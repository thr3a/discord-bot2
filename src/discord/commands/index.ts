import { timeCommand } from "./timeCommand";
import type { SlashCommand } from "./types";

export const commands: SlashCommand[] = [timeCommand];

export const commandMap = new Map<string, SlashCommand>(
  commands.map((commandEntry) => [commandEntry.data.name, commandEntry]),
);
