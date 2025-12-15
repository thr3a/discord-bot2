import { AttachmentBuilder, type ChatInputCommandInteraction, type InteractionReplyOptions } from 'discord.js';
import { type MockedFunction, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#discord/handlers/messageCreate.js', () => ({
  allowedChannelIds: new Set<string>(),
  getChannelContextSnapshot: vi.fn()
}));

vi.mock('#discord/utils/systemPrompt.js', () => ({
  formatScenarioPrompts: vi.fn(),
  systemPromptFileName: 'system-prompts.txt'
}));

import {
  noScenarioMessage,
  showCommand,
  systemPromptFileName,
  systemPromptFileNotice
} from '#discord/commands/showCommand.js';
import { allowedChannelIds, getChannelContextSnapshot } from '#discord/handlers/messageCreate.js';
import { formatScenarioPrompts } from '#discord/utils/systemPrompt.js';
import type { ScenarioPrompt } from '#types/scenario.js';

const snapshotMock = getChannelContextSnapshot as MockedFunction<typeof getChannelContextSnapshot>;
const formatScenarioPromptsMock = formatScenarioPrompts as MockedFunction<typeof formatScenarioPrompts>;

type InteractionReplyMock = MockedFunction<ChatInputCommandInteraction['reply']>;

type MockChatInputCommandInteraction = ChatInputCommandInteraction & {
  reply: InteractionReplyMock;
};

const createInteraction = (channelId = 'test-channel'): MockChatInputCommandInteraction => {
  const reply = vi.fn<ChatInputCommandInteraction['reply']>();
  return {
    channelId,
    reply
  } as unknown as MockChatInputCommandInteraction;
};

const getReplyPayload = (interaction: MockChatInputCommandInteraction): InteractionReplyOptions => {
  const firstCall = interaction.reply.mock.calls[0];
  if (!firstCall) {
    throw new Error('reply が呼び出されていません');
  }
  return firstCall[0] as InteractionReplyOptions;
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
    age: 18,
    personality: '素直',
    background: '同級生'
  },
  personas: [
    {
      id: 'tsun',
      displayName: 'つんちゃん',
      gender: '女性',
      age: 18,
      firstPerson: '私',
      secondPerson: 'あんた',
      personality: '照れ屋',
      outfit: 'ブレザー',
      background: '幼なじみで世話焼き',
      relationship: '幼なじみで互いに想いを隠し合っている'
    }
  ]
};

describe('showCommand', () => {
  beforeEach(() => {
    allowedChannelIds.clear();
    snapshotMock.mockReset();
    formatScenarioPromptsMock.mockReset();
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
    formatScenarioPromptsMock.mockReturnValueOnce('system prompt for tsun');
    const interaction = createInteraction(channelId);

    await showCommand.execute(interaction);

    expect(interaction.reply).toHaveBeenCalledTimes(1);
    const replyPayload = getReplyPayload(interaction);
    expect(replyPayload.content).toBe(systemPromptFileNotice);
    const files = replyPayload.files as AttachmentBuilder[] | undefined;
    if (!files) {
      throw new Error('添付ファイルが存在しません');
    }
    expect(files).toHaveLength(1);
    const attachment = files[0];
    if (!attachment) {
      throw new Error('添付ファイルの取得に失敗しました');
    }
    expect(attachment).toBeInstanceOf(AttachmentBuilder);
    expect(attachment.name).toBe(systemPromptFileName);
    expect(attachment.attachment.toString()).toBe('system prompt for tsun');
    expect(formatScenarioPromptsMock).toHaveBeenCalledWith(sampleScenario, {
      tsun: { currentOutfit: 'セーラー服' }
    });
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
    const replyPayload = getReplyPayload(interaction);
    expect(replyPayload.content).toBe(noScenarioMessage);
    const files = replyPayload.files as AttachmentBuilder[] | undefined;
    if (!files) {
      throw new Error('添付ファイルが存在しません');
    }
    expect(files).toHaveLength(1);
    const attachment = files[0];
    if (!attachment) {
      throw new Error('添付ファイルの取得に失敗しました');
    }
    expect(attachment).toBeInstanceOf(AttachmentBuilder);
    expect(attachment.name).toBe(systemPromptFileName);
    expect(attachment.attachment.toString()).toBe(noScenarioMessage);
    expect(formatScenarioPromptsMock).not.toHaveBeenCalled();
  });
});
