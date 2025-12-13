const requiredVarError = (key: string): Error => new Error(`${key} が設定されていません`);

type EnvConfig = {
  discordBotToken: string;
  discordClientId: string;
  discordGuildId?: string;
};

const { DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;

if (!DISCORD_BOT_TOKEN) throw requiredVarError('DISCORD_BOT_TOKEN');
if (!DISCORD_CLIENT_ID) throw requiredVarError('DISCORD_CLIENT_ID');

export const envConfig: EnvConfig = {
  discordBotToken: DISCORD_BOT_TOKEN,
  discordClientId: DISCORD_CLIENT_ID,
  discordGuildId: DISCORD_GUILD_ID
};
