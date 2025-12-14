import { REST, Routes } from 'discord.js';
import { envConfig } from '#config/env.js';
import { commands } from '#discord/commands/index.js';

type RegisterCommands = () => Promise<void>;

export const registerCommands: RegisterCommands = async () => {
  console.log('スラッシュコマンド登録処理を開始します');
  const rest = new REST().setToken(envConfig.discordBotToken);
  const payload = commands.map((command) => command.data.toJSON());

  if (envConfig.discordGuildId) {
    await rest.put(Routes.applicationGuildCommands(envConfig.discordClientId, envConfig.discordGuildId), {
      body: payload
    });
    console.log('ギルド向けスラッシュコマンド登録が完了しました');
    return;
  }

  await rest.put(Routes.applicationCommands(envConfig.discordClientId), {
    body: payload
  });
  console.log('グローバルスラッシュコマンド登録が完了しました');
};
