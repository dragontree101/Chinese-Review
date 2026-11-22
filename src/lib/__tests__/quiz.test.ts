import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import {
  judgeFill,
  pickDistractors,
  pickWords,
  buildChoiceQuestion,
} from "../quiz";
import { getInitial } from "../pinyin";
import { createSchema } from "../db";
import type { Word } from "../types";

/** 测试用内存库：建表并插入词条 */
function seedDb(words: Array<Partial<Word> & { char: string }>): Database.Database {
  const db = new Database(":memory:");
  createSchema(db);
  const stmt = db.prepare(
    `INSERT INTO words (id, char, keyword, meaning, sentence, source, translation, lesson, grade, familiarity, createdAt, updatedAt)
     VALUES (@id, @char, @keyword, @meaning, @sentence, @source, @translation, @lesson, @grade, @familiarity, @createdAt, @updatedAt)`,
  );
  words.forEach((w, i) => {
    stmt.run({
      id: w.id ?? i + 1,
      char: w.char,
      keyword: w.keyword ?? w.char,
      meaning: w.meaning ?? "默认含义",
      sentence: w.sentence ?? `例句（《${w.lesson ?? "测试篇"}》）`,
      source: w.source ?? null,
      translation: w.translation ?? null,
      lesson: w.lesson ?? null,
      grade: w.grade ?? null,
      familiarity: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
  });
  return db;
}

describe("judgeFill", () => {
  it.each([
    ["悲伤，悲哀，哀叹，哀悼", "悲伤", true],
    ["悲伤，悲哀，哀叹，哀悼", "心里很悲哀", true],
    ["悲伤，悲哀，哀叹，哀悼", "高兴", false],
    ["悲伤，悲哀，哀叹，哀悼", "", false],
    ["悲伤，悲哀，哀叹，哀悼", "。，！", false],
    // 双向包含：输入短于关键词也算对
    ["安定", "安", true],
    // 剥离注释成分：「同X」「为动」「使动」
    ["通“避”，躲避", "躲避", true],
    ["为……哀叹，为动", "哀叹", true],
    ["使……安定，使动", "安定", true],
  ])("judgeFill(%j, %j) → %j", (meaning, input, expected) => {
    expect(judgeFill(meaning, input)).toBe(expected);
  });
});

describe("pickDistractors", () => {
  const all: Partial<Word> & { char: string } = {};
  it("优先同字其他含义，不足从其他字补足，去重且不含正确答案", () => {
    const words = [
      { id: 1, char: "爱", meaning: "吝惜", sentence: "s1" },
      { id: 2, char: "爱", meaning: "喜爱", sentence: "s2" },
      { id: 3, char: "爱", meaning: "爱护", sentence: "s3" },
      { id: 4, char: "兵", meaning: "兵器", sentence: "s4" },
      { id: 5, char: "兵", meaning: "军队", sentence: "s5" },
    ];
    const db = seedDb(words);
    const rows = db.prepare("SELECT * FROM words").all() as unknown as Word[];
    const target = rows.find((w) => w.id === 1)!;
    const d = pickDistractors(rows, target, 3);
    expect(d).toHaveLength(3);
    expect(d).not.toContain("吝惜");
    expect(d.length).toBe(new Set(d).size);
    // 同字含义（喜爱/爱护）优先入选
    expect(d).toContain("喜爱");
    expect(d).toContain("爱护");
    // 第三个来自其他字
    expect(d.some((x) => ["兵器", "军队"].includes(x))).toBe(true);
  });
  void all;
});

describe("buildChoiceQuestion", () => {
  it("options 打乱包含正确答案，answer 为含义", () => {
    const word = { id: 1, char: "爱", meaning: "吝惜", sentence: "s" } as Word;
    const q = buildChoiceQuestion(word, ["喜爱", "爱护", "兵器"]);
    expect(q.answer).toBe("吝惜");
    expect(q.options).toHaveLength(4);
    expect(q.options).toContain("吝惜");
    expect(new Set(q.options).size).toBe(4);
  });
});

describe("pickWords", () => {
  let db: Database.Database;
  beforeEach(() => {
    db = seedDb([
      { id: 1, char: "安", meaning: "安稳", grade: "七年级", lesson: "论语" },
      { id: 2, char: "兵", meaning: "兵器", grade: "九年级", lesson: "曹刿论战" },
      { id: 3, char: "爱", meaning: "喜爱", grade: "九年级", lesson: "曹刿论战" },
      { id: 4, char: "哀", meaning: "悲伤", grade: null, lesson: null },
      { id: 5, char: "安", meaning: "安定", grade: "七年级", lesson: "论语" },
    ]);
  });

  it("grade 规则按年级过滤", () => {
    const r = pickWords(db, "grade", "七年级", 10);
    expect(r.map((w) => w.id).sort()).toEqual([1, 5]);
  });

  it("initial 规则按拼音首字母过滤（哀/安/爱→A，兵→B）", () => {
    const r = pickWords(db, "initial", "A", 10);
    expect(r.map((w) => w.id).sort()).toEqual([1, 3, 4, 5]);
    const b = pickWords(db, "initial", "B", 10);
    expect(b.map((w) => w.id)).toEqual([2]);
  });

  it("keyword 规则匹配字或含义", () => {
    const r = pickWords(db, "keyword", "兵器", 10);
    expect(r.map((w) => w.id)).toEqual([2]);
  });

  it("frequency 规则按字出现条目数降序", () => {
    const r = pickWords(db, "frequency", "", 5);
    // 「安」有 2 条最靠前
    expect(r[0].char).toBe("安");
    expect(r).toHaveLength(5);
  });

  it("weakness 规则：无日志时返回未复习词", () => {
    const r = pickWords(db, "weakness", "", 3);
    expect(r).toHaveLength(3);
  });

  it("weakness 规则：错得多的词排前面", () => {
    db.prepare(
      `INSERT INTO review_logs (wordId, mode, result, userAnswer, overridden, createdAt) VALUES
       (1,'choice','wrong',NULL,0,'2026-01-02'),(1,'choice','wrong',NULL,0,'2026-01-03'),
       (2,'choice','correct',NULL,0,'2026-01-02'),(2,'choice','correct',NULL,0,'2026-01-03')`,
    ).run();
    const r = pickWords(db, "weakness", "", 2);
    expect(r[0].id).toBe(1);
  });

  it("random 规则返回指定数量且不重复", () => {
    const r = pickWords(db, "random", "", 4);
    expect(r).toHaveLength(4);
    expect(new Set(r.map((w) => w.id)).size).toBe(4);
  });
});

describe("getInitial", () => {
  it("哀→A 兵→B", () => {
    expect(getInitial("哀")).toBe("A");
    expect(getInitial("兵")).toBe("B");
  });
});
