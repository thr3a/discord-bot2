import { describe, expect, it } from "vitest";

import { isAllowedChannel } from "./interactionCreate";

describe("isAllowedChannel", () => {
  it("チャンネルが一致する場合に true を返す", () => {
    expect(isAllowedChannel("123", "123")).toBe(true);
  });

  it("一致しない場合は false を返す", () => {
    expect(isAllowedChannel("123", "456")).toBe(false);
  });

  it("channelId が null の場合も false", () => {
    expect(isAllowedChannel(null, "123")).toBe(false);
  });
});

