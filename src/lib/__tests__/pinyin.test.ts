import { describe, it, expect } from "vitest";
import { keywordReading, getInitial, wordInitial } from "../pinyin";

describe("keywordReading", () => {
  it("括号内有读音时返回读音", () => {
    expect(keywordReading("辟(bì)", "辟")).toBe("bì");
    expect(keywordReading("辟(pì)", "辟")).toBe("pì");
    expect(keywordReading("便(biàn)", "便")).toBe("biàn");
  });

  it("词形 keyword（如「安得」「再拜」）不是读音，返回 null", () => {
    expect(keywordReading("安得", "安")).toBeNull();
    expect(keywordReading("再拜", "拜")).toBeNull();
    expect(keywordReading("比年", "比")).toBeNull();
  });

  it("keyword 与字相同或为空时返回 null", () => {
    expect(keywordReading("哀", "哀")).toBeNull();
    expect(keywordReading("", "哀")).toBeNull();
  });
});

describe("getInitial / wordInitial", () => {
  it("哀→A 兵→B", () => {
    expect(getInitial("哀")).toBe("A");
    expect(getInitial("兵")).toBe("B");
  });

  it("wordInitial 优先用 keyword 括号读音（辟(pì)→P），词形退回字拼音", () => {
    expect(wordInitial({ keyword: "辟(pì)", char: "辟" } as never)).toBe("P");
    expect(wordInitial({ keyword: "安得", char: "安" } as never)).toBe("A");
  });
});
