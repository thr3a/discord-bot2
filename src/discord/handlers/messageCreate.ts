import { generateObject } from 'ai';
import { type Client, Events, type Message } from 'discord.js';
import { dedent } from 'ts-dedent';
import { z } from 'zod';
import { roleplayModel } from '#config/openai.js';
import { loadChannelContext, persistAssistantMessage, persistUserMessage } from '#services/channelConversationStore.js';
import { isSingleResponseMode } from '#types/conversation.js';
import type {
  AssistantConversationEntry,
  ChannelContext,
  ConversationEntry,
  ConversationRole,
  PersonaId,
  PersonaStateMap,
  PersonaStateSnapshot,
  ResponseMode,
  UserConversationEntry
} from '#types/conversation.js';
import type { PersonaPrompt, ScenarioPrompt } from '#types/scenario.js';

export const allowedChannelIds = new Set<string>(['1005750360301912210', '1269204261372166214']);
const maxHistoryLength = 20;

type RegisterMessageCreateHandler = (client: Client) => void;

const responseSchema = z.object({
  line: z.string(),
  currentOutfit: z.string()
});

type ModelMessage = {
  role: ConversationRole;
  content: string;
};

const channelStates = new Map<string, ChannelContext>();
const channelQueues = new Map<string, Promise<void>>();

const shuffle = <T>(list: T[]): T[] => {
  const clone = [...list];
  for (let i = clone.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = clone[i];
    const target = clone[j];
    if (current === undefined || target === undefined) {
      continue;
    }
    clone[i] = target;
    clone[j] = current;
  }
  return clone;
};

export const buildSystemPrompt = (scenario: ScenarioPrompt, persona: PersonaPrompt, outfit?: string): string => {
  const outfitLine = outfit ? `現在の服装: ${outfit}` : '現在の服装は自由に設定して構いません';
  return dedent`
    【共通シチュエーション】
    ${scenario.commonSetting.trim()}

    【共通ルール】
    ${scenario.commonGuidelines.trim()}

    【キャラクター】
    名前: ${persona.displayName} / ${persona.archetype}
    プロフィール: ${persona.profile.trim()}
    口調ガイド: ${persona.speechStyle.trim()}
    ${outfitLine}

    返答は必ずキャラクターの一人称で1メッセージのみ。地の文は禁止。ユーザーを楽しませる会話に徹する。
  `;
};

const buildMessageForModel = (history: ConversationEntry[], scenario: ScenarioPrompt): ModelMessage[] => {
  const personaNameMap = new Map<PersonaId, string>();
  scenario.personas.forEach((persona) => {
    personaNameMap.set(persona.id, persona.displayName);
  });
  return history.map((entry) => {
    if (entry.role === 'assistant') {
      const speaker = personaNameMap.get(entry.personaId) ?? entry.personaId;
      return {
        role: 'assistant',
        content: `【${speaker}】${entry.content}`
      };
    }
    return { role: 'user', content: entry.content };
  });
};

const limitHistory = (state: ChannelContext): void => {
  if (state.history.length <= maxHistoryLength) return;
  state.history.splice(0, state.history.length - maxHistoryLength);
};

const getRespondingPersonas = (context: ChannelContext): PersonaPrompt[] => {
  const responseMode = context.responseMode;
  if (isSingleResponseMode(responseMode)) {
    const persona = context.scenario.personas.find((item) => item.id === responseMode.personaId);
    return persona ? [persona] : context.scenario.personas.slice(0, 1);
  }
  return shuffle(context.scenario.personas);
};

const updatePersonaState = (personaStates: PersonaStateMap, personaId: PersonaId, outfit?: string): PersonaStateMap => {
  const trimmed = outfit?.trim();
  if (trimmed && trimmed.length > 0) {
    personaStates[personaId] = { currentOutfit: trimmed };
  } else {
    personaStates[personaId] = {};
  }
  return personaStates;
};

const sendPersonaReply = async (
  message: Message,
  displayName: string,
  line: string,
  isFirst: boolean
): Promise<void> => {
  const content = `**${displayName}**: ${line}`;
  if (isFirst) {
    await message.reply({ content });
    return;
  }
  await message.reply({
    content,
    allowedMentions: { repliedUser: false }
  });
};

