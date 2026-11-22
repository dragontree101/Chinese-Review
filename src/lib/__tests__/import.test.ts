import { describe, it, expect } from "vitest";
import { parseSource, groupByCharMeaning } from "../import-helpers";
import { lookupTextbook } from "../textbook-map";

describe("parseSource", () => {
  it("从句末括号提取书名", () => {
    expect(parseSource("杜鹃啼血猿哀鸣（《琵琶行》）")).toBe("琵琶行");
  });

  it("正文书名号不算出处，只取句末括号内的", () => {
    expect(parseSource("《诗三百》，一言以蔽之，思无邪（《论语》）")).toBe(
      "论语",
    );
  });

  it("内嵌书名号（指南录）后序 归一化", () => {
    expect(parseSource("臣心一片磁针石（〈指南录〉后序）")).toBe(
      "指南录后序",
    );
  });

  it("（词语）与无括号返回 null", () => {
    expect(parseSource("安得广厦千万间（词语）")).toBeNull();
    expect(parseSource("既来之，则安之")).toBeNull();
  });

  it("（成语）返回 成语", () => {
    expect(parseSource("温故知新（成语）")).toBe("成语");
  });
});

describe("lookupTextbook", () => {
  it("命中初中篇目映射", () => {
    const r = lookupTextbook("衣食所安，弗敢专也（《曹刿论战》）");
    expect(r?.grade).toBe("九年级");
    expect(r?.lesson).toBe("曹刿论战");
  });

  it("七年级篇目", () => {
    const r = lookupTextbook("温故而知新（《论语》）");
    expect(r?.grade).toBe("七年级");
    expect(r?.lesson).toBe("论语");
  });

  it("史记·前缀也能命中初中篇目", () => {
    const r = lookupTextbook("卒中往往语（《史记·陈涉世家》）");
    expect(r?.grade).toBe("九年级");
    expect(r?.lesson).toBe("陈涉世家");
  });

  it("非初中篇目归入拓展档", () => {
    const r = lookupTextbook("离山十里有王平安营（《失街亭》）");
    expect(r?.grade).toBe("拓展");
    expect(r?.lesson).toBe("失街亭");
  });

  it("成语条目无年级", () => {
    const r = lookupTextbook("温故知新（成语）");
    expect(r?.grade).toBeNull();
    expect(r?.lesson).toBeNull();
  });

  it("无出处返回 null", () => {
    expect(lookupTextbook("既来之，则安之")).toBeNull();
  });
});

describe("groupByCharMeaning", () => {
  // 同字同含义的句子互为「相同含义的句子」，排除自身
  it("同字同含义分组，排除自身", () => {
    const rows = [
      {
        id: 6,
        char: "爱",
        meaning: "吝惜",
        sentence: "不爱珍器重宝肥饶之地（《过秦论》）",
      },
      {
        id: 7,
        char: "爱",
        meaning: "吝惜",
        sentence: "国事至此，予不得爱身（《〈指南录〉后序》）",
      },
      { id: 4, char: "爱", meaning: "喜爱", sentence: "爱其子，择师而教之（《师说》）" },
    ];
    const g = groupByCharMeaning(rows);
    expect(g[6]).toEqual(["国事至此，予不得爱身（《〈指南录〉后序》）"]);
    expect(g[7]).toEqual(["不爱珍器重宝肥饶之地（《过秦论》）"]);
    expect(g[4]).toEqual([]);
  });
});
