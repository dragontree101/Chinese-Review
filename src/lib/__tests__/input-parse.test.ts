import { describe, it, expect } from "vitest";
import { clampCount } from "../input-parse";

describe("clampCount", () => {
  it("正常数字原样返回", () => {
    expect(clampCount("10")).toBe(10);
    expect(clampCount("25")).toBe(25);
  });

  it("空串与非数字回退默认值（不在输入中途劫持）", () => {
    expect(clampCount("")).toBe(10);
    expect(clampCount("abc")).toBe(10);
  });

  it("超范围夹取到 [1, 50]", () => {
    expect(clampCount("0")).toBe(1);
    expect(clampCount("-3")).toBe(1);
    expect(clampCount("100")).toBe(50);
  });

  it("自定义范围与默认值", () => {
    expect(clampCount("", 5, 20, 8)).toBe(8);
    expect(clampCount("3", 5, 20, 8)).toBe(5);
    expect(clampCount("30", 5, 20, 8)).toBe(20);
  });

  it("小数取整", () => {
    expect(clampCount("10.7")).toBe(10);
  });
});
