import { aiModeCommand } from '#discord/commands/aiModeCommand.js';
import { clearCommand } from '#discord/commands/clearCommand.js';
import { debugCommand } from '#discord/commands/debugCommand.js';
import { showCommand } from '#discord/commands/showCommand.js';
import { timeCommand } from '#discord/commands/timeCommand.js';
import type { SlashCommand } from '#discord/commands/types.js';

export const commands: SlashCommand[] = [timeCommand, debugCommand, showCommand, clearCommand, aiModeCommand];

export const commandMap = new Map(commands.map((command) => [command.data.name, command] as const));
