import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

const defaultTimezone = 'Asia/Tokyo';
const timezoneAliasMap: Record<string, string> = {
  UTC: 'Etc/UTC',
  GMT: 'Etc/GMT',
  JST: 'Asia/Tokyo'
};

type FormatTimeInput = {
  timezone?: string;
  now?: Date;
};

export type FormattedTime = {
  timezone: string;
  formatted: string;
};

type ResolvedTimezone = {
  effective: string;
  label: string;
};

const isSupportedTimezone = (timezone: string): boolean => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
};

const resolveTimezone = (timezone?: string): ResolvedTimezone => {
  const trimmed = timezone?.trim();
  if (trimmed) {
    const candidate = timezoneAliasMap[trimmed] ?? trimmed;
    if (isSupportedTimezone(candidate)) {
      return { effective: candidate, label: trimmed };
    }
  }
  return { effective: defaultTimezone, label: defaultTimezone };
};

export const formatCurrentTime = (input?: FormatTimeInput): FormattedTime => {
  const resolved = resolveTimezone(input?.timezone);
  const reference = input?.now ?? new Date();
  const formatted = dayjs(reference).tz(resolved.effective).format('YYYY-MM-DD HH:mm:ss');
  return { timezone: resolved.label, formatted };
};
