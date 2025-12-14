import { debugCommand } from '#discord/commands/debugCommand.js';
import { timeCommand } from '#discord/commands/timeCommand.js';
import type { SlashCommand } from '#discord/commands/types.js';

export const commands: SlashCommand[] = [timeCommand, debugCommand];

export const commandMap = new Map(commands.map((command) => [command.data.name, command] as const));
