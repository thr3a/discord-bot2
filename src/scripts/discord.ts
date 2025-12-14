import { Client, Events, GatewayIntentBits } from 'discord.js';
import { envConfig } from '#config/env.js';
import { registerInteractionCreateHandler } from '#discord/handlers/interactionCreate.js';
import { registerMessageCreateHandler } from '#discord/handlers/messageCreate.js';
import { registerCommands } from '#discord/registerCommands.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once(Events.ClientReady, (readyClient) => {
  const tag = readyClient.user?.tag ?? 'ユーザー情報なし';
  console.log(`Discordクライアントの準備が整いました: ${tag}`);
});

client.on(Events.Error, (error) => {
  console.error('Discordクライアントで未処理のエラーが発生しました', error);
});

const bootstrap = async (): Promise<void> => {
  registerInteractionCreateHandler(client);
  registerMessageCreateHandler(client);
  await registerCommands();
  await client.login(envConfig.discordBotToken);
};

bootstrap().catch((error) => {
  console.error('Discord起動に失敗しました', error);
  process.exit(1);
});
