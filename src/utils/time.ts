import dayjs from 'dayjs';

export const formatCurrentTime = (): string => {
  return dayjs().format('YYYY-MM-DD HH:mm:ss');
};
