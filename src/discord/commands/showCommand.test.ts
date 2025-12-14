import type { ChatInputCommandInteraction } from 'discord.js';
import { type MockedFunction, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#discord/handlers/messageCreate.js', () => ({
  allowedChannelIds: new Set<string>(),
  getChannelContextSnapshot: vi.fn(),
  buildSystemPrompt: vi.fn()
}));

import { noScenarioMessage, showCommand } from '#discord/commands/showCommand.js';
import { allowedChannelIds, buildSystemPrompt, getChannelContextSnapshot } from '#discord/handlers/messageCreate.js';
import type { ScenarioPrompt } from '#types/scenario.js';

const snapshotMock = getChannelContextSnapshot as MockedFunction<typeof getChannelContextSnapshot>;
const systemPromptMock = buildSystemPrompt as MockedFunction<typeof buildSystemPrompt>;

const createInteraction = (channelId = 'test-channel'): ChatInputCommandInteraction => {
  const reply = vi.fn();
  return {
    channelId,
    reply
  } as unknown as ChatInputCommandInteraction;
};

const sampleScenario: ScenarioPrompt = {
  commonSetting: '部室で放課後トーク',
  commonGuidelines: '地の文禁止',
  personas: [
    {
      id: 'tsun',
      displayName: 'つんちゃん',
      archetype: 'ツンデレ',
      profile: 'profile line',
      speechStyle: 'style line'
    }
  ]
};

describe('showCommand', () => {
  beforeEach(() => {
    allowedChannelIds.clear();
    snapshotMock.mockReset();
    systemPromptMock.mockReset();
  });

  it('許可されていないチャンネルではエラーメッセージを返す', async () => {
    const interaction = createInteraction('blocked-channel');
    await showCommand.execute(interaction);
    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'このチャンネルでは使用できません',
      ephemeral: true
    });
    expect(snapshotMock).not.toHaveBeenCalled();
  });

  it('登録済みシチュエーションのシステムプロンプトをそのまま返す', async () => {
    const channelId = 'allowed-channel';
    allowedChannelIds.add(channelId);
    snapshotMock.mockResolvedValue({
      scenario: sampleScenario,
      history: [],
      personaStates: {
        tsun: { currentOutfit: 'セーラー服' }
      },
      responseMode: { type: 'all' }
    });
    systemPromptMock.mockReturnValueOnce('system prompt for tsun');
    const interaction = createInteraction(channelId);

    await showCommand.execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: 'system prompt for tsun'
    });
    expect(systemPromptMock).toHaveBeenCalledWith(
      sampleScenario,
      sampleScenario.personas[0],
      'セーラー服'
    );
  });

  it('シチュエーションが存在しない場合は案内文を返す', async () => {
    const channelId = 'empty-channel';
    allowedChannelIds.add(channelId);
    snapshotMock.mockResolvedValue({
      scenario: undefined as unknown as ScenarioPrompt,
      history: [],
      personaStates: {},
      responseMode: { type: 'all' }
    });
    const interaction = createInteraction(channelId);

    await showCommand.execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith({
      content: noScenarioMessage
    });
    expect(systemPromptMock).not.toHaveBeenCalled();
  });
});