export const resetChannelState = (channelId: string): void => {
  channelStates.delete(channelId);
};

export const setChannelResponseMode = (channelId: string, responseMode: ResponseMode): void => {
  const state = channelStates.get(channelId);
  if (!state) return;
  state.responseMode = responseMode;
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
    personaStates: { ...persisted.personaStates },
    scenario: persisted.scenario,
    responseMode: persisted.responseMode
  };
  channelStates.set(channelId, initialState);
  return initialState;
};

export const getChannelContextSnapshot = async (channelId: string): Promise<ChannelContext> => {
  const state = await getChannelState(channelId);
  const personaStates: PersonaStateMap = {};
  Object.entries(state.personaStates).forEach(([key, value]) => {
    personaStates[key] = value.currentOutfit ? { currentOutfit: value.currentOutfit } : {};
  });
  return {
    history: state.history.map((entry) => ({ ...entry })),
    personaStates,
    scenario: state.scenario,
    responseMode: state.responseMode
  };
};

const enqueueChannelTask = (channelId: string, task: () => Promise<void>): void => {
  const previous = channelQueues.get(channelId) ?? Promise.resolve();
  const run = previous.finally(() => task());
  const finalPromise = run
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
  const addedAssistants: AssistantConversationEntry[] = [];
  const previousPersonaStates = new Map<PersonaId, PersonaStateSnapshot>();

  try {
    const resolvedState = await getChannelState(channelId);
    state = resolvedState;
    const userEntry: UserConversationEntry = { role: 'user', content };
    resolvedState.history.push(userEntry);
    userEntryAdded = true;
    limitHistory(resolvedState);
    await persistUserMessage(channelId, userEntry);

    if ('sendTyping' in channel) {
      await channel.sendTyping();
    }

    const personas = getRespondingPersonas(resolvedState);
    if (personas.length === 0) {
      await message.reply('利用可能なキャラクターが設定されていません。管理者へ連絡してください。');
      return;
    }

    const replies: Array<{ persona: PersonaPrompt; line: string }> = [];

    for (const persona of personas) {
      const system = buildSystemPrompt(
        resolvedState.scenario,
        persona,
        resolvedState.personaStates[persona.id]?.currentOutfit
      );
      const messagesForModel = buildMessageForModel(resolvedState.history, resolvedState.scenario);
      const { object } = await generateObject({
        model: roleplayModel,
        schema: responseSchema,
        messages: messagesForModel,
        system
      });

      const replyContent = object.line.trim() || '……';
      const outfit = object.currentOutfit.trim();
      const assistantEntry: AssistantConversationEntry = {
        role: 'assistant',
        content: replyContent,
        personaId: persona.id
      };

      addedAssistants.push(assistantEntry);
      previousPersonaStates.set(persona.id, { ...resolvedState.personaStates[persona.id] });

      resolvedState.history.push(assistantEntry);
      limitHistory(resolvedState);
      updatePersonaState(resolvedState.personaStates, persona.id, outfit.length > 0 ? outfit : undefined);

      await persistAssistantMessage(channelId, assistantEntry, resolvedState.personaStates);
      replies.push({ persona, line: replyContent });
    }

    for (let i = 0; i < replies.length; i++) {
      const reply = replies[i];
      if (!reply) continue;
      await sendPersonaReply(message, reply.persona.displayName, reply.line, i === 0);
    }
  } catch (error) {
    const existingState = state;
    if (existingState) {
      while (addedAssistants.length > 0) {
        addedAssistants.pop();
        existingState.history.pop();
      }
      for (const [personaId, snapshot] of previousPersonaStates.entries()) {
        if (snapshot?.currentOutfit) {
          existingState.personaStates[personaId] = { currentOutfit: snapshot.currentOutfit };
        } else {
          existingState.personaStates[personaId] = {};
        }
      }
      if (userEntryAdded) {
        const lastEntry = existingState.history[existingState.history.length - 1];
        if (lastEntry?.role === 'user' && lastEntry.content === content) {
          existingState.history.pop();
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
