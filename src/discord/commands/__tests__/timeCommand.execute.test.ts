import type { ChatInputCommandInteraction } from 'discord.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { timeCommand } from '../timeCommand';

const fixedDate = new Date('2024-01-01T00:00:00Z');

const createInteraction = (): ChatInputCommandInteraction => {
  const reply = vi.fn();
  return {
    reply
  } as unknown as ChatInputCommandInteraction;
};

describe('timeCommand', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedDate);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('日本時間で返信する', async () => {
    const interaction = createInteraction();
    await timeCommand.execute(interaction);
    expect(interaction.reply).toHaveBeenCalledWith({
      content: '現在時刻 (Asia/Tokyo) は 2024-01-01 09:00:00 です'
    });
  });
});
