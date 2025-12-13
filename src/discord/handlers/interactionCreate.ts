import type { Interaction } from "discord.js";

import type { SlashCommand } from "../commands/types";

export type InteractionHandlerContext = {
  commands: Map<string, SlashCommand>;
  allowedChannelId: string;
};

export const isAllowedChannel = (
  channelId: string | null,
  allowedChannelId: string,
): boolean => channelId === allowedChannelId;

export const handleInteractionCreate = async (
  interaction: Interaction,
  context: InteractionHandlerContext,
): Promise<void> => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  if (!isAllowedChannel(interaction.channelId, context.allowedChannelId)) {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "このコマンドは指定チャンネルでのみ利用できます。",
        ephemeral: true,
      });
    }
    return;
  }

  const command = context.commands.get(interaction.commandName);
  if (!command) {
    console.warn(`未登録のコマンドが呼び出されました: ${interaction.commandName}`);
    return;
  }

  await command.execute(interaction);
};

