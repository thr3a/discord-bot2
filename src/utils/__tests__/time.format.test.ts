import { describe, expect, it } from 'vitest';
import { formatCurrentTime } from '../time';

describe('formatCurrentTime', () => {
  it('指定したタイムゾーンの時刻を返す', () => {
    const now = new Date('2024-01-01T15:30:00Z');
    const result = formatCurrentTime({ timezone: 'UTC', now });
    expect(result).toEqual({
      timezone: 'UTC',
      formatted: '2024-01-01 15:30:00'
    });
  });

  it('無効なタイムゾーンの場合はデフォルトを使用する', () => {
    const now = new Date('2024-01-01T00:00:00Z');
    const result = formatCurrentTime({ timezone: 'Invalid/Zone', now });
    expect(result.timezone).toBe('Asia/Tokyo');
    expect(result.formatted).toBe('2024-01-01 09:00:00');
  });
});
