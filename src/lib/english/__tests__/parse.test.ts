import { describe, it, expect } from "vitest";
import { parseLine, levelFromBookIds, mergeWord } from "../parse";
import type { RawVocabEntry } from "../parse";

/** 真实词库行结构的等价样例（取自 初中.jsonl 首行 ability） */
const ABILITY_LINE =
  '{"wordRank":1,"headWord":"ability","bookId":"ChuZhong_2","content":{"word":{"wordHead":"ability","wordId":"ChuZhong_2_1","content":{"sentence":{"sentences":[{"sContent":"The test measures your mathematical ability.","sCn":"这种测试考查的是数学能力。"}],"desc":"例句"},"usphone":"ə\'bɪləti","ukphone":"ə\'bɪləti","trans":[{"tranCn":"能力，能耐；才能","pos":"n","descCn":"中释"}],"phrase":{"phrases":[{"pContent":"to the best of one\'s ability","pCn":"竭尽所能"}],"desc":"短语"}}}}}';

describe("parseLine", () => {
  it("解析真实结构样例，提取全部字段", () => {
    const e = parseLine(ABILITY_LINE);
    expect(e).not.toBeNull();
    expect(e!.headWord).toBe("ability");
    expect(e!.bookId).toBe("ChuZhong_2");
    expect(e!.usphone).toBe("ə'bɪləti");
    expect(e!.trans).toEqual([{ pos: "n", tranCn: "能力，能耐；才能" }]);
    expect(e!.sentences).toEqual([
      { sContent: "The test measures your mathematical ability.", sCn: "这种测试考查的是数学能力。" },
    ]);
    expect(e!.phrases).toEqual([{ pContent: "to the best of one's ability", pCn: "竭尽所能" }]);
  });

  it.each([
    ["空行", ""],
    ["坏 JSON", "{not-json"],
    ["缺 content", '{"headWord":"x","bookId":"ChuZhong_2"}'],
  ])("%s 返回 null", (_name, line) => {
    expect(parseLine(line)).toBeNull();
  });
});

describe("levelFromBookIds", () => {
  it("含 ChuZhong_* 归初中", () => {
    expect(levelFromBookIds(["GaoZhong_2", "ChuZhong_3"])).toBe("初中");
  });
  it("仅 GaoZhong_* 归高中", () => {
    expect(levelFromBookIds(["GaoZhong_2", "GaoZhong_3"])).toBe("高中");
  });
});

describe("mergeWord", () => {
  const entry = (over: Partial<RawVocabEntry>): RawVocabEntry => ({
    bookId: "ChuZhong_2",
    headWord: "light",
    usphone: null,
    ukphone: "laɪt",
    trans: [{ pos: "n", tranCn: "光" }],
    sentences: [{ sContent: "The light is on.", sCn: "灯亮着。" }],
    phrases: [],
    ...over,
  });

  it("跨书合并：释义并集去重、例句按 en 去重、音标取非空", () => {
    const a = entry({});
    const b = entry({
      bookId: "ChuZhong_3",
      usphone: "laɪt",
      trans: [{ pos: "n", tranCn: "光 " }, { pos: "v", tranCn: "点燃" }],
      sentences: [{ sContent: "The light is on.", sCn: "灯亮着。" }, { sContent: "Light the fire.", sCn: "点火。" }],
    });
    const w = mergeWord("light", [a, b]);
    expect(w!.level).toBe("初中");
    expect(w!.usphone).toBe("laɪt");
    expect(w!.ukphone).toBe("laɪt");
    expect(w!.meanings).toEqual([
      { pos: "n", tran: "光" },
      { pos: "v", tran: "点燃" },
    ]);
    expect(w!.sentences).toEqual([
      { en: "The light is on.", cn: "灯亮着。" },
      { en: "Light the fire.", cn: "点火。" },
    ]);
  });

  it("仅高中来源归高中", () => {
    const w = mergeWord("sophisticated", [entry({ bookId: "GaoZhong_2" })]);
    expect(w!.level).toBe("高中");
  });

  it("全部来源释义为空返回 null", () => {
    expect(mergeWord("x", [entry({ trans: [] }), entry({ trans: [{ pos: "n", tranCn: " " }] })])).toBeNull();
  });

  it("顺序稳定性：同一输入两次合并输出 JSON 一致", () => {
    const entries = [
      entry({}),
      entry({ bookId: "GaoZhong_2", trans: [{ pos: "adj", tranCn: "轻的" }] }),
    ];
    expect(JSON.stringify(mergeWord("light", entries))).toBe(
      JSON.stringify(mergeWord("light", entries)),
    );
  });
});
