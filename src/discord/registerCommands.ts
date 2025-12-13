import { REST, Routes } from "discord.js";

import { env } from "../config/env";
import { commands } from "./commands";

export const registerCommands = async (): Promise<void> => {
  const rest = new REST({ version: "10" }).setToken(env.discordToken);
  await rest.put(
    Routes.applicationGuildCommands(env.clientId, env.guildId),
    { body: commands.map((command) => command.data.toJSON()) },
  );
  console.log("スラッシュコマンドを登録しました。");
};

