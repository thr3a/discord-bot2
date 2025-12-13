const timeFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

type TimeParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
};

const assertPart = (value: string | undefined, label: keyof TimeParts): string => {
  if (typeof value !== "string") {
    throw new Error(`Intl formatter から ${label} が取得できませんでした。`);
  }
  return value;
};

const extractParts = (date: Date): TimeParts => {
  const record: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  timeFormatter.formatToParts(date).forEach((part) => {
    if (part.type === "literal") {
      return;
    }
    record[part.type] = part.value;
  });

  return {
    year: assertPart(record.year, "year"),
    month: assertPart(record.month, "month"),
    day: assertPart(record.day, "day"),
    hour: assertPart(record.hour, "hour"),
    minute: assertPart(record.minute, "minute"),
    second: assertPart(record.second, "second"),
  };
};

export const formatJstDate = (date: Date): string => {
  const parts = extractParts(date);
  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
};

