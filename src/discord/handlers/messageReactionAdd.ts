import {
  type Client,
  Events,
  type MessageReaction,
  type PartialMessageReaction,
  type PartialUser,
  type User
} from 'discord.js';
import {
  allowedChannelIds,
  getChannelContextSnapshot,
  resetChannelState,
  scenarioConfirmationEmoji,
  waitChannelQueueToFinish
} from '#discord/handlers/messageCreate.js';
import {
  clearChannelConversation,
  clearPendingScenario,
  loadPendingScenario,
  persistChannelState,
  persistScenarioPrompt
} from '#services/channelConversationStore.js';
import { defaultChannelState } from '#types/conversation.js';

const scenarioRegistrationSuccessMessage = 'シチュエーションを登録しました。ロールプレイを開始できます。';
const pendingScenarioMissingMessage =
  'シチュエーションの仮保存が見つかりませんでした。もう一度 /init を実行してください。';
const scenarioConfirmationUnauthorizedMessage = '/init を実行したユーザーだけがシチュエーションを確定できます。';

const resolveMessageReaction = async (
  reaction: MessageReaction | PartialMessageReaction
): Promise<MessageReaction | null> => {
  if (!reaction.partial) {
    return reaction;
  }
  try {
    const fetchedReaction = await reaction.fetch();
    return fetchedReaction;
  } catch (error) {
    console.warn('リアクション情報の取得に失敗しました', error);
    return null;
  }
};

const resolveUser = async (user: User | PartialUser): Promise<User | null> => {
  if (!user.partial) {
    return user;
  }
  try {
    const fetchedUser = await user.fetch();
    return fetchedUser;
  } catch (error) {
    console.warn('ユーザー情報の取得に失敗しました', error);
    return null;
  }
};

const handlePendingScenarioReaction = async (
  rawReaction: MessageReaction | PartialMessageReaction,
  rawUser: User | PartialUser
): Promise<void> => {
  const user = await resolveUser(rawUser);
  if (!user) {
    return;
  }
  if (user.bot) {
    return;
  }
  const reaction = await resolveMessageReaction(rawReaction);
  if (!reaction) {
    return;
  }
  const message = reaction.message;
  const channelId = message.channelId;
  if (!allowedChannelIds.has(channelId)) {
    return;
  }
  if (reaction.emoji.name !== scenarioConfirmationEmoji) {
    return;
  }

  const context = await getChannelContextSnapshot(channelId);
  if (context.state.type !== 'scenario_preview') {
    return;
  }
  if (message.id !== context.state.previewMessageId) {
    return;
  }
  if (user.id !== context.state.requestedBy) {
    await message.reply(scenarioConfirmationUnauthorizedMessage);
    return;
  }

  await waitChannelQueueToFinish(channelId);

  const pendingScenario = await loadPendingScenario(channelId);
  if (!pendingScenario || pendingScenario.previewMessageId !== message.id) {
    await persistChannelState(channelId, defaultChannelState);
    await clearPendingScenario(channelId);
    resetChannelState(channelId);
    await message.reply(pendingScenarioMissingMessage);
    return;
  }

  try {
    await clearChannelConversation(channelId);
    await persistScenarioPrompt(channelId, pendingScenario.scenario);
    await persistChannelState(channelId, defaultChannelState);
    await clearPendingScenario(channelId);
    resetChannelState(channelId);
    await message.reply(scenarioRegistrationSuccessMessage);
  } catch (error) {
    console.error('シチュエーション登録処理でエラーが発生しました', error);
    await message.reply('シチュエーションの登録に失敗しました。時間を置いてから再度お試しください。');
  }
};

export const registerMessageReactionAddHandler = (client: Client): void => {
  client.on(Events.MessageReactionAdd, (reaction, user) => {
    void handlePendingScenarioReaction(reaction, user);
  });
};
