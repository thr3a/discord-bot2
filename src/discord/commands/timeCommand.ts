import { SlashCommandBuilder } from 'discord.js';
import type { SlashCommand } from '#discord/commands/types.js';
import { formatCurrentTime } from '#utils/time.js';

export const timeCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName('time').setDescription('日本時間 (Asia/Tokyo) の現在時刻を返します'),
  execute: async (interaction) => {
    const result = formatCurrentTime();
    const content = `現在時刻: ${result}`;
    await interaction.reply({ content });
  }
};
