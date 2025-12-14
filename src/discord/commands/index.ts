import { timeCommand } from '#discord/commands/timeCommand.js';
import type { SlashCommand } from '#discord/commands/types.js';

export const commands: SlashCommand[] = [timeCommand];

export const commandMap = new Map(commands.map((command) => [command.data.name, command] as const));
