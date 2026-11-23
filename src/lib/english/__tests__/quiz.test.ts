import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import {
  formatMeanings,
  pickWords,
  pickDistractors,
  buildChoiceQuestion,
  judgeEnglishFill,
  maskWordForFill,
} from "../quiz";
import { createSchema } from "../../db";
import type { EnglishWord, Meaning } from "../types";

const now = "2026-11-23T00:00:00.000Z";

/** 测试用内存库：建表并插入英语词条 */
function seedDb(
  words: Array<Partial<EnglishWord> & { word: string }>,
): Database.Database {
  const db = new Database(":memory:");
  createSchema(db);
  const stmt = db.prepare(
    `INSERT INTO e_words (word, level, usphone, ukphone, meanings, sentences, phrases, createdAt, updatedAt)
     VALUES (@word, @level, @usphone, @ukphone, @meanings, @sentences, @phrases, @createdAt, @updatedAt)`,
  );
  words.forEach((w, i) => {
    const meanings: Meaning[] = w.meanings ?? [{ pos: "n", tran: `${w.word} 的默认释义` }];
    stmt.run({
      word: w.word,
      level: w.level ?? "初中",
      usphone: w.usphone ?? null,
      ukphone: w.ukphone ?? null,
      meanings: JSON.stringify(meanings),
      sentences: JSON.stringify(w.sentences ?? []),
      phrases: JSON.stringify(w.phrases ?? []),
      createdAt: now,
      updatedAt: now,
    });
  });
  return db;
}

describe("formatMeanings", () => {
  it("词性 + 释义拼接，多条用「；」连接", () => {
    expect(
      formatMeanings([
        { pos: "n", tran: "能力" },
        { pos: "v", tran: "点燃" },
      ]),
    ).toBe("n. 能力；v. 点燃");
  });

  it("词性为空时只输出释义", () => {
    expect(formatMeanings([{ pos: "", tran: "能力" }])).toBe("能力");
  });
});

describe("pickWords", () => {
  const WORDS = [
    { word: "apple", level: "初中" as const, meanings: [{ pos: "n", tran: "苹果" }] },
    { word: "banana", level: "初中" as const, meanings: [{ pos: "n", tran: "香蕉" }] },
    { word: "dog", level: "初中" as const, meanings: [{ pos: "n", tran: "狗" }] },
    { word: "sophisticated", level: "高中" as const, meanings: [{ pos: "adj", tran: "复杂的" }] },
    { word: "empty", level: "初中" as const, meanings: [] },
  ];

  it("random 返回指定数量", () => {
    const db = seedDb(WORDS);
    const r = pickWords(db, "random", "", 3);
    expect(r).toHaveLength(3);
    // 空释义词不参与出题
    expect(r.every((w) => w.word !== "empty")).toBe(true);
  });

  it("level 按学段过滤", () => {
    const db = seedDb(WORDS);
    const r = pickWords(db, "level", "高中", 10);
    expect(r.map((w) => w.word)).toEqual(["sophisticated"]);
  });

  it("initial 按首字母过滤（大小写归一）", () => {
    const db = seedDb(WORDS);
    expect(pickWords(db, "initial", "a", 10).map((w) => w.word)).toEqual(["apple"]);
    expect(pickWords(db, "initial", "D", 10).map((w) => w.word)).toEqual(["dog"]);
  });

  it("weakness 错误率高的排前，未作答词补足", () => {
    const db = seedDb(WORDS.filter((w) => w.word !== "empty"));
    // banana 答错 2 次、apple 答对 1 次、dog 未作答
    const insertLog = db.prepare(
      `INSERT INTO e_review_logs (wordId, mode, result, userAnswer, overridden, createdAt)
       VALUES (@wordId, 'choice', @result, NULL, 0, @createdAt)`,
    );
    const id = (w: string): number =>
      (db.prepare("SELECT id FROM e_words WHERE word = ?").get(w) as { id: number }).id;
    insertLog.run({ wordId: id("banana"), result: "wrong", createdAt: now });
    insertLog.run({ wordId: id("banana"), result: "wrong", createdAt: now });
    insertLog.run({ wordId: id("apple"), result: "correct", createdAt: now });
    const r = pickWords(db, "weakness", "", 3);
    // 已作答词按错误率降序排前，新词洗牌补足（第三个位置随机）
    expect(r.map((w) => w.word).slice(0, 2)).toEqual(["banana", "apple"]);
    expect(["dog", "sophisticated"]).toContain(r[2].word);
    expect(r).toHaveLength(3);
  });
});

