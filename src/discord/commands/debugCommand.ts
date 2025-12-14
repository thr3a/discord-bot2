import { SlashCommandBuilder } from 'discord.js';
import type { SlashCommand } from '#discord/commands/types.js';
import { allowedChannelIds, buildSystemPrompt, getChannelContextSnapshot } from '#discord/handlers/messageCreate.js';

const previewLimit = 20;

const normalizeContent = (content: string): string => {
  return content.replace(/\s+/g, ' ').trim();
};

export const formatContentPreview = (content: string): string => {
  const normalized = normalizeContent(content);
  if (normalized.length <= previewLimit) {
    return normalized;
  }
  return `${normalized.slice(0, previewLimit)}…`;
};

export const debugCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName('debug').setDescription('次にAIへ送信するメッセージ一覧を表示します'),
  execute: async (interaction) => {
    const channelId = interaction.channelId;
    if (!allowedChannelIds.has(channelId)) {
      await interaction.reply({
        content: 'このチャンネルでは使用できません',
        ephemeral: true
      });
      return;
    }
    const context = await getChannelContextSnapshot(channelId);
    const personaMap = new Map(context.scenario.personas.map((persona) => [persona.id, persona]));
    const systemEntries = context.scenario.personas.map((persona) => ({
      role: `system(${persona.displayName})`,
      content: buildSystemPrompt(context.scenario, persona, context.personaStates[persona.id]?.currentOutfit)
    }));
    const historyEntries = context.history.map((entry) => {
      if (entry.role === 'assistant') {
        const persona = personaMap.get(entry.personaId);
        const role = persona ? `assistant(${persona.displayName})` : 'assistant';
        return { role, content: entry.content };
      }
      return entry;
    });
    const lines = [...systemEntries, ...historyEntries].map(
      (entry) => `- ${entry.role}: ${formatContentPreview(entry.content)}`
    );
    await interaction.reply({
      content: lines.join('\n'),
      ephemeral: true
    });
  }
};
