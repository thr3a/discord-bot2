import { Client, GatewayIntentBits } from 'discord.js';
import { envConfig } from '../config/env';
import { registerInteractionCreateHandler } from '../discord/handlers/interactionCreate';
import { registerCommands } from '../discord/registerCommands';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const bootstrap = async (): Promise<void> => {
  registerInteractionCreateHandler(client);
  await registerCommands();
  await client.login(envConfig.discordBotToken);
};

bootstrap().catch((error) => {
  console.error('Discord起動に失敗しました', error);
  process.exit(1);
});
