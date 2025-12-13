import { SlashCommandBuilder } from "discord.js";

import type { SlashCommand } from "./types";
import { formatJstDate } from "../../utils/time";

export const timeCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("time")
    .setDescription("現在の日本時刻を表示します。"),
  execute: async (interaction) => {
    const now = formatJstDate(new Date());
    await interaction.reply(`現在時刻: ${now}`);
  },
};

