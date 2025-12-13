import { SlashCommandBuilder } from 'discord.js';
import { formatCurrentTime } from '../../utils/time';
import type { SlashCommand } from './types';

export const timeCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('time')
    .setDescription('日本時間 (Asia/Tokyo) の現在時刻を返します'),
  execute: async (interaction) => {
    const result = formatCurrentTime();
    const content = `現在時刻 (${result.timezone}) は ${result.formatted} です`;
    await interaction.reply({ content });
  }
};
