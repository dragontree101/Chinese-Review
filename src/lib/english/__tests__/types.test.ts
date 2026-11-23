import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { rowToEnglishWord } from "../types";
import { getDb } from "../../db";

describe("rowToEnglishWord", () => {
  const now = "2026-11-23T00:00:00.000Z";

  it("合法 JSON 行返回完整 EnglishWord（JSON 列已解析为数组）", () => {
    const row = {
      id: 1,
      word: "ability",
      level: "初中",
      usphone: "ə'bɪləti",
      ukphone: "ə'bɪləti",
      meanings: JSON.stringify([{ pos: "n", tran: "能力，才能" }]),
      sentences: JSON.stringify([
        { en: "The test measures your mathematical ability.", cn: "这种测试考查的是数学能力。" },
      ]),
      phrases: JSON.stringify([{ en: "to the best of one's ability", cn: "竭尽所能" }]),
      createdAt: now,
      updatedAt: now,
    };
    const w = rowToEnglishWord(row);
    expect(w.id).toBe(1);
    expect(w.word).toBe("ability");
    expect(w.level).toBe("初中");
    expect(w.meanings).toEqual([{ pos: "n", tran: "能力，才能" }]);
    expect(w.sentences).toHaveLength(1);
    expect(w.phrases).toHaveLength(1);
  });

  it("JSON 列为非法字符串时对应字段回退 []", () => {
    const row = {
      id: 2,
      word: "bad",
      level: "高中",
      usphone: null,
      ukphone: null,
      meanings: "not-json",
      sentences: "also-bad",
      phrases: "still-bad",
      createdAt: now,
      updatedAt: now,
    };
    const w = rowToEnglishWord(row);
    expect(w.meanings).toEqual([]);
    expect(w.sentences).toEqual([]);
    expect(w.phrases).toEqual([]);
  });

  it("JSON 列为 null 或缺失时回退 []", () => {
    const row = {
      id: 3,
      word: "empty",
      level: "初中",
      usphone: null,
      ukphone: null,
      meanings: null,
      createdAt: now,
      updatedAt: now,
    };
    const w = rowToEnglishWord(row);
    expect(w.meanings).toEqual([]);
    expect(w.sentences).toEqual([]);
    expect(w.phrases).toEqual([]);
  });
});

describe("英语表结构", () => {
  it("建库后 e_words 与 e_review_logs 表存在", () => {
    const db = getDb(":memory:");
    const r1 = db.prepare("SELECT COUNT(*) AS c FROM e_words").get() as { c: number };
    const r2 = db.prepare("SELECT COUNT(*) AS c FROM e_review_logs").get() as { c: number };
    expect(r1.c).toBe(0);
    expect(r2.c).toBe(0);
  });
});
