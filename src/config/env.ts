export type EnvConfig = {
  discordToken: string;
  clientId: string;
  guildId: string;
  openaiChannelId: string;
};

const requiredEnvKeys = [
  "DISCORD_BOT_TOKEN",
  "DISCORD_CLIENT_ID",
  "DISCORD_GUILD_ID",
] as const;

const readRequiredEnv = (key: (typeof requiredEnvKeys)[number]): string => {
  const value = process.env[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`環境変数 ${key} が設定されていません。`);
  }
  return value;
};

export const env: EnvConfig = {
  discordToken: readRequiredEnv("DISCORD_BOT_TOKEN"),
  clientId: readRequiredEnv("DISCORD_CLIENT_ID"),
  guildId: readRequiredEnv("DISCORD_GUILD_ID"),
  openaiChannelId:
    process.env.OPENAI_CHANNEL_ID ?? "1005750360301912210",
};