describe("pickDistractors", () => {
  it("取其他词释义，去重且不含正确答案", () => {
    const target: EnglishWord = {
      id: 1,
      word: "apple",
      level: "初中",
      usphone: null,
      ukphone: null,
      meanings: [{ pos: "n", tran: "苹果" }],
      sentences: [],
      phrases: [],
      createdAt: now,
      updatedAt: now,
    };
    const all: EnglishWord[] = [
      target,
      { ...target, id: 2, word: "pear", meanings: [{ pos: "n", tran: "梨" }] },
      { ...target, id: 3, word: "peach", meanings: [{ pos: "n", tran: "桃" }] },
      { ...target, id: 4, word: "plum", meanings: [{ pos: "n", tran: "李子" }] },
    ];
    const d = pickDistractors(all, target, 3);
    expect(d).toHaveLength(3);
    expect(d).not.toContain("n. 苹果");
    expect(new Set(d).size).toBe(3);
  });

  it("候选不足时返回剩余可用数量且不报错", () => {
    const target: EnglishWord = {
      id: 1,
      word: "apple",
      level: "初中",
      usphone: null,
      ukphone: null,
      meanings: [{ pos: "n", tran: "苹果" }],
      sentences: [],
      phrases: [],
      createdAt: now,
      updatedAt: now,
    };
    const d = pickDistractors([target], target, 3);
    expect(d).toEqual([]);
  });
});

describe("buildChoiceQuestion", () => {
  it("options 含正确答案且已打乱", () => {
    const word: EnglishWord = {
      id: 1,
      word: "apple",
      level: "初中",
      usphone: null,
      ukphone: null,
      meanings: [{ pos: "n", tran: "苹果" }],
      sentences: [],
      phrases: [],
      createdAt: now,
      updatedAt: now,
    };
    const q = buildChoiceQuestion(word, ["n. 梨", "n. 桃", "n. 李子"]);
    expect(q.answer).toBe("n. 苹果");
    expect(q.options).toContain("n. 苹果");
    expect(q.options).toHaveLength(4);
    expect(new Set(q.options).size).toBe(4);
  });
});

describe("maskWordForFill", () => {
  const full: EnglishWord = {
    id: 1,
    word: "apple",
    level: "初中",
    usphone: "ˈæpl",
    ukphone: "ˈæp(ə)l",
    meanings: [{ pos: "n", tran: "苹果" }],
    sentences: [{ en: "I eat an apple.", cn: "我吃一个苹果。" }],
    phrases: [{ en: "apple pie", cn: "苹果派" }],
    createdAt: now,
    updatedAt: now,
  };

  it("填空题脱敏：单词、音标、例句、短语全部清空，释义保留", () => {
    const m = maskWordForFill(full);
    expect(m.word).toBe("");
    expect(m.usphone).toBeNull();
    expect(m.ukphone).toBeNull();
    expect(m.sentences).toEqual([]);
    expect(m.phrases).toEqual([]);
    expect(m.meanings).toEqual([{ pos: "n", tran: "苹果" }]);
    expect(m.id).toBe(1);
    expect(m.level).toBe("初中");
  });
});

describe("judgeEnglishFill", () => {
  const apple: EnglishWord = {
    id: 1,
    word: "apple",
    level: "初中",
    usphone: null,
    ukphone: null,
    meanings: [{ pos: "n", tran: "苹果" }],
    sentences: [],
    phrases: [],
    createdAt: now,
    updatedAt: now,
  };
  it.each([
    ["apple", "apple", true],
    ["apple", " Apple ", true],
    ["apple", "APPLE", true],
    ["apple", "apples", false],
    ["apple", "  ", false],
    ["apple", "", false],
  ])("judgeEnglishFill(apple, %j) → %j", (_w, input, expected) => {
    expect(judgeEnglishFill(apple, input)).toBe(expected);
  });
});
