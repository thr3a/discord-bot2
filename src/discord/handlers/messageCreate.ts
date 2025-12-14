import { generateObject } from 'ai';
import { type Client, Events, type Message } from 'discord.js';
import { dedent } from 'ts-dedent';
import { z } from 'zod';
import { roleplayModel } from '#config/openai.js';
import { loadChannelContext, persistAssistantMessage, persistUserMessage } from '#services/channelConversationStore.js';
import type { ChannelContext, ConversationEntry } from '#types/conversation.js';

export const systemPrompt = dedent`
あなたは優しいお姉さんとして会話してください。セリフと現在のあなたの服装を書いてください。
`;

export const allowedChannelIds = new Set<string>(['1005750360301912210', '1269204261372166214']);
const maxHistoryLength = 20;

type RegisterMessageCreateHandler = (client: Client) => void;

const responseSchema = z.object({
  line: z.string(),
  currentOutfit: z.string()
});

const channelStates = new Map<string, ChannelContext>();
const channelQueues = new Map<string, Promise<void>>();

export const resetChannelState = (channelId: string): void => {
  channelStates.set(channelId, { history: [], currentOutfit: undefined });
};

export const waitChannelQueueToFinish = async (channelId: string): Promise<void> => {
  const queue = channelQueues.get(channelId);
  if (!queue) {
    return;
  }
  try {
    await queue;
  } catch (error) {
    console.error('キュー処理の完了待ちでエラーが発生しました', error);
  }
};

const getChannelState = async (channelId: string): Promise<ChannelContext> => {
  const state = channelStates.get(channelId);
  if (state) return state;
  const persisted = await loadChannelContext(channelId, maxHistoryLength);
  const initialState: ChannelContext = {
    history: [...persisted.history],
    currentOutfit: persisted.currentOutfit
  };
  channelStates.set(channelId, initialState);
  return initialState;
};

export const getChannelContextSnapshot = async (channelId: string): Promise<ChannelContext> => {
  const state = await getChannelState(channelId);
  return {
    history: state.history.map((entry) => ({ ...entry })),
    currentOutfit: state.currentOutfit
  };
};

export const buildSystemPrompt = (outfit?: string): string => {
  if (!outfit) return systemPrompt;
  return `${systemPrompt}\n現在のお姉さんの服装: ${outfit}`;
};

const limitHistory = (state: ChannelContext): void => {
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

  const channelId = message.channelId;
  let state: ChannelContext | undefined;
  let userEntryAdded = false;
  let assistantEntryAdded = false;
  let previousOutfit: string | undefined;

  try {
    const resolvedState = await getChannelState(channelId);
    state = resolvedState;
    const userEntry: ConversationEntry = { role: 'user', content };
    resolvedState.history.push(userEntry);
    userEntryAdded = true;
    limitHistory(resolvedState);
    await persistUserMessage(channelId, userEntry);

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
    const assistantEntry: ConversationEntry = { role: 'assistant', content: replyContent };

    previousOutfit = resolvedState.currentOutfit;
    resolvedState.history.push(assistantEntry);
    resolvedState.currentOutfit = outfit;
    assistantEntryAdded = true;
    limitHistory(resolvedState);

    await persistAssistantMessage(channelId, assistantEntry, outfit);

    await message.reply(replyContent);
  } catch (error) {
    if (state) {
      if (assistantEntryAdded) {
        state.history.pop();
        state.currentOutfit = previousOutfit;
      }
      if (userEntryAdded) {
        const lastEntry = state.history[state.history.length - 1];
        if (lastEntry?.role === 'user' && lastEntry.content === content) {
          state.history.pop();
        }
      }
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
