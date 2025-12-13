import { type Client, Events } from 'discord.js';
import { commandMap } from '../commands';

type InteractionCreateHandler = (client: Client) => void;

export const registerInteractionCreateHandler: InteractionCreateHandler = (client) => {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const command = commandMap.get(interaction.commandName);
    if (!command) {
      await interaction.reply({
        content: '対応するコマンドが見つかりません',
        ephemeral: true
      });
      return;
    }
    try {
      await command.execute(interaction);
    } catch (error) {
      const message = error instanceof Error ? error.message : '不明なエラーが発生しました';
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: `エラー: ${message}`, ephemeral: true });
      } else {
        await interaction.reply({ content: `エラー: ${message}`, ephemeral: true });
      }
    }
  });
};
