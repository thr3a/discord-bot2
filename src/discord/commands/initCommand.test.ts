import type { ChatInputCommandInteraction } from 'discord.js';
import { type MockedFunction, beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultScenarioPrompt } from '#config/defaultScenario.js';
import type { ChannelContext } from '#types/conversation.js';

vi.mock('#discord/handlers/messageCreate.js', () => ({
  allowedChannelIds: new Set<string>(),
  getChannelContextSnapshot: vi.fn(),
  resetChannelState: vi.fn(),
  waitChannelQueueToFinish: vi.fn()
}));

vi.mock('#services/channelConversationStore.js', () => ({
  persistChannelState: vi.fn()
}));

import { initCommand } from '#discord/commands/initCommand.js';
import {
  allowedChannelIds,
  getChannelContextSnapshot,
  resetChannelState,
  waitChannelQueueToFinish
} from '#discord/handlers/messageCreate.js';
import { persistChannelState } from '#services/channelConversationStore.js';

const waitChannelQueueToFinishMock = waitChannelQueueToFinish as MockedFunction<typeof waitChannelQueueToFinish>;
const getChannelContextSnapshotMock = getChannelContextSnapshot as MockedFunction<typeof getChannelContextSnapshot>;
const persistChannelStateMock = persistChannelState as MockedFunction<typeof persistChannelState>;
const resetChannelStateMock = resetChannelState as MockedFunction<typeof resetChannelState>;

const baseContext: ChannelContext = {
  history: [],
  personaStates: {},
  scenario: defaultScenarioPrompt,
  responseMode: { type: 'all' },
  state: { type: 'idle' }
};

const createInteraction = (channelId: string, personaCount = 2): ChatInputCommandInteraction => {
  const reply = vi.fn();
  return {
    channelId,
    user: { id: 'user-1' },
    options: {
      getInteger: vi.fn(() => personaCount)
    },
    reply
  } as unknown as ChatInputCommandInteraction;
};

describe('initCommand', () => {
  beforeEach(() => {
    allowedChannelIds.clear();
    waitChannelQueueToFinishMock.mockReset();
    getChannelContextSnapshotMock.mockReset();
    persistChannelStateMock.mockReset();
    resetChannelStateMock.mockReset();
  });

  it('許可されていないチャンネルでは利用できない', async () => {
    const interaction = createInteraction('blocked');

    await initCommand.execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'このチャンネルでは使用できません',
      ephemeral: true
    });
    expect(waitChannelQueueToFinishMock).not.toHaveBeenCalled();
  });

  it('入力待ち状態であれば実行を拒否する', async () => {
    const channelId = 'allowed';
    allowedChannelIds.add(channelId);
    const interaction = createInteraction(channelId);
    getChannelContextSnapshotMock.mockResolvedValue({
      ...baseContext,
      state: {
        type: 'situation_input',
        personaCount: 2,
        requestedBy: 'user-1'
      }
    });

    await initCommand.execute(interaction);

    expect(waitChannelQueueToFinishMock).toHaveBeenCalledWith(channelId);
    expect(interaction.reply).toHaveBeenCalledWith({
      content: '現在別のシチュエーション入力待ちです。完了してから再度お試しください。',
      ephemeral: true
    });
    expect(persistChannelStateMock).not.toHaveBeenCalled();
  });

  it('状態をシチュエーション入力モードへ遷移させる', async () => {
    const channelId = 'allowed';
    const personaCount = 3;
    allowedChannelIds.add(channelId);
    const interaction = createInteraction(channelId, personaCount);
    getChannelContextSnapshotMock.mockResolvedValue(baseContext);

    await initCommand.execute(interaction);

    expect(persistChannelStateMock).toHaveBeenCalledWith(channelId, {
      type: 'situation_input',
      personaCount,
      requestedBy: 'user-1'
    });
    expect(resetChannelStateMock).toHaveBeenCalledWith(channelId);
    expect(interaction.reply).toHaveBeenCalledWith({
      content: `シチュエーションを入力してください。（AIキャラクター数: ${personaCount}人）`
    });
  });
});
