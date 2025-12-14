import { SlashCommandBuilder } from 'discord.js';
import type { SlashCommand } from '#discord/commands/types.js';
import {
  allowedChannelIds,
  getChannelContextSnapshot,
  setChannelResponseMode
} from '#discord/handlers/messageCreate.js';
import { updateResponseMode } from '#services/channelConversationStore.js';
import type { PersonaPrompt } from '#types/scenario.js';

const normalizeTarget = (value: string): string => value.trim().toLowerCase();

const findPersona = (value: string, personas: PersonaPrompt[]): PersonaPrompt | undefined => {
  const normalized = normalizeTarget(value);
  return personas.find((persona) => {
    const idMatch = persona.id.toLowerCase() === normalized;
    const nameMatch = persona.displayName.toLowerCase() === normalized;
    return idMatch || nameMatch;
  });
};

export const aiModeCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('aimode')
    .setDescription('会話するAIキャラクターを切り替えます')
    .addStringOption((option) =>
      option
        .setName('target')
        .setDescription('all で全員、キャラ名/IDで個別指定（例: つんちゃん, tsun）')
        .setRequired(true)
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

    const target = interaction.options.getString('target', true).trim();
    const normalized = normalizeTarget(target);
    const context = await getChannelContextSnapshot(channelId);

    if (['all', 'both', 'everyone', '全員'].includes(normalized)) {
      const responseMode = { type: 'all' } as const;
      await updateResponseMode(channelId, responseMode);
      setChannelResponseMode(channelId, responseMode);
      await interaction.reply({
        content: 'これからは全員のAIが順番に応答します。',
        ephemeral: true
      });
      return;
    }

    const persona = findPersona(target, context.scenario.personas);
    if (!persona) {
      const available = context.scenario.personas.map((item) => `${item.displayName}(${item.id})`).join(', ');
      await interaction.reply({
        content: `指定したキャラクターは存在しません。利用可能: ${available}`,
        ephemeral: true
      });
      return;
    }

    const responseMode = { type: 'single', personaId: persona.id } as const;
    await updateResponseMode(channelId, responseMode);
    setChannelResponseMode(channelId, responseMode);
    await interaction.reply({
      content: `${persona.displayName} とだけ会話するモードに切り替えました。`,
      ephemeral: true
    });
  }
};
