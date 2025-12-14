import { generateObject } from 'ai';
import { type Client, Events, type Message } from 'discord.js';
import { z } from 'zod';
import { roleplayModel } from '#config/openai.js';

const allowedChannelIds = new Set<string>(['1005750360301912210', '1269204261372166214']);
const systemPrompt = '優しいお姉さんで会話してください。セリフと現在のあなたの服装を書いてください。';
const maxHistoryLength = 20;

type ConversationEntry = {
  role: 'user' | 'assistant';
  content: string;
};

type ChannelState = {
  history: ConversationEntry[];
  currentOutfit?: string;
};

type RegisterMessageCreateHandler = (client: Client) => void;

const responseSchema = z.object({
  line: z.string(),
  currentOutfit: z.string()
});

const channelStates = new Map<string, ChannelState>();
const channelQueues = new Map<string, Promise<void>>();

const getChannelState = (channelId: string): ChannelState => {
  const state = channelStates.get(channelId);
  if (state) return state;
  const initialState: ChannelState = { history: [] };
  channelStates.set(channelId, initialState);
  return initialState;
};

const buildSystemPrompt = (outfit?: string): string => {
  if (!outfit) return systemPrompt;
  return `${systemPrompt}\n現在のお姉さんの服装: ${outfit}`;
};

const limitHistory = (state: ChannelState): void => {
  if (state.history.length <= maxHistoryLength) return;
  state.history.splice(0, state.history.length - maxHistoryLength);
};

const enqueueChannelTask = (channelId: string, task: () => Promise<void>): void => {
  const previous = channelQueues.get(channelId) ?? Promise.resolve();
  // biome-ignore lint/style/useConst: <explanation>
  let finalPromise: Promise<void>;
  const run = previous.finally(() => task());
  finalPromise = run
    .catch((error) => {
      console.error('ロールプレイ処理でエラーが発生しました', error);
    })
    .finally(() => {
      if (channelQueues.get(channelId) === finalPromise) {
        channelQueues.delete(channelId);
      }
    });
  channelQueues.set(channelId, finalPromise);
};

const handleRoleplayMessage = async (message: Message): Promise<void> => {
  const content = message.content.trim();
  if (!content) {
    await message.reply('テキストメッセージを入力してください');
    return;
  }
  const channel = message.channel;
  if (!channel.isTextBased()) {
    await message.reply('テキストチャンネルでのみ対応しています');
    return;
  }

  const state = getChannelState(message.channelId);
  const userEntry: ConversationEntry = { role: 'user', content };
  state.history.push(userEntry);
  limitHistory(state);

  try {
    if ('sendTyping' in channel) {
      await channel.sendTyping();
    }

    const { object } = await generateObject({
      model: roleplayModel,
      schema: responseSchema,
      messages: state.history,
      system: buildSystemPrompt(state.currentOutfit)
    });

    const replyContent = object.line.trim();
    const outfit = object.currentOutfit.trim();

    state.history.push({ role: 'assistant', content: replyContent });
    state.currentOutfit = outfit;
    limitHistory(state);

    await message.reply(replyContent);
  } catch (error) {
    const lastEntry = state.history[state.history.length - 1];
    if (lastEntry?.role === 'user' && lastEntry.content === content) {
      state.history.pop();
    }
    console.error('ロールプレイ応答の生成に失敗しました', error);
    await message.reply('ごめんなさい、少し調子が悪いみたい。もう一度お願いできますか？');
  }
};

export const registerMessageCreateHandler: RegisterMessageCreateHandler = (client) => {
  client.on(Events.MessageCreate, (message) => {
    if (!allowedChannelIds.has(message.channelId)) {
      console.log(`[messageCreate] 許可されていないチャンネルのため無視しました チャンネル=${message.channelId}`);
      return;
    }
    if (message.author.bot) {
      return;
    }
    enqueueChannelTask(message.channelId, () => handleRoleplayMessage(message));
  });
};
