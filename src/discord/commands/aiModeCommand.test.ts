import type { ChatInputCommandInteraction } from 'discord.js';
import { type MockedFunction, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#discord/handlers/messageCreate.js', () => ({
  allowedChannelIds: new Set<string>(),
  getChannelContextSnapshot: vi.fn(),
  setChannelResponseMode: vi.fn()
}));

vi.mock('#services/channelConversationStore.js', () => ({
  updateResponseMode: vi.fn()
}));

import { aiModeCommand } from '#discord/commands/aiModeCommand.js';
import {
  allowedChannelIds,
  getChannelContextSnapshot,
  setChannelResponseMode
} from '#discord/handlers/messageCreate.js';
import { updateResponseMode } from '#services/channelConversationStore.js';

const snapshotMock = getChannelContextSnapshot as MockedFunction<typeof getChannelContextSnapshot>;
const setChannelResponseModeMock = setChannelResponseMode as MockedFunction<typeof setChannelResponseMode>;
const updateResponseModeMock = updateResponseMode as MockedFunction<typeof updateResponseMode>;

const createInteraction = (channelId: string, target: string): ChatInputCommandInteraction => {
  const reply = vi.fn();
  const getString = vi.fn().mockReturnValue(target);
  return {
    channelId,
    options: {
      getString
    },
    reply
  } as unknown as ChatInputCommandInteraction;
};

const sampleContext = {
  scenario: {
    commonSetting: 'setting',
    commonGuidelines: 'guidelines',
    personas: [
      { id: 'tsun', displayName: 'つんちゃん', archetype: 'a', profile: 'b', speechStyle: 'c' },
      { id: 'yan', displayName: 'やんちゃん', archetype: 'd', profile: 'e', speechStyle: 'f' }
    ]
  },
  personaStates: {},
  history: [],
  responseMode: { type: 'all' } as const
};

describe('aiModeCommand', () => {
  beforeEach(() => {
    allowedChannelIds.clear();
    snapshotMock.mockReset();
    setChannelResponseModeMock.mockReset();
    updateResponseModeMock.mockReset();
    snapshotMock.mockResolvedValue(sampleContext);
  });

  it('許可されていないチャンネルではエラーメッセージを返す', async () => {
    const interaction = createInteraction('blocked', 'all');
    await aiModeCommand.execute(interaction);
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'このチャンネルでは使用できません',
      ephemeral: true
    });
    expect(snapshotMock).not.toHaveBeenCalled();
  });

  it('all指定で全員モードに切り替える', async () => {
    const channelId = 'allowed';
    allowedChannelIds.add(channelId);
    const interaction = createInteraction(channelId, 'all');

    await aiModeCommand.execute(interaction);

    expect(snapshotMock).toHaveBeenCalledWith(channelId);
    expect(updateResponseModeMock).toHaveBeenCalledWith(channelId, { type: 'all' });
    expect(setChannelResponseModeMock).toHaveBeenCalledWith(channelId, { type: 'all' });
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'これからは全員のAIが順番に応答します。',
      ephemeral: true
    });
  });

  it('個別キャラクターを指定して切り替える', async () => {
    const channelId = 'allowed';
    allowedChannelIds.add(channelId);
    const interaction = createInteraction(channelId, 'つんちゃん');

    await aiModeCommand.execute(interaction);

    const expectedMode = { type: 'single', personaId: 'tsun' } as const;
    expect(updateResponseModeMock).toHaveBeenCalledWith(channelId, expectedMode);
    expect(setChannelResponseModeMock).toHaveBeenCalledWith(channelId, expectedMode);
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'つんちゃん とだけ会話するモードに切り替えました。',
      ephemeral: true
    });
  });

  it('存在しないキャラクターを指定した場合は案内を返す', async () => {
    const channelId = 'allowed';
    allowedChannelIds.add(channelId);
    const interaction = createInteraction(channelId, 'unknown');

    await aiModeCommand.execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: '指定したキャラクターは存在しません。利用可能: つんちゃん(tsun), やんちゃん(yan)',
      ephemeral: true
    });
    expect(updateResponseModeMock).not.toHaveBeenCalled();
  });
});
