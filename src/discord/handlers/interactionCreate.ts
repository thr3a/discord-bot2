import { type Client, Events } from 'discord.js';
import { commandMap } from '#discord/commands/index.js';

type InteractionCreateHandler = (client: Client) => void;

export const registerInteractionCreateHandler: InteractionCreateHandler = (client) => {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    console.log(
      `[interactionCreate] コマンド受信 コマンド名=${interaction.commandName} ユーザー=${interaction.user.id}`
    );
    const command = commandMap.get(interaction.commandName);
    if (!command) {
      console.warn(`[interactionCreate] 未登録コマンド コマンド名=${interaction.commandName}`);
      await interaction.reply({
        content: '対応するコマンドが見つかりません',
        ephemeral: true
      });
      return;
    }
    try {
      console.log(`[interactionCreate] 実行開始 コマンド名=${interaction.commandName}`);
      await command.execute(interaction);
      console.log(`[interactionCreate] 実行成功 コマンド名=${interaction.commandName}`);
    } catch (error) {
      console.error(`[interactionCreate] エラー発生 コマンド名=${interaction.commandName}`, error);
      const message = error instanceof Error ? error.message : '不明なエラーが発生しました';
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: `エラー: ${message}`, ephemeral: true });
      } else {
        await interaction.reply({ content: `エラー: ${message}`, ephemeral: true });
      }
    }
  });
};
