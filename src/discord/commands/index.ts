import { timeCommand } from './timeCommand';
import type { SlashCommand } from './types';

export const commands: SlashCommand[] = [timeCommand];

export const commandMap = new Map(commands.map((command) => [command.data.name, command] as const));
