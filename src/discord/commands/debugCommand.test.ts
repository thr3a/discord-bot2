import type { ChatInputCommandInteraction } from 'discord.js';
import { type MockedFunction, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#discord/handlers/messageCreate.js', () => ({
  allowedChannelIds: new Set<string>(),
  getChannelContextSnapshot: vi.fn(),
  buildSystemPrompt: vi.fn()
}));

import { debugCommand, formatContentPreview } from '#discord/commands/debugCommand.js';
import { allowedChannelIds, buildSystemPrompt, getChannelContextSnapshot } from '#discord/handlers/messageCreate.js';

const snapshotMock = getChannelContextSnapshot as MockedFunction<typeof getChannelContextSnapshot>;
const systemPromptMock = buildSystemPrompt as MockedFunction<typeof buildSystemPrompt>;

const createInteraction = (channelId = 'test-channel'): ChatInputCommandInteraction => {
  const reply = vi.fn();
  return {
    channelId,
    reply
  } as unknown as ChatInputCommandInteraction;
};

describe('debugCommand', () => {
  beforeEach(() => {
    snapshotMock.mockReset();
    systemPromptMock.mockReset();
    allowedChannelIds.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('許可されていないチャンネルではエラーメッセージを返す', async () => {
    const interaction = createInteraction('blocked-channel');
    await debugCommand.execute(interaction);
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'このチャンネルでは使用できません',
      ephemeral: true
    });
    expect(snapshotMock).not.toHaveBeenCalled();
  });

  it('システムプロンプトと履歴を整形して返す', async () => {
    const channelId = 'allowed-channel';
    allowedChannelIds.add(channelId);
    snapshotMock.mockResolvedValue({
      currentOutfit: 'outfit',
      history: [
        { role: 'user', content: 'user message exceeding twenty chars' },
        { role: 'assistant', content: 'ok' }
      ]
    });
    systemPromptMock.mockReturnValue('system message exceeding twenty chars');
    const interaction = createInteraction(channelId);

    await debugCommand.execute(interaction);

    const expectedContent = [
      `- system: ${formatContentPreview('system message exceeding twenty chars')}`,
      `- user: ${formatContentPreview('user message exceeding twenty chars')}`,
      `- assistant: ${formatContentPreview('ok')}`
    ].join('\n');

    expect(interaction.reply).toHaveBeenCalledWith({
      content: expectedContent,
      ephemeral: true
    });
  });
});
