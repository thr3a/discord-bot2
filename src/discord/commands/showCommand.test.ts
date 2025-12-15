import { AttachmentBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { type MockedFunction, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#discord/handlers/messageCreate.js', () => ({
  allowedChannelIds: new Set<string>(),
  getChannelContextSnapshot: vi.fn(),
  buildSystemPrompt: vi.fn()
}));

import {
  noScenarioMessage,
  showCommand,
  systemPromptFileName,
  systemPromptFileNotice
} from '#discord/commands/showCommand.js';
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
  worldSetting: {
    location: '学園都市の部室棟',
    time: '放課後の夕刻',
    situation: '文化祭の準備で二人のヒロインと作戦会議中'
  },
  humanCharacter: {
    name: 'ユーザー',
    gender: '男性',
    age: '18歳',
    personality: '素直',
    background: '同級生'
  },
  relationship: '幼なじみ',
  personas: [
    {
      id: 'tsun',
      displayName: 'つんちゃん',
      gender: '女性',
      age: '18歳',
      firstPerson: '私',
      secondPerson: 'あんた',
      personality: '照れ屋',
      outfit: 'ブレザー',
      background: '幼なじみで世話焼き'
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
      responseMode: { type: 'all' },
      state: { type: 'idle' }
    });
    systemPromptMock.mockReturnValueOnce('system prompt for tsun');
    const interaction = createInteraction(channelId);

    await showCommand.execute(interaction);

    expect(interaction.reply).toHaveBeenCalledTimes(1);
    const replyPayload = interaction.reply.mock.calls[0][0];
    expect(replyPayload.content).toBe(systemPromptFileNotice);
    expect(replyPayload.files).toHaveLength(1);
    const attachment = replyPayload.files[0] as AttachmentBuilder;
    expect(attachment).toBeInstanceOf(AttachmentBuilder);
    expect(attachment.name).toBe(systemPromptFileName);
    expect(attachment.attachment.toString()).toBe('system prompt for tsun');
    expect(systemPromptMock).toHaveBeenCalledWith(sampleScenario, sampleScenario.personas[0], 'セーラー服');
  });

  it('シチュエーションが存在しない場合は案内文を返す', async () => {
    const channelId = 'empty-channel';
    allowedChannelIds.add(channelId);
    snapshotMock.mockResolvedValue({
      scenario: undefined as unknown as ScenarioPrompt,
      history: [],
      personaStates: {},
      responseMode: { type: 'all' },
      state: { type: 'idle' }
    });
    const interaction = createInteraction(channelId);

    await showCommand.execute(interaction);

    expect(interaction.reply).toHaveBeenCalledTimes(1);
    const replyPayload = interaction.reply.mock.calls[0][0];
    expect(replyPayload.content).toBe(noScenarioMessage);
    expect(replyPayload.files).toHaveLength(1);
    const attachment = replyPayload.files[0] as AttachmentBuilder;
    expect(attachment).toBeInstanceOf(AttachmentBuilder);
    expect(attachment.name).toBe(systemPromptFileName);
    expect(attachment.attachment.toString()).toBe(noScenarioMessage);
    expect(systemPromptMock).not.toHaveBeenCalled();
  });
});
