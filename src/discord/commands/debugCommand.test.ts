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
      scenario: {
        worldSetting: {
          location: '舞台の街',
          time: '夕暮れ前',
          situation: '小さな誤解から距離ができた直後'
        },
        humanCharacter: {
          name: 'ユーザー',
          gender: '女性',
          age: '20',
          personality: '穏やか',
          background: '同僚'
        },
        relationship: '同僚から恋人へ',
        personas: [
          {
            id: 'tsun',
            displayName: 'つんちゃん',
            gender: '女性',
            age: '20',
            firstPerson: '私',
            secondPerson: 'あんた',
            personality: 'ツンデレ',
            outfit: 'スーツ',
            background: '幼なじみ'
          },
          {
            id: 'yan',
            displayName: 'やんちゃん',
            gender: '女性',
            age: '20',
            firstPerson: 'わたし',
            secondPerson: 'きみ',
            personality: 'ヤンデレ',
            outfit: '私服',
            background: '同級生'
          }
        ]
      },
      personaStates: {
        tsun: { currentOutfit: 'sailor' },
        yan: {}
      },
      history: [
        { role: 'user', content: 'user message exceeding twenty chars' },
        { role: 'assistant', content: 'ok', personaId: 'yan' }
      ],
      responseMode: { type: 'all' },
      state: { type: 'idle' }
    });
    systemPromptMock.mockReturnValueOnce('tsun system exceeding twenty chars');
    systemPromptMock.mockReturnValueOnce('yan system exceeding twenty chars');
    const interaction = createInteraction(channelId);

    await debugCommand.execute(interaction);

    const expectedContent = [
      `- system(つんちゃん): ${formatContentPreview('tsun system exceeding twenty chars')}`,
      `- system(やんちゃん): ${formatContentPreview('yan system exceeding twenty chars')}`,
      `- user: ${formatContentPreview('user message exceeding twenty chars')}`,
      `- assistant(やんちゃん): ${formatContentPreview('ok')}`
    ].join('\n');

    expect(interaction.reply).toHaveBeenCalledWith({
      content: expectedContent,
      ephemeral: true
    });
  });
});
