import { REST, Routes } from 'discord.js';
import { envConfig } from '../config/env';
import { commands } from './commands';

type RegisterCommands = () => Promise<void>;

export const registerCommands: RegisterCommands = async () => {
  const rest = new REST().setToken(envConfig.discordBotToken);
  const payload = commands.map((command) => command.data.toJSON());

  if (envConfig.discordGuildId) {
    await rest.put(Routes.applicationGuildCommands(envConfig.discordClientId, envConfig.discordGuildId), {
      body: payload
    });
    return;
  }

  await rest.put(Routes.applicationCommands(envConfig.discordClientId), {
    body: payload
  });
};
