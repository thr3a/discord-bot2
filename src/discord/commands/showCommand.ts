import { AttachmentBuilder, SlashCommandBuilder } from 'discord.js';
import type { SlashCommand } from '#discord/commands/types.js';
import { allowedChannelIds, getChannelContextSnapshot } from '#discord/handlers/messageCreate.js';
import { formatScenarioPrompts, systemPromptFileName as promptFileName } from '#discord/utils/systemPrompt.js';

export const systemPromptFileName = promptFileName;
import type { ScenarioPrompt } from '#types/scenario.js';

export const noScenarioMessage = '現在登録されているシチュエーションはありません。/init で登録できます。';
export const systemPromptFileNotice = 'システムプロンプトをテキストファイルで送信しました。';

const createPromptAttachment = (content: string): AttachmentBuilder => {
  return new AttachmentBuilder(Buffer.from(content, 'utf-8'), { name: systemPromptFileName });
};

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
      await interaction.reply({
        content: noScenarioMessage,
        files: [createPromptAttachment(noScenarioMessage)]
      });
      return;
    }

    const content = formatScenarioPrompts(scenario, context.personaStates);
    const fileContent = content.trim().length > 0 ? content : noScenarioMessage;
    await interaction.reply({
      content: systemPromptFileNotice,
      files: [createPromptAttachment(fileContent)]
    });
  }
};
