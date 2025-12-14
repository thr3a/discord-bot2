import type { ChatInputCommandInteraction } from 'discord.js';
import { type MockedFunction, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#discord/handlers/messageCreate.js', () => ({
  allowedChannelIds: new Set<string>(),
  resetChannelState: vi.fn(),
  waitChannelQueueToFinish: vi.fn()
}));

vi.mock('#services/channelConversationStore.js', () => ({
  clearChannelConversation: vi.fn()
}));

import { clearCommand } from '#discord/commands/clearCommand.js';
import { allowedChannelIds, resetChannelState, waitChannelQueueToFinish } from '#discord/handlers/messageCreate.js';
import { clearChannelConversation } from '#services/channelConversationStore.js';

const resetChannelStateMock = resetChannelState as MockedFunction<typeof resetChannelState>;
const waitChannelQueueToFinishMock = waitChannelQueueToFinish as MockedFunction<typeof waitChannelQueueToFinish>;
const clearChannelConversationMock = clearChannelConversation as MockedFunction<typeof clearChannelConversation>;

const createInteraction = (channelId = 'test-channel'): ChatInputCommandInteraction => {
  const reply = vi.fn();
  return {
    channelId,
    reply
  } as unknown as ChatInputCommandInteraction;
};

describe('clearCommand', () => {
  beforeEach(() => {
    allowedChannelIds.clear();
    resetChannelStateMock.mockReset();
    waitChannelQueueToFinishMock.mockReset();
    clearChannelConversationMock.mockReset();
  });

  it('許可されていないチャンネルではエラーメッセージを返す', async () => {
    const interaction = createInteraction('blocked-channel');
    await clearCommand.execute(interaction);
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'このチャンネルでは使用できません',
      ephemeral: true
    });
    expect(waitChannelQueueToFinishMock).not.toHaveBeenCalled();
    expect(clearChannelConversationMock).not.toHaveBeenCalled();
  });

  it('履歴を削除して状態をリセットする', async () => {
    const channelId = 'allowed-channel';
    allowedChannelIds.add(channelId);
    const interaction = createInteraction(channelId);

    await clearCommand.execute(interaction);

    expect(waitChannelQueueToFinishMock).toHaveBeenCalledWith(channelId);
    expect(clearChannelConversationMock).toHaveBeenCalledWith(channelId);
    expect(resetChannelStateMock).toHaveBeenCalledWith(channelId);
    expect(interaction.reply).toHaveBeenCalledWith({
      content: '過去の会話を削除しました。'
    });
  });
});
