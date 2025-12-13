import { describe, expect, it } from "vitest";

import { formatJstDate } from "./time";

describe("formatJstDate", () => {
  it("JST の書式 YYYY/MM/DD HH:mm:ss で出力する", () => {
    const date = new Date(Date.UTC(2025, 11, 13, 15, 50, 33));
    expect(formatJstDate(date)).toBe("2025/12/14 00:50:33");
  });
});

