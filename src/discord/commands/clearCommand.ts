import { SlashCommandBuilder } from 'discord.js';
import type { SlashCommand } from '#discord/commands/types.js';
import { allowedChannelIds, resetChannelState, waitChannelQueueToFinish } from '#discord/handlers/messageCreate.js';
import { clearChannelConversation } from '#services/channelConversationStore.js';

export const clearCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName('clear').setDescription('このチャンネルの会話履歴を削除します'),
  execute: async (interaction) => {
    const channelId = interaction.channelId;
    if (!allowedChannelIds.has(channelId)) {
      await interaction.reply({
        content: 'このチャンネルでは使用できません',
        ephemeral: true
      });
      return;
    }
    await waitChannelQueueToFinish(channelId);
    await clearChannelConversation(channelId);
    resetChannelState(channelId);
    await interaction.reply({
      content: '過去の会話を削除しました。'
    });
  }
};
