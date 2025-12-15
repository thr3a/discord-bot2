import { SlashCommandBuilder } from 'discord.js';
import type { SlashCommand } from '#discord/commands/types.js';
import {
  allowedChannelIds,
  getChannelContextSnapshot,
  resetChannelState,
  scenarioPreviewWaitingMessage,
  waitChannelQueueToFinish
} from '#discord/handlers/messageCreate.js';
import { persistChannelState } from '#services/channelConversationStore.js';

const createState = (personaCount: number, userId: string) => {
  return {
    type: 'situation_input' as const,
    personaCount,
    requestedBy: userId
  };
};

export const initCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('init')
    .setDescription('シチュエーションを登録します')
    .addIntegerOption((option) =>
      option
        .setName('characters')
        .setDescription('AIキャラクターの人数 (1〜3)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(3)
    ),
  execute: async (interaction) => {
    const channelId = interaction.channelId;
    if (!allowedChannelIds.has(channelId)) {
      await interaction.reply({
        content: 'このチャンネルでは使用できません',
        ephemeral: true
      });
      return;
    }

    const personaCount = interaction.options.getInteger('characters', true);
    await waitChannelQueueToFinish(channelId);

    const context = await getChannelContextSnapshot(channelId);
    if (context.state.type !== 'idle') {
      const content =
        context.state.type === 'scenario_preview'
          ? scenarioPreviewWaitingMessage
          : '現在別のシチュエーション入力待ちです。完了してから再度お試しください。';
      await interaction.reply({
        content,
        ephemeral: true
      });
      return;
    }

    await persistChannelState(channelId, createState(personaCount, interaction.user.id));
    resetChannelState(channelId);

    await interaction.reply({
      content: `シチュエーションを入力してください。（AIキャラクター数: ${personaCount}人）`
    });
  }
};
