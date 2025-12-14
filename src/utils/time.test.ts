import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatCurrentTime } from './time';

const fixedDate = new Date('2024-01-01T00:00:00Z');

describe('formatCurrentTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedDate);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('固定した現在時刻を返す', () => {
    const result = formatCurrentTime();
    expect(result).toBe('2024-01-01 09:00:00');
  });
});
