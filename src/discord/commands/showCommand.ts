import { SlashCommandBuilder } from 'discord.js';
import type { SlashCommand } from '#discord/commands/types.js';
import { allowedChannelIds, buildSystemPrompt, getChannelContextSnapshot } from '#discord/handlers/messageCreate.js';
import type { PersonaStateMap } from '#types/conversation.js';
import type { ScenarioPrompt } from '#types/scenario.js';

const formatSystemPrompts = (scenario: ScenarioPrompt, personaStates: PersonaStateMap): string => {
  return scenario.personas
    .map((persona) => buildSystemPrompt(scenario, persona, personaStates[persona.id]?.currentOutfit))
    .join('\n\n');
};

export const noScenarioMessage = '現在登録されているシチュエーションはありません。/init で登録できます。';

export const showCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName('show').setDescription('現在のシチュエーションを表示します'),
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
    const scenario = context.scenario as ScenarioPrompt | undefined;
    if (!scenario) {
      await interaction.reply({ content: noScenarioMessage });
      return;
    }

    const content = formatSystemPrompts(scenario, context.personaStates);
    await interaction.reply({ content: content.trim().length > 0 ? content : noScenarioMessage });
  }
};
