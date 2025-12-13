import { Client, Events, GatewayIntentBits } from "discord.js";

import { env } from "../config/env";
import { commandMap } from "../discord/commands";
import { handleInteractionCreate } from "../discord/handlers/interactionCreate";
import { registerCommands } from "../discord/registerCommands";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`起動完了: ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, (interaction) => {
  handleInteractionCreate(interaction, {
    commands: commandMap,
    allowedChannelId: env.openaiChannelId,
  }).catch((error) => {
    console.error("コマンド処理中にエラーが発生しました。", error);
  });
});

const main = async (): Promise<void> => {
  await registerCommands();
  await client.login(env.discordToken);
};

main().catch((error) => {
  console.error("Discord クライアントの初期化に失敗しました。", error);
  process.exitCode = 1;
});
